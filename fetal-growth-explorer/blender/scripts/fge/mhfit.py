"""Fast NumPy forward kinematics + linear blend skinning for the MakeHuman rig,
and a silhouette fit of the pose to the reference outline.

Blender builds the mesh and armature once (fge.mh); this module snapshots
rest matrices and weights so thousands of candidate poses can be evaluated
without the depsgraph. The winning pose is written back to the armature.
"""

from __future__ import annotations

import math

import numpy as np
from mathutils import Matrix, Vector

from .camera import HERO, project_points


def quat_between(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    v = np.cross(a, b)
    c = float(np.dot(a, b))
    if c < -0.999999:
        axis = np.cross(a, [1, 0, 0])
        if np.linalg.norm(axis) < 1e-6:
            axis = np.cross(a, [0, 1, 0])
        axis /= np.linalg.norm(axis)
        return axis_angle(axis, math.pi)
    s = math.sqrt((1 + c) * 2)
    return np.array([s / 2, *(v / s)])


def axis_angle(axis, ang):
    axis = np.asarray(axis, float) / np.linalg.norm(axis)
    return np.array([math.cos(ang / 2), *(axis * math.sin(ang / 2))])


def quat_mat(q):
    w, x, y, z = q
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])


class Rig:
    """Snapshot of an armature + skinned mesh, evaluated in world space."""

    def __init__(self, arm, ob):
        bones = list(arm.data.bones)
        self.names = [b.name for b in bones]
        self.index = {n: i for i, n in enumerate(self.names)}
        self.parent = np.array([self.index[b.parent.name] if b.parent else -1 for b in bones])
        self.rest = np.array([np.array(b.matrix_local) for b in bones])  # armature space
        self.world = np.array(arm.matrix_world)
        n_v = len(ob.data.vertices)
        self.rest_verts = np.array([v.co[:] for v in ob.data.vertices])
        vg_to_bone = {vg.index: self.index.get(vg.name, -1) for vg in ob.vertex_groups}
        rows, cols, vals = [], [], []
        for v in ob.data.vertices:
            for g in v.groups:
                b = vg_to_bone.get(g.group, -1)
                if b >= 0 and g.weight > 0:
                    rows.append(v.index)
                    cols.append(b)
                    vals.append(g.weight)
        W = np.zeros((n_v, len(bones)))
        W[rows, cols] = vals
        W /= np.maximum(W.sum(axis=1, keepdims=True), 1e-9)
        self.W = W
        self.order = self._topo()
        self.faces = np.array([list(p.vertices)[:3] for p in ob.data.polygons] + [[p.vertices[0], p.vertices[2], p.vertices[3]] for p in ob.data.polygons if len(p.vertices) == 4])
        self.reset()

    def _topo(self):
        order, seen = [], set()

        def visit(i):
            if i in seen:
                return
            if self.parent[i] >= 0:
                visit(self.parent[i])
            seen.add(i)
            order.append(i)

        for i in range(len(self.names)):
            visit(i)
        return order

    def reset(self):
        self.local = np.tile(np.eye(4), (len(self.names), 1, 1))
        self.scale = np.ones((len(self.names), 3))

    def pose_matrices(self):
        M = np.zeros_like(self.rest)
        for i in self.order:
            L = self.local[i].copy()
            L[:3, :3] = L[:3, :3] * self.scale[i][None, :]
            p = self.parent[i]
            if p < 0:
                M[i] = self.rest[i] @ L
            else:
                M[i] = M[p] @ np.linalg.inv(self.rest[p]) @ self.rest[i] @ L
        return M

    def aim(self, bone: str, world_dir, lateral=None) -> None:
        """Point the bone's Y axis along world_dir. Without `lateral` the rotation is
        the shortest arc, so roll drifts with the path; with it, the bone's X axis is
        kept as close as possible to that world axis (sign preserved), which pins the
        roll of midline bones in a profile pose."""
        i = self.index[bone]
        M = self.pose_matrices()
        R_arm = np.linalg.inv(self.world[:3, :3])
        target = R_arm @ np.asarray(world_dir, float)
        Mi_new = M[i].copy()
        if lateral is None:
            q = quat_mat(quat_between(M[i][:3, 1], target))
            Mi_new[:3, :3] = q @ M[i][:3, :3]
        else:
            lens = np.linalg.norm(M[i][:3, :3], axis=0)
            y = target / np.linalg.norm(target)
            lat = R_arm @ np.asarray(lateral, float)
            lat = lat if np.dot(lat, M[i][:3, 0]) >= 0 else -lat
            x = lat - np.dot(lat, y) * y
            x /= np.linalg.norm(x)
            z = np.cross(x, y)
            Mi_new[:3, :3] = np.stack([x, y, z], axis=1) * lens[None, :]
        p = self.parent[i]
        base = self.rest[i] if p < 0 else M[p] @ np.linalg.inv(self.rest[p]) @ self.rest[i]
        L = np.linalg.inv(base) @ Mi_new
        L[:3, :3] = L[:3, :3] / self.scale[i][None, :]
        self.local[i] = L

    def twist(self, bone: str, deg: float) -> None:
        i = self.index[bone]
        R = np.eye(4)
        R[:3, :3] = quat_mat(axis_angle([0, 1, 0], math.radians(deg)))
        self.local[i] = self.local[i] @ R

    def bend(self, bone: str, axis, deg: float) -> None:
        i = self.index[bone]
        R = np.eye(4)
        R[:3, :3] = quat_mat(axis_angle(axis, math.radians(deg)))
        self.local[i] = self.local[i] @ R

    def verts(self) -> np.ndarray:
        M = self.pose_matrices()
        S = M @ np.linalg.inv(self.rest)  # skinning matrices, armature space
        V = np.c_[self.rest_verts, np.ones(len(self.rest_verts))]
        out = np.einsum("vb,bij,vj->vi", self.W, S, V)[:, :3]
        return (np.c_[out, np.ones(len(out))] @ self.world.T)[:, :3]

    def apply_to(self, arm) -> None:
        """Write local rotations/scales back to Blender pose bones."""
        for i, n in enumerate(self.names):
            pb = arm.pose.bones[n]
            L = self.local[i]
            pb.rotation_mode = "QUATERNION"
            pb.rotation_quaternion = Matrix(L[:3, :3].tolist()).to_quaternion()
            pb.location = Vector(L[:3, 3].tolist())
            pb.scale = Vector(self.scale[i].tolist())


