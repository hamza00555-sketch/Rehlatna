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
    "stomach/stomach-pregnant-incr.target.gz": 0.3,  # the round fetal abdomen
    "torso/torso-scale-depth-incr.target.gz": 0.3,
    "buttocks/buttocks-volume-incr.target.gz": 0.5,
    **{f"legs/{sd}-upperleg-fat-incr.target.gz": 0.3 for sd in ("l", "r")},  # soft, full thighs
    **{f"hands/{sd}-hand-scale-decr.target.gz": 0.5 for sd in ("l", "r")},
    # a more defined profile than the chubby newborn default: small button nose,
    # slightly leaner cheeks, a small but present chin
    **{f"cheek/{sd}-cheek-volume-decr.target.gz": 0.4 for sd in ("l", "r")},
    "nose/nose-scale-depth-incr.target.gz": 0.2,
    "chin/chin-prominent-incr.target.gz": 0.35,
    # closed lids sit flatter in the reference: eyeballs pushed back a little
    **{f"eyes/{sd}-eye-push{k}-in.target.gz": 0.7 for sd in ("l", "r") for k in (1, 2)},
    "neck/neck-back-scale-depth-incr.target.gz": 0.5,  # a full nape: the occiput flows into the back
    "head/head-back-scale-depth-incr.target.gz": 0.2,  # the occiput bulges behind the neck
    # fetal frontal bossing: a high, forward-bulging forehead under a round dome
    "forehead/forehead-trans-forward.target.gz": 0.7,
    "forehead/forehead-scale-vert-incr.target.gz": 0.5,
}
HEAD_SCALE = 1.45
TRUNK_SCALE = (1.05, 1.08, 1.08)  # lateral, along the spine, depth (bone frame)
HEAD_DROP = 0.06
FIT_SIZE = (279, 500)
REF_FRAME = (1116, 2000)
REF_CRANIUM = (542.0, 729.0, 164.0)  # outline circle of the reference cranium, px in the reference frame
# face profile landmarks traced on the reference silhouette (px) and the hm08
# midline vertices they correspond to: they fix how far the chin is tucked
FACE_POINTS = {297: (640.0, 876.0), 467: (615.0, 907.0)}  # nose tip, lower lip

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
    dist = lambda D, a, b: np.linalg.norm(D[b] - D[a])
    torso_j, torso_p = dist(J, "pelvis", "neck_base"), dist(P, "pelvis", "neck_base")
    eff = {}
    for bone, a, b in SEGMENTS:
        # one ratio for both sides: the rest shape stays symmetric (rigging,
        # mirrored weights); the far limbs are foreshortened in the reference anyway
        r = np.mean([(dist(J, f"{a}_{sd}", f"{b}_{sd}") / torso_j) / (dist(P, f"{a}_{sd}", f"{b}_{sd}") / torso_p) for sd in ("r", "l")])
        r = float(np.clip(r, 0.6, 1.5))
        for side in ("R", "L"):
            for part in ("01", "02"):
                eff[f"{bone}{part}.{side}"] = (1.0, r, 1.0)
    for b in ("spine05", "spine04", "spine03", "spine02", "spine01"):
        eff[b] = TRUNK_SCALE  # the reference trunk is longer and fuller relative to the head
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
        return self.loss_full(x, PRIOR)

    def loss_full(self, x, prior):
        self.pose(x)
        V = self.rig.verts()
        m = gaussian_filter(mhfit.splat(V[self.body_verts], FIT_SIZE, 1).astype(float), 2.0)
        body = 1 - (m * self.target).sum() / (m + self.target - m * self.target).sum()
        cx, cy, r = self.cranium(V)
        rx, ry, rr = REF_CRANIUM
        head = ((cx - rx) ** 2 + (cy - ry) ** 2 + (r - rr) ** 2) / rr**2
        idx = list(FACE_POINTS)
        uv, _ = project_points(V[idx], HERO, REF_FRAME)
        face = np.sum((uv - np.array([FACE_POINTS[i] for i in idx])) ** 2) / rr**2
        return body + 2.0 * head + 2.0 * face + 0.02 * np.sum(((x - prior) / SIGMA) ** 2)

    def solve(self, max_evals=700, start=None, lock_head_scale=False):
        """Nelder-Mead from `start` (default: the prior). With lock_head_scale the
        head-scale parameter is held at 0 (the head size is already in the rest shape)."""
        x0 = (PRIOR if start is None else np.asarray(start, float)).copy()
        free = [i for i in range(len(x0)) if not (lock_head_scale and i == 4)]
        prior = PRIOR.copy()
        if lock_head_scale:
            x0[4] = prior[4] = 0.0

        def full(z):
            x = x0.copy()
            x[free] = z
            return x

        def loss(z):
            x = full(z)
            return self.loss_full(x, prior)

        z0 = x0[free]
        simplex = np.vstack([z0] + [z0 + np.eye(len(z0))[i] * SIGMA[free][i] * 0.6 for i in range(len(z0))])
        res = minimize(loss, z0, method="Nelder-Mead", options={"xatol": 0.2, "fatol": 1e-4, "maxfev": max_evals, "initial_simplex": simplex})
        res.x = full(res.x)
        self.pose(res.x)
        V = self.rig.verts()
        cr = np.round(self.cranium(V), 1)
        uv, _ = project_points(V[list(FACE_POINTS)], HERO, REF_FRAME)
        print(f"[fge] face points {np.round(uv, 0).tolist()} vs {list(FACE_POINTS.values())}")
        print(f"[fge] pose: lumbar {res.x[0]:.0f}°, thoracic {res.x[1]:.0f}°, neck {res.x[2]:.0f}°, head {res.x[3]:.0f}°; loss {res.fun:.3f}; cranium {cr} vs {REF_CRANIUM}")
        return res.x


