"""Week-24 fetus from the MakeHuman baby, posed to the reference.

1. fge.mh builds the CC0 hm08 baby (closed eyes, round head, a rounder belly,
   deeper trunk and fuller buttocks from MakeHuman's own modelling targets)
   with its default rig and skin weights.
2. Limb segment lengths are baked from the reference landmark skeleton; every
   bone scales only its own segment, so no child is sheared (fge.mhfit).
3. The skull vault is smoothed and rounded (ears protected) and the head is
   enlarged about a pivot low on the neck, so the junction cannot fold.
4. Pose: anatomical flexion of spine, neck and head relative to rest; the
   trunk is turned onto the reference pelvis->neck line; limbs are aimed along
   the reference landmark skeleton. A Nelder-Mead solve over the lumbar,
   thoracic, neck and head flexion, the head size and the placement matches the body to the
   segmented reference outline (lookdev/reference_mask.png) and the cranium's
   outline circle to the reference cranium, with a prior on every parameter.
5. Deformation uses volume-preserving skinning plus corrective smoothing; the
   result is applied into FET_Body, and FET_Body_Hero adds subdivision.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix
from PIL import Image
from scipy.ndimage import gaussian_filter
from scipy.optimize import minimize
from scipy.spatial import ConvexHull

from . import mh, mhfit, mhpose
from .camera import HERO, project_points

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets" / "makehuman"
MASK = ROOT / "lookdev" / "reference_mask.png"

SHAPE_TARGETS = {
    "stomach/stomach-pregnant-incr.target.gz": 1.0,  # the round fetal abdomen
    "torso/torso-scale-depth-incr.target.gz": 0.3,
    "buttocks/buttocks-volume-incr.target.gz": 0.5,
    **{f"legs/{sd}-upperleg-fat-incr.target.gz": 0.3 for sd in ("l", "r")},  # soft, full thighs
    **{f"hands/{sd}-hand-scale-decr.target.gz": 0.5 for sd in ("l", "r")},
    # a more defined profile than the chubby newborn default: small button nose,
    # slightly leaner cheeks, a small but present chin
    **{f"cheek/{sd}-cheek-volume-decr.target.gz": 0.4 for sd in ("l", "r")},
    "nose/nose-scale-depth-incr.target.gz": 0.2,
    "chin/chin-prominent-incr.target.gz": 0.35,
    "neck/neck-back-scale-depth-incr.target.gz": 1.0,  # a full nape: the occiput flows into the back
}
HEAD_SCALE = 1.5
HEAD_DROP = 0.06
FIT_SIZE = (279, 500)
REF_FRAME = (1116, 2000)
REF_CRANIUM = (542.0, 729.0, 164.0)  # outline circle of the reference cranium, px in the reference frame

# reference landmark -> bone whose head sits on it
JOINT_BONES = {
    "shoulder_r": "upperarm01.R", "elbow_r": "lowerarm01.R", "wrist_r": "wrist.R",
    "shoulder_l": "upperarm01.L", "elbow_l": "lowerarm01.L", "wrist_l": "wrist.L",
    "hip_r": "upperleg01.R", "knee_r": "lowerleg01.R", "ankle_r": "foot.R",
    "hip_l": "upperleg01.L", "knee_l": "lowerleg01.L", "ankle_l": "foot.L",
    "pelvis": "spine05", "neck_base": "neck01",
}
SEGMENTS = [("upperarm", "shoulder", "elbow"), ("lowerarm", "elbow", "wrist"), ("upperleg", "hip", "knee"), ("lowerleg", "knee", "ankle")]
LUMBAR = ("spine05", "spine04")
THORACIC = ("spine03", "spine02", "spine01")
NECK = ("neck01", "neck02", "neck03")
FINGER_CURL = tuple(f"finger{f}-{j}.{sd}" for f in range(2, 6) for j in (1, 2, 3) for sd in ("L", "R"))
FINGER_CURL_DEG = 8.0
CLAVICLE_DROP_DEG = -25.0  # shoulders down, relaxed (the rest pose reads shrugged under the big head)
# lumbar flex, thoracic flex, neck flex, head flex (deg, + = flexion), head scale %, scale %, x mm, z mm, roll deg.
# Lumbar flexion tucks the pelvis under (the reference's round, low rump).
PRIOR = np.array([25.0, 25.0, 8.0, -5.0, -10.0, 0.0, 0.0, 0.0, 0.0])
SIGMA = np.array([20.0, 15.0, 8.0, 6.0, 15.0, 10.0, 15.0, 15.0, 10.0])


def _joint(rig, name):
    M = rig.pose_matrices()
    return (rig.world @ M[rig.index[JOINT_BONES[name]]][:, 3])[:3]


def _proportions(rig) -> dict:
    J = {k: np.array(v) for k, v in mhpose.J.items()}
    P = {k: _joint(rig, k) for k in JOINT_BONES}
    dist = lambda D, a, b: np.linalg.norm(D[b] - D[a])  # noqa: E731
    torso_j, torso_p = dist(J, "pelvis", "neck_base"), dist(P, "pelvis", "neck_base")
    eff = {}
    for bone, a, b in SEGMENTS:
        for side in ("r", "l"):
            r = (dist(J, f"{a}_{side}", f"{b}_{side}") / torso_j) / (dist(P, f"{a}_{side}", f"{b}_{side}") / torso_p)
            r = float(np.clip(r, 0.6, 1.5))
            for part in ("01", "02"):
                eff[f"{bone}{part}.{side.upper()}"] = (1.0, r, 1.0)
    return eff


def _rot_y(W, angle, about):
    c, s = math.cos(angle), math.sin(angle)
    R = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    W = W.copy()
    W[:3, :3] = R @ W[:3, :3]
    W[:3, 3] = R @ (W[:3, 3] - about) + about
    return W


class _Poser:
    def __init__(self, rig):
        self.rig = rig
        self.J = {k: np.array(v) for k, v in mhpose.J.items()}
        self.limbs = [(b, np.array(d)) for b, d in mhpose.aim_plan() if not b.startswith(mhpose.MIDLINE)]
        self.head = rig.index["head"]
        sub = [i for i in range(len(rig.names)) if mhfit._descends(rig, i, self.head)]
        hw = rig.W[:, sub].sum(axis=1)
        self.head_verts, self.body_verts = hw > 0.6, hw < 0.2
        self.world0 = rig.world.copy()
        mask = np.asarray(Image.open(MASK).convert("L")) > 127
        yy, xx = np.mgrid[0 : mask.shape[0], 0 : mask.shape[1]]
        cx, cy, r = REF_CRANIUM
        head = mask & (((xx - cx) ** 2 + (yy - cy) ** 2) < (1.2 * r) ** 2) & (yy < cy + 196)
        self.target = gaussian_filter((np.asarray(Image.fromarray(mask & ~head).resize(FIT_SIZE)) > 0).astype(float), 2.0)

    def pose(self, x):
        rig = self.rig
        lumbar, thoracic, neck, head, head_scale, scale, tx, tz, roll = x
        rig.reset()
        rig.world = self.world0.copy()
        rig.scale[self.head] = 1 + head_scale / 100
        for b in LUMBAR:
            rig.bend(b, [1, 0, 0], lumbar / len(LUMBAR))
        for b in THORACIC:
            rig.bend(b, [1, 0, 0], thoracic / len(THORACIC))
        for b in NECK:
            rig.bend(b, [1, 0, 0], neck / len(NECK))
        rig.bend("head", [1, 0, 0], head)
        pelvis, neck_base = _joint(rig, "pelvis"), _joint(rig, "neck_base")
        v, t = neck_base - pelvis, self.J["neck_base"] - self.J["pelvis"]
        rig.world = _rot_y(rig.world, math.atan2(t[0], t[2]) - math.atan2(v[0], v[2]), pelvis)
        for b in ("clavicle.L", "clavicle.R"):  # before the arms are aimed, so they keep their directions
            rig.bend(b, [1, 0, 0], CLAVICLE_DROP_DEG)
        for bone, d in self.limbs:
            rig.aim(bone, d)
        for b in FINGER_CURL:  # relaxed fingers, slightly curled toward the palm
            rig.bend(b, [1, 0, 0], FINGER_CURL_DEG)
        A = np.array([_joint(rig, k) for k in JOINT_BONES])
        B = np.array([self.J[k] for k in JOINT_BONES])
        ca, cb = A.mean(0), B.mean(0)
        s = np.sum((A - ca) * (B - cb)) / np.sum((A - ca) ** 2) * (1 + scale / 100)
        W = rig.world.copy()
        W[:3, :3] *= s
        W[:3, 3] = s * (W[:3, 3] - ca) + cb + np.array([tx / 1000, 0, tz / 1000])
        rig.world = _rot_y(W, math.radians(roll), cb)

    def cranium(self, V):
        uv, _ = project_points(V[self.head_verts], HERO, REF_FRAME)
        hull = uv[ConvexHull(uv).vertices]
        hull = hull[hull[:, 1] < hull[:, 1].min() + 230]  # same upper band the reference circle was fitted on
        c = np.linalg.lstsq(np.c_[2 * hull, np.ones(len(hull))], (hull**2).sum(1), rcond=None)[0]
        return c[0], c[1], math.sqrt(c[2] + c[0] ** 2 + c[1] ** 2)

    def loss(self, x):
        self.pose(x)
        V = self.rig.verts()
        m = gaussian_filter(mhfit.splat(V[self.body_verts], FIT_SIZE, 1).astype(float), 2.0)
        body = 1 - (m * self.target).sum() / (m + self.target - m * self.target).sum()
        cx, cy, r = self.cranium(V)
        rx, ry, rr = REF_CRANIUM
        head = ((cx - rx) ** 2 + (cy - ry) ** 2 + (r - rr) ** 2) / rr**2
        return body + 2.0 * head + 0.02 * np.sum(((x - PRIOR) / SIGMA) ** 2)

    def solve(self, max_evals=700):
        simplex = np.vstack([PRIOR] + [PRIOR + np.eye(len(PRIOR))[i] * SIGMA[i] * 0.6 for i in range(len(PRIOR))])
        res = minimize(self.loss, PRIOR.copy(), method="Nelder-Mead", options={"xatol": 0.2, "fatol": 1e-4, "maxfev": max_evals, "initial_simplex": simplex})
        self.pose(res.x)
        cr = np.round(self.cranium(self.rig.verts()), 1)
        print(f"[fge] pose: lumbar {res.x[0]:.0f}°, thoracic {res.x[1]:.0f}°, neck {res.x[2]:.0f}°, head {res.x[3]:.0f}°; loss {res.fun:.3f}; cranium {cr} vs {REF_CRANIUM}")
        return res.x


def build(collection=None, max_evals: int = 700):
    """Return (FET_Body, FET_Body_Hero, armature)."""
    ob, arm = mh.build(ASSETS, name="FET_MH", collection=collection, targets={**mh.FETAL_TARGETS, **SHAPE_TARGETS})
    rig = mhfit.Rig(arm, ob)
    mhfit.bake_proportions(rig, arm, ob, _proportions(rig))
    rig = mhfit.Rig(arm, ob)
    ears = mh.region_mask(ASSETS, len(ob.data.vertices), "ears")
    mhfit.smooth_vault(rig, ob, iterations=100, roundness=0.7, keep=ears)
    mhfit.scale_head(rig, arm, ob, HEAD_SCALE, drop=HEAD_DROP)
    arm.rotation_euler = (0.0, 0.0, math.pi / 2)  # MakeHuman faces -Y; the reference fetus faces +X
    bpy.context.view_layer.update()
    rig = mhfit.Rig(arm, ob)
    _Poser(rig).solve(max_evals)
    rig.apply_to(arm)
    arm.matrix_world = Matrix(rig.world.tolist())
    bpy.context.view_layer.update()

    ob.modifiers["rig"].use_deform_preserve_volume = True
    # Corrective smooth only below the head: it reads the head's scale as
    # deformation and pulled the lips apart.
    head = rig.index["head"]
    sub = [i for i in range(len(rig.names)) if mhfit._descends(rig, i, head)]
    body_w = 1.0 - np.clip(rig.W[:, sub].sum(axis=1) * 1.5, 0.0, 1.0)
    vg = ob.vertex_groups.new(name="corrective_mask")
    for i, wt in enumerate(body_w):
        if wt > 0:
            vg.add([i], float(wt), "REPLACE")
    cs = ob.modifiers.new("corrective", "CORRECTIVE_SMOOTH")
    cs.rest_source = "ORCO"
    cs.smooth_type = "LENGTH_WEIGHTED"
    cs.iterations = 20
    cs.vertex_group = vg.name
    deps = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(ob.evaluated_get(deps))
    mesh.transform(ob.matrix_world)
    mesh.name = "FET_Body"
    col = collection or bpy.context.scene.collection
    base = bpy.data.objects.new("FET_Body", mesh)
    col.objects.link(base)
    hero = bpy.data.objects.new("FET_Body_Hero", mesh.copy())
    col.objects.link(hero)
    sub = hero.modifiers.new("subd", "SUBSURF")
    sub.levels, sub.render_levels = 1, 2
    for o in (base, hero):
        o.data.shade_smooth()
    # navel (where MakeHuman's navel targets act) for the cord attachment
    navel = mh.region_mask(ASSETS, len(mesh.vertices), "stomach", "stomach-navel-")
    co = np.array([v.co[:] for v in mesh.vertices])[navel]
    nrm = np.array([v.normal[:] for v in mesh.vertices])[navel].mean(0)
    base["fge_navel"] = co.mean(0).tolist()
    base["fge_navel_normal"] = (nrm / np.linalg.norm(nrm)).tolist()
    ob.hide_render = ob.hide_viewport = True
    arm.hide_render = arm.hide_viewport = True
    return base, hero, arm