def silhouette(P: np.ndarray, faces: np.ndarray, size=(279, 500)) -> np.ndarray:
    """Rasterise triangles to a boolean mask (vectorised barycentric test per triangle bbox)."""
    w, h = size
    uv, _ = project_points(P, HERO, size)
    mask = np.zeros((h, w), dtype=bool)
    tri = uv[faces]
    mn = np.floor(tri.min(axis=1)).astype(int)
    mx = np.ceil(tri.max(axis=1)).astype(int)
    for t in range(len(faces)):
        x0, y0 = max(mn[t, 0], 0), max(mn[t, 1], 0)
        x1, y1 = min(mx[t, 0], w - 1), min(mx[t, 1], h - 1)
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        a, b, c = tri[t]
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-12:
            continue
        l1 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / d
        l2 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / d
        inside = (l1 >= 0) & (l2 >= 0) & (l1 + l2 <= 1)
        mask[y0 : y1 + 1, x0 : x1 + 1] |= inside
    return mask


def splat(P: np.ndarray, size=(279, 500), radius: int = 1) -> np.ndarray:
    """Cheap silhouette: project vertices and dilate. Good enough inside an optimiser."""
    w, h = size
    uv, _ = project_points(P, HERO, size)
    x = np.clip(uv[:, 0].astype(int), 0, w - 1)
    y = np.clip(uv[:, 1].astype(int), 0, h - 1)
    m = np.zeros((h, w), dtype=bool)
    m[y, x] = True
    from scipy.ndimage import binary_closing, binary_dilation

    m = binary_dilation(m, iterations=radius)
    return binary_closing(m, iterations=2)