def _scalp_mask(rig) -> np.ndarray:
    """0..1 per vertex: the cranium above and behind the face (rest pose: face
    -Y, up +Z). Stored as the mesh attribute `fge_scalp` for the skin shader."""
    head = rig.index["head"]
    sub = [i for i in range(len(rig.names)) if mhfit._descends(rig, i, head)]
    w = rig.W[:, sub].sum(axis=1)
    V = rig.rest_verts
    H = V[w > 0.95]
    centre = (H.max(0) + H.min(0)) / 2
    centre[0] = 0.0
    u = V - centre
    u /= np.maximum(np.linalg.norm(u, axis=1, keepdims=True), 1e-9)
    face = np.array([0.0, -1.0, -0.35]) / np.linalg.norm([0.0, -1.0, -0.35])
    t = np.clip((0.55 - u @ face) / 0.35, 0, 1) * np.clip((u[:, 2] + 0.2) / 0.4, 0, 1) * np.clip((w - 0.5) / 0.5, 0, 1)
    return t * t * (3 - 2 * t)


def build(collection=None, max_evals: int = 700):
    """Return (FET_Body, None, FET_Rig).

    FET_Body is the skinned, animation-ready mesh: a symmetric neutral rest
    pose standing upright along the rig axes (fetal proportions and real-world
    size baked in), MakeHuman UVs and weights, parented to FET_Rig (the
    MakeHuman default rig, face bones included) whose object transform (scale
    1) places it in the shot. The week-24 curl is the rig's pose, also stored as the action
    FET_W24_Curl; nothing is applied, so it can be re-posed and animated."""
    ob, arm = mh.build(ASSETS, name="FET_Body", collection=collection, targets={**mh.FETAL_TARGETS, **SHAPE_TARGETS})
    arm.name = arm.data.name = "FET_Rig"
    rig = mhfit.Rig(arm, ob)
    mhfit.bake_proportions(rig, arm, ob, _proportions(rig))
    rig = mhfit.Rig(arm, ob)
    ears = mh.region_mask(ASSETS, len(ob.data.vertices), "ears")
    mhfit.smooth_vault(rig, ob, iterations=100, roundness=1.0, keep=ears)
    mhfit.scale_head(rig, arm, ob, HEAD_SCALE, drop=HEAD_DROP)
    arm.rotation_euler = (0.0, 0.0, math.pi / 2)  # MakeHuman faces -Y; the reference fetus faces +X
    bpy.context.view_layer.update()
    rig = mhfit.Rig(arm, ob)
    x = _Poser(rig).solve(max_evals)
    # The solve sizes the head with a pose-level scale; an animation rig must
    # not carry scale in its pose, so fold it into the rest shape instead.
    # Folding it in scales about a pivot below the chin rather than the head
    # joint, which moves the head, so re-solve with the head size locked.
    mhfit.scale_head(mhfit.Rig(arm, ob), arm, ob, 1.0 + x[4] / 100.0, drop=HEAD_DROP)
    rig = mhfit.Rig(arm, ob)  # fresh: world = the rig object's placement, as for the first solve
    _Poser(rig).solve(max_evals // 2, start=x, lock_head_scale=True)
    mh.clean_weights(ob)  # the head-scale weight hand-over adds memberships
    scalp = _scalp_mask(rig)  # rest frame, before the placement is baked
    rig = mhfit.bake_world(rig, arm, ob)
    rig.apply_to(arm)
    bpy.context.view_layer.update()
    _store_action(arm, "FET_W24_Curl")

    attr = ob.data.attributes.new("fge_scalp", "FLOAT", "POINT")
    attr.data.foreach_set("value", scalp.astype(np.float32))
    # skin textures read the undeformed position (Generated = rest coords with this texture space)
    ob.data.use_auto_texspace = False
    ob.data.texspace_location = (0.0, 0.0, 0.0)
    ob.data.texspace_size = (1.0, 1.0, 1.0)

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
    ob.data.shade_smooth()

    # navel (where MakeHuman's navel targets act), posed, for the cord attachment
    bpy.context.view_layer.update()
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = ev.to_mesh()
    navel = mh.region_mask(ASSETS, len(me.vertices), "stomach", "stomach-navel-")
    M = np.array(ob.matrix_world)
    co = np.array([v.co[:] for v in me.vertices])[navel] @ M[:3, :3].T + M[:3, 3]
    nrm = np.array([v.normal[:] for v in me.vertices])[navel].mean(0) @ M[:3, :3].T
    ev.to_mesh_clear()
    ob["fge_navel"] = co.mean(0).tolist()
    ob["fge_navel_normal"] = (nrm / np.linalg.norm(nrm)).tolist()

    subd = ob.modifiers.new("subd", "SUBSURF")  # after the deformers: smooth at any pose
    subd.levels, subd.render_levels = 1, 2
    return ob, None, arm


def _store_action(arm, name: str) -> None:
    """Key the current pose (every bone, frame 1) as an action on the rig."""
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = action
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
        pb.keyframe_insert("rotation_quaternion", frame=1, group=pb.name)
        pb.keyframe_insert("location", frame=1, group=pb.name)
