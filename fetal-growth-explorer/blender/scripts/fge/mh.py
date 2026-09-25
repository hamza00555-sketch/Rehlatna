"""MakeHuman (CC0) base mesh as the fetus body.

Loads the hm08 base mesh, blends the baby macro targets, builds the
default skeleton from the MPFB rig description and skins it with the
default weights. All assets come from the MPFB extension (CC0): base mesh,
targets, rig and weights. Coordinates are converted from MakeHuman's
Y-up decimetres to Blender Z-up metres.
"""

from __future__ import annotations

import gzip
import json
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

SCALE = 0.1  # MakeHuman units are decimetres


def mh_to_blender(P: np.ndarray) -> np.ndarray:
    P = np.asarray(P, dtype=float)
    return np.stack([P[:, 0], -P[:, 2], P[:, 1]], axis=1) * SCALE


def read_obj(path: Path):
    verts, faces, groups = [], [], {}
    current = None
    for line in path.read_text().splitlines():
        if line.startswith("v "):
            verts.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("g "):
            current = line.split(maxsplit=1)[1].strip()
            groups.setdefault(current, [])
        elif line.startswith("f "):
            idx = [int(tok.split("/")[0]) - 1 for tok in line.split()[1:]]
            faces.append(idx)
            groups[current].append(len(faces) - 1)
    return np.array(verts), faces, groups


def read_target(path: Path, n: int) -> np.ndarray:
    d = np.zeros((n, 3))
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt") as fh:
        for line in fh:
            if not line or line[0] == "#":
                continue
            parts = line.split()
            if len(parts) == 4:
                d[int(parts[0])] = [float(x) for x in parts[1:]]
    return d


def _levels(value: float, names=("min", "average", "max")) -> dict:
    """MakeHuman macro interpolation: 0 = min, 0.5 = average, 1 = max."""
    if value <= 0.5:
        return {names[0]: (0.5 - value) / 0.5, names[1]: value / 0.5}
    return {names[1]: (1.0 - value) / 0.5, names[2]: (value - 0.5) / 0.5}


def baby_offsets(data: Path, n: int, weight: float = 0.5, muscle: float = 0.5) -> np.ndarray:
    """MakeHuman age = baby, gender 0.5, ethnic mix 1/3 each, plus the universal
    muscle/weight macro for that age (weight/muscle in 0..1, 0.5 = average)."""
    macro = data / "targets" / "macrodetails"
    names = [f"{e}-{g}-baby.target.gz" for e in ("african", "asian", "caucasian") for g in ("female", "male")]
    d = sum(read_target(macro / nm, n) for nm in names) / len(names)
    for m, wm in _levels(muscle).items():
        for w, ww in _levels(weight).items():
            if wm * ww > 0:
                for g in ("female", "male"):
                    d = d + 0.5 * wm * ww * read_target(macro / f"universal-{g}-baby-{m}muscle-{w}weight.target.gz", n)
    return d


def joint_positions(verts_mh: np.ndarray, groups_verts: dict, spec: dict) -> np.ndarray:
    s = spec["strategy"]
    if s == "VERTEX":
        return verts_mh[spec["vertex_index"]]
    if s == "MEAN":
        return verts_mh[spec["vertex_indices"]].mean(axis=0)
    if s == "CUBE":
        return verts_mh[groups_verts[spec["cube_name"]]].mean(axis=0)
    raise ValueError(s)


FETAL_TARGETS = {
    # closed lids: mean of the three ethnic expression units, both eyes
    **{f"expression/units/{e}/eye-{s}-closure.target.gz": 1.0 / 3 for e in ("african", "asian", "caucasian") for s in ("left", "right")},
    "head/head-round.target.gz": 1.0,
}


def build(data: Path, name: str = "FET_MH", collection=None, targets: dict | None = None, weight: float = 0.5, muscle: float = 0.5):
    verts, faces, groups = read_obj(data / "3dobjs" / "base.obj")
    n = len(verts)
    verts = verts + baby_offsets(data, n, weight, muscle)
    for rel, wt in (FETAL_TARGETS if targets is None else targets).items():
        verts = verts + wt * read_target(data / "targets" / rel, n)
    groups_verts = {}
    for g, fidx in groups.items():
        vs = sorted({v for f in fidx for v in faces[f]})
        groups_verts[g] = vs
    body_faces = [faces[i] for i in groups["body"]]
    col = collection or bpy.context.scene.collection

    me = bpy.data.meshes.new(name)
    me.from_pydata(mh_to_blender(verts), [], body_faces)
    me.validate()
    me.shade_smooth()
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)

    rig = json.loads((data / "rigs" / "standard" / "rig.default.json").read_text())
    arm_data = bpy.data.armatures.new(name + "_rig")
    arm = bpy.data.objects.new(name + "_rig", arm_data)
    col.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for bname, b in rig.items():
        eb = arm_data.edit_bones.new(bname)
        h = mh_to_blender(joint_positions(verts, groups_verts, b["head"])[None])[0]
        t = mh_to_blender(joint_positions(verts, groups_verts, b["tail"])[None])[0]
        if np.linalg.norm(t - h) < 1e-5:
            t = h + np.array([0, 0, 0.002])
        eb.head, eb.tail = Vector(h), Vector(t)
        eb.roll = b.get("roll", 0.0)
    for bname, b in rig.items():
        if b.get("parent"):
            arm_data.edit_bones[bname].parent = arm_data.edit_bones[b["parent"]]
            arm_data.edit_bones[bname].use_connect = bool(b.get("use_connect", False))
    bpy.ops.object.mode_set(mode="OBJECT")

    weights = json.loads((data / "rigs" / "standard" / "weights.default.json").read_text())["weights"]
    used = sorted({v for f in body_faces for v in f})
    remap = -np.ones(n, dtype=int)
    # from_pydata keeps all vertices; loose (helper-only) ones are removed below.
    for bname, pairs in weights.items():
        vg = ob.vertex_groups.new(name=bname)
        for v, w in pairs:
            vg.add([int(v)], float(w), "REPLACE")
    import bmesh

    bm = bmesh.new()
    bm.from_mesh(me)
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(me)
    bm.free()
    mod = ob.modifiers.new("rig", "ARMATURE")
    mod.object = arm
    ob.parent = arm
    del remap, used
    return ob, arm
