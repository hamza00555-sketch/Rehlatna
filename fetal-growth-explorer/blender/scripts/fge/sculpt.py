"""Bind an external fetus sculpt to the fitted MakeHuman rig.

The MakeHuman body gives the pipeline its rig, weights and reference pose; a
sculpt (see assets/sculpt/README) gives a finer surface. This module moves the
sculpt onto the rig:

1. import + clean: all mesh parts baked to world space, fused into one closed
   surface (voxel remesh), reduced to an animation-friendly quad mesh;
2. register: similarity from the posed rig's bone frames matched on the
   heads, refined by symmetric ICP; the rig pose is then fitted to the sculpt
   (trunk, arms, legs, all; chamfer on NumPy LBS);
3. bind in place: weights carried over by normal-aware nearest points, the
   fitted pose applied as the armature's rest pose (binding moves nothing);
4. the reference pose (fge.mhbody) is re-applied through the bones and keyed.
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


HEAD_NAMES = ("head", "testa", "kopf", "tete", "cabeza", "skull")


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
    # bake world transforms into the mesh data (before touching parents)
    world = {o.name: o.matrix_world.copy() for o in meshes}
    for o in meshes:
        o.parent = None
        o.data.transform(world[o.name])
        o.matrix_world = Matrix.Identity(4)
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    others = [o.name for o in new if o.type != "MESH"]
    head = [o for o in meshes if any(k in o.name.lower() for k in HEAD_NAMES)]
    head_box = None
    if head:
        H = np.vstack([np.array([v.co[:] for v in o.data.vertices]) for o in head])
        head_box = (H.min(0).tolist(), H.max(0).tolist())
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = ob.data.name = name
    for n in others:
        if n in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
    if collection is not None:
        for c in list(ob.users_collection):
            c.objects.unlink(ob)
        collection.objects.link(ob)
    # fuse the parts (sculpts are often split into chunks, the head separate)
    # into one closed surface, then keep the largest piece (drops stray bits)
    V = np.empty(len(ob.data.vertices) * 3)
    ob.data.vertices.foreach_get("co", V)
    extent = float(np.ptp(V.reshape(-1, 3), axis=0).max())
    mod = ob.modifiers.new("fuse", "REMESH")
    mod.mode = "VOXEL"
    mod.voxel_size = extent / 400.0
    mod.use_smooth_shade = True
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)
    _keep_largest_island(ob)
    if head_box is not None:
        ob["fge_head_min"], ob["fge_head_max"] = head_box
    print(f"[fge] sculpt fused: {len(ob.data.vertices)} verts (voxel {extent / 400.0:.4g})")
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


def _normals(P: np.ndarray, faces: np.ndarray) -> np.ndarray:
    fn = np.cross(P[faces[:, 1]] - P[faces[:, 0]], P[faces[:, 2]] - P[faces[:, 0]])
    N = np.zeros_like(P)
    for k in range(3):
        np.add.at(N, faces[:, k], fn)
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)


def _descendants(rig: mhfit.Rig, root: str) -> list[int]:
    r = rig.index[root]
    return [i for i in range(len(rig.names)) if mhfit._descends(rig, i, r)]


def _rot_x(deg: float) -> np.ndarray:
    a = math.radians(deg)
    return np.array([[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]])


def _icp(S, T, R, s, t, iters):
    """Similarity ICP with symmetric correspondences (one-way closest points shrink the fit)."""
    tree_t = cKDTree(T)
    for _ in range(iters):
        X = s * S @ R.T + t
        _, j = tree_t.query(X)
        _, i = cKDTree(X).query(T)
        A = np.vstack([S, S[i]])
        B = np.vstack([T[j], T])
        ca, cb = A.mean(0), B.mean(0)
        H = (A - ca).T @ (B - cb)
        U, sv, Vt = np.linalg.svd(H)
        D = np.diag([1, 1, np.sign(np.linalg.det(Vt.T @ U.T))])
        R = Vt.T @ D @ U.T
        s = float(np.sum(sv * np.diag(D)) / np.sum((A - ca) ** 2))
        t = cb - s * R @ ca
    X = s * S @ R.T + t
    err = tree_t.query(X)[0].mean() + cKDTree(X).query(T)[0].mean()
    return R, s, t, err


def register(sculpt, rig: mhfit.Rig) -> None:
    """Similarity-align the sculpt to the posed MakeHuman body.

    Sculpts come in the same frame convention as MakeHuman (face -Y, up +Z), so
    the start rotations are the posed rig's own bone frames (head, neck, chest,
    pelvis), each with a few pitch offsets; the start scale and position match
    the heads. Every start runs ICP and the best symmetric fit wins."""
    S = _verts(sculpt)
    T = rig.verts()
    head_bones = _descendants(rig, "head")
    head_t = T[rig.W[:, head_bones].sum(1) > 0.5]
    if "fge_head_min" in sculpt:
        lo, hi = np.array(sculpt["fge_head_min"]), np.array(sculpt["fge_head_max"])
        head_s = S[np.all((S >= lo) & (S <= hi), axis=1)]
    else:
        head_s = S
    rms = lambda P: float(np.sqrt(((P - P.mean(0)) ** 2).sum(1).mean()))
    s0 = rms(head_t) / rms(head_s)
    M = rig.pose_matrices()
    Wr = rig.world[:3, :3] / np.linalg.norm(rig.world[:3, :3], axis=0)[None, :]
    sub = S[:: max(1, len(S) // 3000)]
    tsub = T[:: max(1, len(T) // 3000)]
    best = None
    for bone in ("head", "neck02", "spine03", "spine05"):
        i = rig.index[bone]
        Rb = (M[i] @ np.linalg.inv(rig.rest[i]))[:3, :3]
        Rb = Rb / np.linalg.norm(Rb, axis=0)[None, :]
        for pitch in (-40, -20, 0, 20, 40):
            R = Wr @ Rb @ _rot_x(pitch)
            t = head_t.mean(0) - s0 * R @ head_s.mean(0)
            fit = _icp(sub, tsub, R, s0, t, 15)
            if best is None or fit[3] < best[3]:
                best = fit
    R, s, t, _ = _icp(S[:: max(1, len(S) // 8000)], T[:: max(1, len(T) // 8000)], *best[:3], 30)
    Mx = np.eye(4)
    Mx[:3, :3] = s * R
    Mx[:3, 3] = t
    sculpt.data.transform(Matrix(Mx.tolist()) @ sculpt.matrix_world)
    sculpt.matrix_world = Matrix.Identity(4)
    X = _verts(sculpt)
    gap = cKDTree(T).query(X[::10])[0].mean() + cKDTree(X).query(T[::10])[0].mean()
    print(f"[fge] sculpt registered: scale {s:.4f}, symmetric surface gap {gap * 500:.1f} mm")


STAGES = [
    ["root", "spine05", "spine04", "spine03", "spine02", "spine01", "neck01", "neck02", "neck03", "head"],
    ["shoulder01.L", "upperarm01.L", "lowerarm01.L", "wrist.L", "shoulder01.R", "upperarm01.R", "lowerarm01.R", "wrist.R"],
    ["pelvis.L", "upperleg01.L", "lowerleg01.L", "foot.L", "pelvis.R", "upperleg01.R", "lowerleg01.R", "foot.R"],
]


def fit_rig_pose(rig: mhfit.Rig, sculpt_pts: np.ndarray, max_evals: int = 1200) -> None:
    """Bend the rig so the posed MakeHuman body lies on the sculpt surface:
    trunk first, then arms, then legs, then everything together (symmetric
    chamfer on subsampled points, NumPy LBS)."""
    tree_s = cKDTree(sculpt_pts)
    sub = np.arange(0, len(rig.rest_verts), 3)
    ssub = sculpt_pts[:: max(1, len(sculpt_pts) // 8000)]

    def chamfer():
        V = rig.verts()[sub]
        return tree_s.query(V)[0].mean() + cKDTree(V).query(ssub)[0].mean()

    start = chamfer()
    for bones in STAGES + [sum(STAGES, [])]:
        idx = [b for b in bones if b in rig.index]
        base = rig.local.copy()

        def apply(x):
            rig.local = base.copy()
            for k, b in enumerate(idx):
                rig.bend(b, [1, 0, 0], x[3 * k])
                rig.bend(b, [0, 1, 0], x[3 * k + 1])
                rig.bend(b, [0, 0, 1], x[3 * k + 2])

        def loss(x):
            apply(x)
            return chamfer() + 2e-7 * np.sum(x**2)

        res = minimize(loss, np.zeros(3 * len(idx)), method="Powell", options={"xtol": 0.2, "ftol": 1e-7, "maxfev": max_evals})
        apply(res.x)
    print(f"[fge] rig pose fitted to sculpt: chamfer {start * 500:.2f} -> {chamfer() * 500:.2f} mm")


def _sculpt_normals(sculpt) -> np.ndarray:
    N = np.empty(len(sculpt.data.vertices) * 3)
    sculpt.data.vertices.foreach_get("normal", N)
    return N.reshape(-1, 3)


def transfer(sculpt, rig: mhfit.Rig, body) -> np.ndarray:
    """Skin weights (and the body's fge_* point attributes) from the posed
    MakeHuman body to the sculpt: nearest points whose normals agree (so an
    arm resting on the chest does not take chest weights), then a few rounds
    of smoothing over the sculpt's own edges. Returns the weight matrix."""
    Vb = rig.verts()
    Nb = _normals(Vb, rig.faces)
    Vs, Ns = _verts(sculpt), _sculpt_normals(sculpt)
    d, j = cKDTree(Vb).query(Vs, k=16)
    agree = np.clip(np.einsum("vd,vkd->vk", Ns, Nb[j]), 0.0, 1.0) ** 2
    w = agree / np.maximum(d, 1e-5)
    w[w.sum(1) < 1e-6] = (1.0 / np.maximum(d, 1e-5))[w.sum(1) < 1e-6]
    w /= w.sum(1, keepdims=True)
    W = np.einsum("vk,vkb->vb", w, rig.W[j])
    edges = np.array([e.vertices[:] for e in sculpt.data.edges])
    for _ in range(4):
        acc = np.zeros_like(W)
        cnt = np.zeros(len(W))
        np.add.at(acc, edges[:, 0], W[edges[:, 1]])
        np.add.at(acc, edges[:, 1], W[edges[:, 0]])
        np.add.at(cnt, edges.ravel(), 1)
        W = 0.5 * W + 0.5 * acc / np.maximum(cnt, 1)[:, None]
    top = np.argsort(-W, axis=1)[:, :4]
    Wt = np.zeros_like(W)
    np.put_along_axis(Wt, top, np.take_along_axis(W, top, axis=1), axis=1)
    Wt /= np.maximum(Wt.sum(1, keepdims=True), 1e-9)
    for a in body.data.attributes:
        if a.name.startswith("fge_") and a.domain == "POINT" and a.data_type == "FLOAT":
            src = np.empty(len(body.data.vertices), dtype=np.float32)
            a.data.foreach_get("value", src)
            out = sculpt.data.attributes.new(a.name, "FLOAT", "POINT")
            out.data.foreach_set("value", np.einsum("vk,vk->v", w, src[j]).astype(np.float32))
    return Wt


def _pose_to(arm, rig: mhfit.Rig, M_target: np.ndarray) -> None:
    """Pose the (new-rest) armature so every bone reaches its armature-space
    matrix in M_target (computed against the old rest)."""
    R = np.array([np.array(arm.data.bones[n].matrix_local) for n in rig.names])
    # pose scale (the head enlargement) is already in the sculpt's size, and
    # armature_apply keeps no scale in the rest pose: rotations only
    M_target = M_target.copy()
    M_target[:, :3, :3] /= np.linalg.norm(M_target[:, :3, :3], axis=1, keepdims=True)
    for i in rig.order:
        p = rig.parent[i]
        base = R[i] if p < 0 else M_target[p] @ np.linalg.inv(R[p]) @ R[i]
        arm.pose.bones[rig.names[i]].matrix_basis = Matrix((np.linalg.inv(base) @ M_target[i]).tolist())


def adopt(path: Path, body, arm, faces: int = 40000, collection=None):
    """Replace the MakeHuman surface with the sculpt, bound to the same rig.

    The sculpt is bound in its own pose: the rig is fitted to it, that fitted
    pose becomes the armature's rest pose (so binding changes no vertex), and
    the reference pose solved by fge.mhbody is re-applied through the bones.
    Returns the new FET_Body."""
    from .mhbody import _store_action

    probe = mhfit.Rig(arm, body)
    probe.read_pose(arm)
    M_target = probe.pose_matrices()
    sculpt = import_sculpt(path, collection=collection)
    reduce(sculpt, faces)
    rig = mhfit.Rig(arm, body)
    rig.read_pose(arm)
    register(sculpt, rig)
    fit_rig_pose(rig, _verts(sculpt))
    W = transfer(sculpt, rig, body)

    # the fitted pose becomes the rest pose
    arm.animation_data_clear()
    rig.apply_to(arm)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode="OBJECT")

    # sculpt: armature-local coordinates, parented, weighted
    sculpt.data.transform(Matrix(np.linalg.inv(np.array(arm.matrix_world)).tolist()))
    sculpt.parent = arm
    sculpt.matrix_parent_inverse = Matrix.Identity(4)
    sculpt.matrix_basis = Matrix.Identity(4)
    groups = {n: sculpt.vertex_groups.new(name=n) for n in rig.names}
    rows, cols = np.nonzero(W)
    for vi, bi in zip(rows.tolist(), cols.tolist()):
        groups[rig.names[bi]].add([vi], float(W[vi, bi]), "REPLACE")
    mod = sculpt.modifiers.new("rig", "ARMATURE")
    mod.object = arm
    mod.use_deform_preserve_volume = True
    mh.clean_weights(sculpt)

    # back to the reference pose, keyed as before
    _pose_to(arm, rig, M_target)
    for act in [a for a in bpy.data.actions if a.name.startswith("FET_W24_Curl")]:
        bpy.data.actions.remove(act)
    _store_action(arm, "FET_W24_Curl")
    bpy.context.view_layer.update()

    # the MakeHuman body retires; the sculpt takes its name and cord anchor
    navel = np.array(body.get("fge_navel", (0.0, 0.0, 0.0)))
    old_mesh = body.data
    bpy.data.objects.remove(body, do_unlink=True)
    bpy.data.meshes.remove(old_mesh)
    sculpt.name = sculpt.data.name = "FET_Body"
    sculpt.data.shade_smooth()
    ev = sculpt.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = ev.to_mesh()
    Mw = np.array(sculpt.matrix_world)
    co = np.array([v.co[:] for v in me.vertices]) @ Mw[:3, :3].T + Mw[:3, 3]
    nrm = np.array([v.normal[:] for v in me.vertices]) @ Mw[:3, :3].T
    ev.to_mesh_clear()
    tree = cKDTree(co)
    near = tree.query_ball_point(co[tree.query(navel)[1]], 0.004)
    n = nrm[near].mean(0)
    sculpt["fge_navel"] = co[near].mean(0).tolist()
    sculpt["fge_navel_normal"] = (n / np.linalg.norm(n)).tolist()
    sculpt.data.use_auto_texspace = False
    sculpt.data.texspace_location = (0.0, 0.0, 0.0)
    sculpt.data.texspace_size = (1.0, 1.0, 1.0)
    subd = sculpt.modifiers.new("subd", "SUBSURF")
    subd.levels, subd.render_levels = 0, 1
    return sculpt

