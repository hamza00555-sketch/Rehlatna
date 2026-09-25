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


def read_obj(path: Path, with_uv: bool = False):
    verts, uvs, faces, face_uv, groups = [], [], [], [], {}
    current = None
    for line in path.read_text().splitlines():
        if line.startswith("v "):
            verts.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("vt "):
            uvs.append([float(x) for x in line.split()[1:3]])
        elif line.startswith("g "):
            current = line.split(maxsplit=1)[1].strip()
            groups.setdefault(current, [])
        elif line.startswith("f "):
            toks = [tok.split("/") for tok in line.split()[1:]]
            faces.append([int(t[0]) - 1 for t in toks])
            face_uv.append([int(t[1]) - 1 if len(t) > 1 and t[1] else -1 for t in toks])
            groups[current].append(len(faces) - 1)
    if with_uv:
        return np.array(verts), faces, groups, np.array(uvs), face_uv
    return np.array(verts), faces, groups


def read_target(path: Path, n: int) -> np.ndarray:
    d = np.zeros((n, 3))
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt") as fh:
        for line in fh:
            if not line or line[0] == "#":
                continue
            parts = line.split()
            if len(parts) == 4 and int(parts[0]) < n:  # n may cover the body only; skip helper vertices
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


def region_mask(data: Path, n: int, folder: str, prefix: str = "", rel: float = 0.0) -> np.ndarray:
    """Vertices any target in targets/<folder> moves (e.g. "ears"): a region
    selection that comes straight from the MakeHuman modelling targets. With
    `rel`, only vertices moved by at least that fraction of the target's
    largest displacement (translation targets also nudge the surroundings)."""
    mask = np.zeros(n, dtype=bool)
    for f in sorted((data / "targets" / folder).glob(f"{prefix}*.target.gz")):
        m = np.linalg.norm(read_target(f, n), axis=1)
        mask |= m > max(1e-6, rel * m.max())  # rel > 0: only the vertices the target really shapes
    return mask


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
    # (head-round is not used: on the baby it creases the temples; the vault is
    # rounded geometrically in fge.mhfit.smooth_vault instead)
}


def transfer_joints(adult: np.ndarray, baby: np.ndarray, joints_adult: np.ndarray, n_body: int, k: int = 40) -> np.ndarray:
    """Carry joint positions from the base mesh to the shaped mesh with a local
    affine map fitted to the k nearest skin vertices of each joint.

    Some MEAN/VERTEX joint recipes pair skin vertices with helper-mesh vertices
    that the baby targets move inconsistently (neck01 collapsed to ~1 mm, neck03
    flipped downward). Evaluating them on the unshaped base mesh and
    transferring gives consistent joints."""
    from scipy.spatial import cKDTree

    tree = cKDTree(adult[:n_body])
    out = np.empty_like(joints_adult)
    for j, p in enumerate(joints_adult):
        dist, idx = tree.query(p, k=k)
        wts = 1.0 / np.maximum(dist, 1e-6)
        X = np.c_[adult[idx], np.ones(k)]
        sw = np.sqrt(wts)[:, None]
        Amap = np.linalg.lstsq(X * sw, baby[idx] * sw, rcond=None)[0]
        out[j] = np.r_[p, 1.0] @ Amap
    return out


def clean_weights(ob, limit: int = 4) -> None:
    """Deform weights ready for export: drop near-zero memberships, keep at most
    `limit` bones per vertex (glTF / three.js skinning) and normalise to 1."""
    prev, was_selected = bpy.context.view_layer.objects.active, ob.select_get()
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)  # the vertex-group operators silently skip unselected objects
    bpy.ops.object.vertex_group_clean(group_select_mode="ALL", limit=0.001)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=limit)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    _fill_unweighted(ob)
    ob.select_set(was_selected)
    bpy.context.view_layer.objects.active = prev


def _fill_unweighted(ob) -> None:
    """Vertices left without any weight (the source weights are below the clean
    threshold there) take the average of their weighted edge neighbours."""
    n = len(ob.data.vertices)
    W = {}
    for v in ob.data.vertices:
        if v.groups:
            W[v.index] = {g.group: g.weight for g in v.groups}
    todo = [i for i in range(n) if i not in W]
    if not todo:
        return
    nbrs = [[] for _ in range(n)]
    for e in ob.data.edges:
        a, b = e.vertices
        nbrs[a].append(b)
        nbrs[b].append(a)
    while todo:
        left = []
        for i in todo:
            src = [W[j] for j in nbrs[i] if j in W]
            if not src:
                left.append(i)
                continue
            acc = {}
            for d in src:
                for g, w in d.items():
                    acc[g] = acc.get(g, 0.0) + w / len(src)
            top = sorted(acc.items(), key=lambda t: -t[1])[:4]
            tot = sum(w for _, w in top)
            W[i] = {g: w / tot for g, w in top}
            for g, w in W[i].items():
                ob.vertex_groups[g].add([i], w, "REPLACE")
        if len(left) == len(todo):
            break
        todo = left


def build(data: Path, name: str = "FET_MH", collection=None, targets: dict | None = None, weight: float = 0.5, muscle: float = 0.5):
    verts, faces, groups, uvs, face_uv = read_obj(data / "3dobjs" / "base.obj", with_uv=True)
    n = len(verts)
    adult = verts.copy()
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
    # MakeHuman's own UV layout (texturing, and texture coordinates that stay
    # glued to the skin when the rig deforms it)
    loop_uv = np.array([uvs[k] for i in groups["body"] for k in face_uv[i]])
    me.uv_layers.new(name="UVMap").data.foreach_set("uv", loop_uv.ravel())
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
    n_body = max(max(f) for f in body_faces) + 1
    names = list(rig)
    specs = [rig[b][e] for b in names for e in ("head", "tail")]
    # CUBE joints use helper cubes the targets move consistently: evaluate them on the
    # shaped mesh. MEAN/VERTEX recipes are evaluated on the base mesh and transferred.
    direct = np.array([joint_positions(verts, groups_verts, sp) for sp in specs])
    moved = transfer_joints(adult, verts, np.array([joint_positions(adult, groups_verts, sp) for sp in specs]), n_body)
    ends = mh_to_blender(np.where(np.array([sp["strategy"] == "CUBE" for sp in specs])[:, None], direct, moved))
    # The neck chain runs from the joint-neck cube to the joint-head cube; on the baby
    # the in-between recipes zig-zag, so space its two inner joints evenly on that line.
    j = {b: i for i, b in enumerate(names)}
    a, z = ends[2 * j["neck01"]], ends[2 * j["head"]]
    for k, b in enumerate(("neck01", "neck02", "neck03")):
        ends[2 * j[b]] = a + (z - a) * k / 3
        ends[2 * j[b] + 1] = a + (z - a) * (k + 1) / 3
    for j, bname in enumerate(names):
        b = rig[bname]
        eb = arm_data.edit_bones.new(bname)
        h, t = ends[2 * j], ends[2 * j + 1]
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
    clean_weights(ob)
    mod = ob.modifiers.new("rig", "ARMATURE")
    mod.object = arm
    ob.parent = arm
    del remap, used
    return ob, arm
