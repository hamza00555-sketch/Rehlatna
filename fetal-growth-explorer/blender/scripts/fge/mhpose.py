"""Pose the MakeHuman baby into the reference's fetal curl.

Each bone is aimed (parents first) at a direction taken from the landmark
skeleton measured on the reference (the same joints the SDF body uses).
A later silhouette fit refines the angles against the reference outline.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

# Landmark joints (world metres, reference framing). Near = fetus's right (Y < 0).
J = {
    "pelvis": (-0.026, 0.0, -0.066),
    "spine_mid": (-0.036, 0.0, -0.041),
    "chest": (-0.038, 0.0, -0.013),
    "upper_chest": (-0.034, 0.0, 0.007),
    "neck_base": (-0.027, 0.0, 0.022),
    "skull_base": (-0.016, 0.0, 0.040),
    "shoulder_r": (-0.042, -0.0305, 0.006),
    "elbow_r": (-0.029, -0.0445, -0.0265),
    "wrist_r": (0.0065, -0.0335, -0.001),
    "hand_r": (0.0215, -0.0335, 0.002),
    "shoulder_l": (-0.0355, 0.027, 0.004),
    "elbow_l": (-0.0215, 0.040, -0.030),
    "wrist_l": (-0.001, 0.025, -0.0305),
    "hand_l": (0.010, 0.015, -0.034),
    "hip_r": (-0.020, -0.0185, -0.070),
    "knee_r": (0.0385, -0.026, -0.048),
    "ankle_r": (0.0525, -0.020, -0.084),
    "toe_r": (0.0800, -0.013, -0.0745),
    "hip_l": (-0.020, 0.0185, -0.070),
    "knee_l": (0.032, 0.023, -0.052),
    "ankle_l": (0.033, 0.012, -0.0935),
    "toe_l": (0.0560, 0.004, -0.1135),
}

HEAD_FLEX = math.radians(42)  # used only by the legacy world-aim of the head bone


MIDLINE = ("spine", "neck", "head")  # bones aimed with their roll pinned to the lateral axis


def d(a, b) -> Vector:
    return (Vector(J[b]) - Vector(J[a])).normalized()


def aim_plan():
    head_dir = Vector((math.sin(HEAD_FLEX), 0.0, math.cos(HEAD_FLEX)))
    return [
        ("spine05", d("pelvis", "spine_mid")),
        ("spine04", d("spine_mid", "chest")),
        ("spine03", d("chest", "upper_chest")),
        ("spine02", d("upper_chest", "neck_base")),
        ("spine01", d("upper_chest", "neck_base")),
        ("neck01", d("neck_base", "skull_base")),
        ("neck02", d("neck_base", "skull_base")),
        ("neck03", d("neck_base", "skull_base")),
        ("head", head_dir),
        ("upperarm01.R", d("shoulder_r", "elbow_r")),
        ("upperarm02.R", d("shoulder_r", "elbow_r")),
        ("lowerarm01.R", d("elbow_r", "wrist_r")),
        ("lowerarm02.R", d("elbow_r", "wrist_r")),
        ("wrist.R", d("wrist_r", "hand_r")),
        ("upperarm01.L", d("shoulder_l", "elbow_l")),
        ("upperarm02.L", d("shoulder_l", "elbow_l")),
        ("lowerarm01.L", d("elbow_l", "wrist_l")),
        ("lowerarm02.L", d("elbow_l", "wrist_l")),
        ("wrist.L", d("wrist_l", "hand_l")),
        ("upperleg01.R", d("hip_r", "knee_r")),
        ("upperleg02.R", d("hip_r", "knee_r")),
        ("lowerleg01.R", d("knee_r", "ankle_r")),
        ("lowerleg02.R", d("knee_r", "ankle_r")),
        ("foot.R", d("ankle_r", "toe_r")),
        ("upperleg01.L", d("hip_l", "knee_l")),
        ("upperleg02.L", d("hip_l", "knee_l")),
        ("lowerleg01.L", d("knee_l", "ankle_l")),
        ("lowerleg02.L", d("knee_l", "ankle_l")),
        ("foot.L", d("ankle_l", "toe_l")),
    ]


def aim(arm: bpy.types.Object, bone: str, world_dir: Vector) -> None:
    pb = arm.pose.bones[bone]
    mw = arm.matrix_world
    inv = mw.inverted().to_3x3()
    target = (inv @ world_dir).normalized()
    M = pb.matrix.copy()
    y = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
    q = y.rotation_difference(target)
    head = M.to_translation()
    R = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head)
    pb.matrix = R @ M
    bpy.context.view_layer.update()


def pose(arm: bpy.types.Object) -> None:
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
    for bone, direction in aim_plan():
        if bone in arm.pose.bones:
            aim(arm, bone, direction)