def bake_proportions(rig: Rig, arm, ob, effective: dict) -> None:
    """Scale bone segments and make the result the new rest pose of mesh and armature.

    `effective` maps bone -> (sx, sy, sz) in that bone's own frame (Y = along the
    bone). Each bone's scale acts on its own segment only: a child's head follows
    its parent's scaled offset, but the child is never scaled by its parent. (Using
    Blender's inherited pose scale and dividing it back out per child sheared any
    child not colinear with its parent: the head under a shortened neck and the
    face bones under it came out grooved.)"""
    import bpy

    nb = len(rig.names)
    R = rig.rest[:, :3, :3]
    heads = rig.rest[:, :3, 3]
    A = np.tile(np.eye(3), (nb, 1, 1))
    for name, sc in effective.items():
        i = rig.index[name]
        A[i] = R[i] @ np.diag(np.asarray(sc, float)) @ R[i].T
    new_heads = heads.copy()
    for i in rig.order:
        p = rig.parent[i]
        if p >= 0:
            new_heads[i] = new_heads[p] + A[p] @ (heads[i] - heads[p])
    V = rig.rest_verts
    out = np.zeros_like(V)
    for i in range(nb):
        w = rig.W[:, i]
        nz = w > 0
        if nz.any():
            out[nz] += w[nz, None] * (new_heads[i] + (V[nz] - heads[i]) @ A[i].T)
    for v, co in zip(ob.data.vertices, out):
        v.co = co
    tails = np.array([arm.data.bones[n].tail_local[:] for n in rig.names])  # read before connected heads move them
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for i, name in enumerate(rig.names):
        eb = arm.data.edit_bones[name]
        tail_rest = tails[i]
        z_axis = A[i] @ R[i][:, 2]
        eb.head = Vector(new_heads[i].tolist())
        eb.tail = Vector((new_heads[i] + A[i] @ (tail_rest - heads[i])).tolist())
        eb.align_roll(Vector(z_axis.tolist()))
    bpy.ops.object.mode_set(mode="OBJECT")
    ob.data.update()


def scale_head(rig: Rig, arm, ob, factor: float, shape=(1.0, 1.0, 1.0), drop: float = 0.03) -> None:
    """Enlarge the head (fetal proportions) about a point on the neck axis `drop`
    metres below the chin (rest pose upright: face -Y, up +Z).

    Everything above the chin scales by `factor`; between the pivot and the chin
    the factor ramps up smoothly. Because the ramp starts at the pivot itself,
    displacements there are ~0 and the neck/shoulder junction cannot fold (the
    earlier skull-centred pivot pushed the neck ring down into the shoulders and
    left a collar-shaped ledge)."""
    import bpy

    head = rig.index["head"]
    sub = [i for i in range(len(rig.names)) if _descends(rig, i, head)]
    V = rig.rest_verts
    w = rig.W[:, sub].sum(axis=1)
    z_chin = V[w > 0.95, 2].min()
    z0 = z_chin - drop
    ring = V[(np.abs(V[:, 2] - z0) < 0.004) & (np.abs(V[:, 0]) < 0.04)]
    pivot = np.array([0.0, ring[:, 1].mean(), z0])
    sc = factor * np.asarray(shape, float)

    def k_at(P):
        t = np.clip((P[:, 2] - z0) / drop, 0.0, 1.0)
        t = t * t * (3.0 - 2.0 * t)
        return 1.0 + (sc[None, :] - 1.0) * t[:, None], t

    k, t = k_at(V)
    newV = pivot + (V - pivot) * k
    for v, co in zip(ob.data.vertices, newV):
        v.co = co
    ob.data.update()
    # The skull must move as one piece: above the chin, hand the neck/spine share
    # of the skin weights to the head bone, or bending the neck shears it.
    sub_names = {rig.names[i] for i in sub}
    groups = {vg.index: vg.name for vg in ob.vertex_groups}
    head_vg = ob.vertex_groups["head"]
    for v in ob.data.vertices:
        if t[v.index] < 0.999:
            continue
        moved = 0.0
        for g in list(v.groups):
            name = groups[g.group]
            if name not in sub_names and g.weight > 0:
                ob.vertex_groups[name].add([v.index], 0.0, "REPLACE")
                moved += g.weight
        if moved > 0:
            head_vg.add([v.index], moved, "ADD")
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    moved_bones = set(sub) | {rig.index[n] for n in ("neck02", "neck03") if n in rig.index}
    for i in moved_bones:
        eb = arm.data.edit_bones[rig.names[i]]
        pts = np.array([eb.head[:], eb.tail[:]])
        kk, _ = k_at(pts)
        new = pivot + (pts - pivot) * kk
        eb.head, eb.tail = Vector(new[0].tolist()), Vector(new[1].tolist())
    bpy.ops.object.mode_set(mode="OBJECT")


