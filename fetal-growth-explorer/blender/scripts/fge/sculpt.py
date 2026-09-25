"""Bind an external fetus sculpt to the fitted MakeHuman rig.

The MakeHuman body gives the pipeline its rig, weights and reference pose, but
its surface is a newborn's. A dedicated fetus sculpt (see assets/sculpt/README)
has the right surface. This module moves the sculpt onto the rig:

1. import + clean: all mesh parts joined, transforms applied, reduced to an
   animation-friendly quad mesh (QuadriFlow) or a triangle budget (decimate);
2. register: the sculpt is aligned to the rig's posed body (similarity from
   principal axes, then ICP on the surfaces), and the rig pose is refined so
   the posed MakeHuman body sits inside the sculpt (chamfer fit, NumPy LBS);
3. bind: skin weights are carried from the posed MakeHuman body to the
   sculpt by nearest surface point, and the sculpt is "unposed" with the
   inverse of its per-vertex skinning matrix, so the rig in that pose
   reproduces the sculpt exactly and any other pose deforms it;
4. the rig is then posed to the reference (the pose solved by fge.mhbody).
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix
from scipy.optimize import minimize
from scipy.spatial import cKDTree

from . import mh, mhfit


def import_sculpt(path: Path, name: str = "FET_Sculpt", collection=None):
    """Import glTF/GLB/OBJ/FBX, join every mesh into one object, apply transforms."""
    before = set(bpy.data.objects)
    suffix = path.suffix.lower()
    if suffix in (".gltf", ".glb"):
        bpy.ops.import_scene.gltf(filepath=str(path))
    elif suffix == ".obj":
        bpy.ops.wm.obj_import(filepath=str(path))
    elif suffix == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(path))
    else:
        raise ValueError(f"unsupported sculpt format: {suffix}")
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"no mesh in {path}")
    for o in new:
        if o.type != "MESH":
            continue
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    for o in bpy.context.selected_objects:
        o.parent = None if o.parent and o.parent.type != "MESH" else o.parent
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    # bake world transforms into the mesh data before joining
    for o in meshes:
        o.data.transform(o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = ob.data.name = name
    for o in new:
        if o is not ob and o.name in bpy.data.objects and o.type != "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    if collection is not None:
        for c in list(ob.users_collection):
            c.objects.unlink(ob)
        collection.objects.link(ob)
    # keep only the largest connected part (drops stray bits, stands, labels)
    _keep_largest_island(ob)
    return ob


def _keep_largest_island(ob) -> None:
    import bmesh

    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    seen, islands = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, comp = [v], []
        seen.add(v.index)
        while stack:
            x = stack.pop()
            comp.append(x)
            for e in x.link_edges:
                y = e.other_vert(x)
                if y.index not in seen:
                    seen.add(y.index)
                    stack.append(y)
        islands.append(comp)
    if len(islands) > 1:
        keep = max(islands, key=len)
        keep_set = {v.index for v in keep}
        # small islands close to the main body (eyes, nails) are kept too
        main = np.array([v.co[:] for v in keep])
        tree = cKDTree(main)
        extent = np.ptp(main, axis=0).max()
        drop = []
        for comp in islands:
            if comp is keep:
                continue
            pts = np.array([v.co[:] for v in comp])
            if tree.query(pts.mean(0))[0] > 0.05 * extent:
                drop.extend(comp)
        bmesh.ops.delete(bm, geom=drop, context="VERTS")
        del keep_set
    bm.to_mesh(ob.data)
    bm.free()


def reduce(ob, faces: int = 40000, quads: bool = True) -> None:
    """Animation-friendly density: QuadriFlow quads (clean deformation), or a
    collapse decimation when QuadriFlow fails on a non-manifold scan."""
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    if quads:
        try:
            n0 = len(ob.data.polygons)
            bpy.ops.object.quadriflow_remesh(mode="FACES", target_faces=faces, use_preserve_sharp=False, use_mesh_symmetry=False, smooth_normals=True, seed=0)
            print(f"[fge] quadriflow: {n0} -> {len(ob.data.polygons)} faces")
            if len(ob.data.polygons) <= 1.5 * faces:
                return
        except RuntimeError as err:
            print(f"[fge] quadriflow failed ({err}); decimating instead")
    ratio = min(1.0, faces / max(len(ob.data.polygons), 1))
    mod = ob.modifiers.new("decimate", "DECIMATE")
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)


def _verts(ob) -> np.ndarray:
    V = np.empty(len(ob.data.vertices) * 3)
    ob.data.vertices.foreach_get("co", V)
    return V.reshape(-1, 3) @ np.array(ob.matrix_world)[:3, :3].T + np.array(ob.matrix_world)[:3, 3]


def _principal(P):
    c = P.mean(0)
    w, U = np.linalg.eigh(np.cov((P - c).T))
    return c, U[:, ::-1], np.sqrt(w[::-1])


def register(sculpt, target_pts: np.ndarray, iters: int = 40) -> None:
    """Similarity-align the sculpt to target points (the posed MakeHuman body):
    principal axes for the start (all 4 sign flips tried), then ICP."""
    S = _verts(sculpt)
    cs, Us, ss = _principal(S)
    ct, Ut, st = _principal(target_pts)
    scale = float(np.prod(st) / np.prod(ss)) ** (1 / 3)
    tree_t = cKDTree(target_pts)
    best = None
    for signs in np.array(np.meshgrid([1, -1], [1, -1], [1, -1])).T.reshape(-1, 3):
        R = Ut @ np.diag(signs) @ Us.T
        if np.linalg.det(R) < 0:  # proper rotations only (eigh axes may be left-handed)
            continue
        X = (S - cs) @ R.T * scale + ct
        err = tree_t.query(X[:: max(1, len(X) // 4000)])[0].mean()
        if best is None or err < best[0]:
            best = (err, R)
    R, s, t = best[1], scale, ct - scale * (best[1] @ cs)
    sub = S[:: max(1, len(S) // 6000)]
    tsub = target_pts[:: max(1, len(target_pts) // 6000)]
    for _ in range(iters):
        # symmetric correspondences: one-way closest points shrink the fit
        X = s * sub @ R.T + t
        _, j = tree_t.query(X)
        _, i = cKDTree(X).query(tsub)
        A = np.vstack([sub, sub[i]])
        B = np.vstack([target_pts[j], tsub])
        ca, cb = A.mean(0), B.mean(0)
        H = (A - ca).T @ (B - cb)
        U, sv, Vt = np.linalg.svd(H)
        D = np.diag([1, 1, np.sign(np.linalg.det(Vt.T @ U.T))])
        R = Vt.T @ D @ U.T
        s = float(np.sum(sv * np.diag(D)) / np.sum((A - ca) ** 2))
        t = cb - s * R @ ca
    M = np.eye(4)
    M[:3, :3] = s * R
    M[:3, 3] = t
    sculpt.data.transform(Matrix(M.tolist()) @ sculpt.matrix_world)
    sculpt.matrix_world = Matrix.Identity(4)
    print(f"[fge] sculpt registered: scale {s:.4f}, mean surface gap {tree_t.query(_verts(sculpt)[::20])[0].mean() * 1000:.1f} mm")


def fit_rig_pose(rig: mhfit.Rig, sculpt_pts: np.ndarray, bones: list[str], max_evals: int = 800) -> None:
    """Refine limb/spine rotations so the posed MakeHuman body lies on the
    sculpt surface (symmetric chamfer on subsampled points)."""
    tree_s = cKDTree(sculpt_pts)
    base = rig.local.copy()
    idx = [b for b in bones if b in rig.index]
    sub = np.arange(0, len(rig.rest_verts), 4)
    ssub = sculpt_pts[:: max(1, len(sculpt_pts) // 6000)]

    def apply(x):
        rig.local = base.copy()
        for k, b in enumerate(idx):
            rig.bend(b, [1, 0, 0], x[3 * k])
            rig.bend(b, [0, 1, 0], x[3 * k + 1])
            rig.bend(b, [0, 0, 1], x[3 * k + 2])

    def loss(x):
        apply(x)
        V = rig.verts()[sub]
        a = tree_s.query(V)[0].mean()
        b = cKDTree(V).query(ssub)[0].mean()
        return a + b + 1e-6 * np.sum(x**2)

    x0 = np.zeros(3 * len(idx))
    res = minimize(loss, x0, method="Powell", options={"xtol": 0.2, "ftol": 1e-7, "maxfev": max_evals})
    apply(res.x)
    print(f"[fge] rig pose fitted to sculpt: chamfer {loss(np.zeros_like(x0)) * 1000:.2f} -> {res.fun * 1000:.2f} mm")


def bind(sculpt, body, rig: mhfit.Rig, arm) -> None:
    """Carry weights from the posed MakeHuman body to the sculpt (nearest
    point, blended over the 4 nearest), unpose the sculpt with the inverse of
    its skinning matrix, and parent it to the armature."""
    Vb = rig.verts()  # posed MakeHuman body, world
    Vs = _verts(sculpt)
    d, j = cKDTree(Vb).query(Vs, k=4)
    w = 1.0 / np.maximum(d, 1e-5)
    w /= w.sum(1, keepdims=True)
    W = np.einsum("vk,vkb->vb", w, rig.W[j])
    # keep the 4 strongest influences per vertex, renormalised
    top = np.argsort(-W, axis=1)[:, :4]
    Wt = np.zeros_like(W)
    np.put_along_axis(Wt, top, np.take_along_axis(W, top, axis=1), axis=1)
    Wt /= np.maximum(Wt.sum(1, keepdims=True), 1e-9)
    # unpose: v_rest = (sum_b w_b S_b)^-1 v_posed, all in armature space
    M = rig.pose_matrices()
    Sk = M @ np.linalg.inv(rig.rest)
    world_inv = np.linalg.inv(rig.world)
    Va = (np.c_[Vs, np.ones(len(Vs))] @ world_inv.T)[:, :3]
    A = np.einsum("vb,bij->vij", Wt, Sk)
    rest = np.einsum("vij,vj->vi", np.linalg.inv(A), np.c_[Va, np.ones(len(Va))])[:, :3]
    for v, co in zip(sculpt.data.vertices, rest):
        v.co = co
    sculpt.data.update()
    sculpt.vertex_groups.clear()
    groups = {n: sculpt.vertex_groups.new(name=n) for n in rig.names}
    rows, cols = np.nonzero(Wt)
    for vi, bi in zip(rows.tolist(), cols.tolist()):
        groups[rig.names[bi]].add([vi], float(Wt[vi, bi]), "REPLACE")
    sculpt.parent = arm
    sculpt.matrix_parent_inverse = Matrix.Identity(4)
    sculpt.matrix_basis = Matrix.Identity(4)
    mod = sculpt.modifiers.new("rig", "ARMATURE")
    mod.object = arm
    mod.use_deform_preserve_volume = True
    mh.clean_weights(sculpt)
    print(f"[fge] sculpt bound: {len(sculpt.data.vertices)} verts, {len(rig.names)} bones")


SPINE_AND_LIMBS = [
    "spine05", "spine04", "spine03", "spine02", "spine01", "neck01", "neck02", "neck03", "head",
    "upperarm01.R", "lowerarm01.R", "wrist.R", "upperarm01.L", "lowerarm01.L", "wrist.L",
    "upperleg01.R", "lowerleg01.R", "foot.R", "upperleg01.L", "lowerleg01.L", "foot.L",
]


def adopt(path: Path, body, arm, faces: int = 40000, collection=None):
    """Full pipeline: returns the bound sculpt, posed like `arm` currently is."""
    probe = mhfit.Rig(arm, body)
    probe.read_pose(arm)
    target_local = probe.local.copy()
    target_world = np.array(arm.matrix_world)
    sculpt = import_sculpt(path, collection=collection)
    reduce(sculpt, faces)
    rig = mhfit.Rig(arm, body)
    rig.local = target_local.copy()
    register(sculpt, rig.verts())
    fit_rig_pose(rig, _verts(sculpt), SPINE_AND_LIMBS)
    bind(sculpt, body, rig, arm)
    # back to the reference pose solved by fge.mhbody
    rig.local = target_local
    rig.world = target_world
    rig.apply_to(arm)
    bpy.context.view_layer.update()
    body.hide_render = body.hide_viewport = True
    return sculpt


del math
