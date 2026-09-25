"""Week-24 fetus from the MakeHuman baby, fitted to the reference.

1. fge.mh builds the CC0 hm08 baby (closed eyes, round head) with its rig.
2. Proportions are baked into a new rest pose: limb segment lengths from the
   reference landmark skeleton, a fuller trunk, and the fetal head (x1.35).
3. Bones are aimed along the landmark skeleton (fge.mhpose).
4. A Powell search refines spine/neck/head/hip/knee/arm flexion together with
   scale, in-plane roll and position against the segmented reference
   silhouette (blender/lookdev/reference_mask.png, soft IoU).
5. The pose is written back to the armature and the result is applied into
   FET_Body; FET_Body_Hero adds one subdivision level for stills.
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

from . import mh, mhfit, mhpose

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets" / "makehuman"
MASK = ROOT / "lookdev" / "reference_mask.png"

HEAD_SCALE = 1.45
TRUNK_GIRTH = 1.15
WEIGHT, MUSCLE = 0.8, 0.3  # MakeHuman macros: chubbier, softer than the average baby
FIT_SIZE = (279, 500)

# reference landmark -> bone whose head sits on it
JOINT_BONES = {
    "shoulder_r": "upperarm01.R", "elbow_r": "lowerarm01.R", "wrist_r": "wrist.R",
    "shoulder_l": "upperarm01.L", "elbow_l": "lowerarm01.L", "wrist_l": "wrist.L",
    "hip_r": "upperleg01.R", "knee_r": "lowerleg01.R", "ankle_r": "foot.R",
    "hip_l": "upperleg01.L", "knee_l": "lowerleg01.L", "ankle_l": "foot.L",
    "pelvis": "spine05", "neck_base": "neck01", "skull_base": "head",
}
SEGMENTS = [("upperarm", "shoulder", "elbow"), ("lowerarm", "elbow", "wrist"), ("upperleg", "hip", "knee"), ("lowerleg", "knee", "ankle")]
SPINE = ("spine01", "spine02", "spine03", "spine04", "spine05")
FLEX_GROUPS = [
    ("spine05", "spine04", "spine03"), ("spine02", "spine01"), ("neck01", "neck02", "neck03"), ("head",),
    ("upperleg01.R", "upperleg01.L"), ("lowerleg01.R", "lowerleg01.L"), ("upperarm01.R",), ("lowerarm01.R",),
]


def _joints(rig):
    M = rig.pose_matrices()
    return {k: (rig.world @ M[rig.index[b]][:, 3])[:3] for k, b in JOINT_BONES.items()}


def _proportions(rig) -> dict:
    J = {k: np.array(v) for k, v in mhpose.J.items()}
    P = _joints(rig)
    dist = lambda D, a, b: np.linalg.norm(D[b] - D[a])
    torso_j, torso_p = dist(J, "pelvis", "neck_base"), dist(P, "pelvis", "neck_base")
    eff = {}
    for bone, a, b in SEGMENTS:
        for side in ("r", "l"):
            r = (dist(J, f"{a}_{side}", f"{b}_{side}") / torso_j) / (dist(P, f"{a}_{side}", f"{b}_{side}") / torso_p)
            r = float(np.clip(r, 0.6, 1.5))
            for part in ("01", "02"):
                eff[f"{bone}{part}.{side.upper()}"] = (1.0, r, 1.0)
    for n in SPINE:
        eff[n] = (TRUNK_GIRTH, 1.0, TRUNK_GIRTH)
    for i, n in enumerate(rig.names):  # limbs hanging off the trunk keep their own girth
        p = rig.parent[i]
        if p >= 0 and rig.names[p] in SPINE and n not in SPINE and n not in eff:
            eff[n] = (1.0, 1.0, 1.0)
    return eff


def _align_to_landmarks(rig) -> None:
    J = {k: np.array(v) for k, v in mhpose.J.items()}
    P = _joints(rig)
    A = np.array([P[k] for k in JOINT_BONES])
    B = np.array([J[k] for k in JOINT_BONES])
    ca, cb = A.mean(0), B.mean(0)
    s = np.sum((A - ca) * (B - cb)) / np.sum((A - ca) ** 2)
    W = rig.world.copy()
    W[:3, :3] *= s
    W[:3, 3] = s * (W[:3, 3] - ca) + cb
    rig.world = W


def _fit_silhouette(rig, max_evals: int = 2500) -> float:
    target = gaussian_filter((np.asarray(Image.open(MASK).convert("L").resize(FIT_SIZE)) > 127).astype(float), 2.0)
    base_local, base_world = rig.local.copy(), rig.world.copy()
    head = rig.index["head"]
    c0 = rig.verts().mean(0)
    n = len(FLEX_GROUPS)

    def apply(x):
        rig.local = base_local.copy()
        rig.scale[:] = 1.0
        rig.scale[head] = 1.0 + x[n] / 100
        for group, deg in zip(FLEX_GROUPS, x[:n]):
            for b in group:
                rig.bend(b, [1, 0, 0], deg / len(group) if b.startswith(("spine", "neck")) else deg)
        sc, th = 1.0 + x[n + 1] / 100, math.radians(x[n + 4])
        R = np.array([[math.cos(th), 0, math.sin(th)], [0, 1, 0], [-math.sin(th), 0, math.cos(th)]])
        W = base_world.copy()
        W[:3, :3] = sc * R @ W[:3, :3]
        W[:3, 3] = sc * R @ (W[:3, 3] - c0) + c0 + np.array([x[n + 2] / 1000, 0, x[n + 3] / 1000])
        rig.world = W

    def loss(x):
        apply(x)
        m = gaussian_filter(mhfit.splat(rig.verts(), FIT_SIZE, 1).astype(float), 2.0)
        return 1 - (m * target).sum() / (m + target - m * target).sum() + 1e-5 * np.sum(np.square(x[:n]))

    x0 = np.zeros(n + 5)
    x0[n + 1] = 8.6  # the landmark skeleton sits ~9 % small against the traced outline
    res = minimize(loss, x0, method="Powell", options={"xtol": 0.2, "ftol": 1e-5, "maxfev": max_evals})
    apply(res.x)
    print(f"[fge] silhouette fit: soft IoU {1 - res.fun:.3f} after {res.nfev} evals")
    return 1 - res.fun


def build(collection=None, max_evals: int = 2500):
    """Return (FET_Body, FET_Body_Hero, armature)."""
    ob, arm = mh.build(ASSETS, name="FET_MH", collection=collection, weight=WEIGHT, muscle=MUSCLE)
    rig = mhfit.Rig(arm, ob)
    mhfit.bake_proportions(rig, arm, ob, _proportions(rig))
    rig = mhfit.Rig(arm, ob)
    mhfit.scale_head(rig, arm, ob, HEAD_SCALE)
    arm.rotation_euler = (0.0, 0.0, math.pi / 2)  # MakeHuman faces -Y; the reference fetus faces +X
    bpy.context.view_layer.update()
    rig = mhfit.Rig(arm, ob)
    for bone, direction in mhpose.aim_plan():
        rig.aim(bone, np.array(direction))
    _align_to_landmarks(rig)
    _fit_silhouette(rig, max_evals)
    rig.apply_to(arm)
    arm.matrix_world = Matrix(rig.world.tolist())
    bpy.context.view_layer.update()

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
    ob.hide_render = ob.hide_viewport = True
    arm.hide_render = arm.hide_viewport = True
    return base, hero, arm