def _descends(rig, i, root) -> bool:
    while i >= 0:
        if i == root:
            return True
        i = rig.parent[i]
    return False



def smooth_vault(rig: Rig, ob, iterations: int = 60, roundness: float = 0.0, keep=None, lam: float = 0.5, mu: float = -0.53) -> None:
    """Taubin-smooth the skull vault (top and back of the head) in the rest pose.

    The hm08 baby skull carries a bump at the crown that the fetal head scale
    magnifies into a visible ridge; the reference vault is smooth. Taubin
    (lambda|mu) smoothing removes it without shrinking the head. Face and ears
    are masked out by direction from the skull centre (face -Y, up +Z); `keep`
    (bool per vertex, e.g. the ears) is excluded with a few rings of falloff."""
    import scipy.sparse as sp

    head = rig.index["head"]
    sub = [i for i in range(len(rig.names)) if _descends(rig, i, head)]
    w = rig.W[:, sub].sum(axis=1)
    V = rig.rest_verts.copy()
    H = V[w > 0.95]
    centre = (H.max(0) + H.min(0)) / 2
    centre[0] = 0.0
    d = V - centre
    u = d / np.maximum(np.linalg.norm(d, axis=1, keepdims=True), 1e-9)
    # whole cranium: everything except a cone around the face (forward and a little
    # down) and the underside toward the neck; ears are protected via `keep`
    face_dir = np.array([0.0, -1.0, -0.35]) / np.linalg.norm([0.0, -1.0, -0.35])
    t_face = np.clip((0.70 - u @ face_dir) / 0.40, 0.0, 1.0)
    t_neck = np.clip((u[:, 2] + 0.55) / 0.3, 0.0, 1.0)
    t = t_face * t_neck
    m = t * t * (3 - 2 * t) * np.clip((w - 0.9) / 0.1, 0.0, 1.0)
    # the smoothing reaches further toward the face than the rounding, so the
    # rounded vault blends into temples and brow instead of leaving a groove
    ts = np.clip((0.90 - u @ face_dir) / 0.45, 0.0, 1.0) * t_neck
    ms = ts * ts * (3 - 2 * ts) * np.clip((w - 0.9) / 0.1, 0.0, 1.0)
    edges = np.array([e.vertices[:] for e in ob.data.edges])
    n = len(V)
    A = sp.coo_matrix((np.ones(2 * len(edges)), (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(n, n)).tocsr()
    deg = np.asarray(A.sum(axis=1)).ravel()
    if keep is not None:
        k = keep.astype(float)
        for _ in range(6):  # grow + soften the protected region
            k = np.maximum(k, A @ k / np.maximum(deg, 1))
        m = m * (1.0 - np.clip(k * 1.5, 0.0, 1.0))
        ms = ms * (1.0 - np.clip(k * 1.5, 0.0, 1.0))
    if roundness > 0:
        # pull the vault toward an axis-aligned ellipsoid fitted to it (symmetric in X)
        fit = V[(m > 0.5)]
        X = np.c_[fit[:, 0] ** 2, fit[:, 1] ** 2, fit[:, 2] ** 2, fit[:, 1], fit[:, 2]]
        a, b, c, dd, e = np.linalg.lstsq(X, np.ones(len(fit)), rcond=None)[0]
        cy, cz = -dd / (2 * b), -e / (2 * c)
        g = 1 + b * cy * cy + c * cz * cz
        axes = np.sqrt(g / np.array([a, b, c]))
        ec = np.array([0.0, cy, cz])
        q = V - ec
        r = np.linalg.norm(q, axis=1)
        uq = q / np.maximum(r[:, None], 1e-9)
        r_e = 1.0 / np.sqrt(((uq / axes) ** 2).sum(axis=1))
        V = ec + uq * (r + (r_e - r) * m * roundness)[:, None]
    mm = ms[:, None]
    for _ in range(iterations):
        for f in (lam, mu):
            L = A @ V / np.maximum(deg[:, None], 1) - V
            V = V + f * mm * L
    for v, co in zip(ob.data.vertices, V):
        v.co = co
    ob.data.update()
    rig.rest_verts = V
