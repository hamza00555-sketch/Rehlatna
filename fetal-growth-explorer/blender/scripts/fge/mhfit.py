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

    def aim(self, bone: str, world_dir) -> None:
        i = self.index[bone]
        M = self.pose_matrices()
        R_arm = np.linalg.inv(self.world[:3, :3])
        target = R_arm @ np.asarray(world_dir, float)
        y = M[i][:3, 1]
        q = quat_mat(quat_between(y, target))
        Mi_new = M[i].copy()
        Mi_new[:3, :3] = q @ M[i][:3, :3]
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
    """Scale segments (effective per-bone scales, FULL inheritance compensated) and
    make the result the new rest pose of both mesh and armature."""
    import bpy

    rig.reset()
    eff = {i: np.ones(3) for i in range(len(rig.names))}
    for name, sc in effective.items():
        eff[rig.index[name]] = np.asarray(sc, float)
    # children inherit parent scale: store local = own / parent effective chain
    chain_eff = {}
    for i in rig.order:
        p = rig.parent[i]
        parent_eff = chain_eff[p] if p >= 0 else np.ones(3)
        own = eff[i] if rig.names[i] in effective else parent_eff
        rig.scale[i] = own / parent_eff
        chain_eff[i] = own
    world = rig.world
    rig.world = np.eye(4)
    M = rig.pose_matrices()
    V = rig.verts()
    rig.world = world
    for v, co in zip(ob.data.vertices, V):
        v.co = co
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for i, name in enumerate(rig.names):
        eb = arm.data.edit_bones[name]
        R = M[i][:3, :3]
        lens = np.linalg.norm(R, axis=0)
        Rn = R / lens
        head = M[i][:3, 3]
        length = eb.length * lens[1]
        eb.head = Vector(head.tolist())
        eb.tail = Vector((head + Rn[:, 1] * length).tolist())
        eb.align_roll(Vector(Rn[:, 2].tolist()))
    bpy.ops.object.mode_set(mode="OBJECT")
    ob.data.update()


def scale_head(rig: Rig, arm, ob, factor: float, shape=(1.0, 1.0, 1.0), drop: float = 0.07) -> None:
    """Enlarge the head (fetal proportions) as one rigid piece about the skull centre.

    Everything above the lowest point of the head (the chin, rest pose upright)
    scales fully; the neck below tapers back to 1 over `drop` metres, giving the
    short, thick fetal neck. (Weight-based masks scaled forehead and face by
    different amounts and produced a brow shelf.) Rest pose: face -Y, up +Z."""
    import bpy

    head = rig.index["head"]
    sub = [i for i in range(len(rig.names)) if _descends(rig, i, head)]
    V = rig.rest_verts
    w = rig.W[:, sub].sum(axis=1)
    z_chin = V[w > 0.95, 2].min()
    t = np.clip((V[:, 2] - (z_chin - drop)) / drop, 0.0, 1.0)
    t = t * t * (3.0 - 2.0 * t)
    inside = V[w > 0.95]
    centre = (inside.max(0) + inside.min(0)) / 2
    centre[0] = 0.0
    sc = factor * np.asarray(shape, float)
    k = 1.0 + (sc[None, :] - 1.0) * t[:, None]
    newV = centre + (V - centre) * k
    for v, co in zip(ob.data.vertices, newV):
        v.co = co
    ob.data.update()
    # The scaled skull must move as one piece: hand the neck/spine share of its
    # skin weights to the head bone (blended by t), or bending the neck shears it.
    sub_names = {rig.names[i] for i in sub}
    groups = {vg.index: vg.name for vg in ob.vertex_groups}
    head_vg = ob.vertex_groups["head"]
    for v in ob.data.vertices:
        if t[v.index] <= 0.0:
            continue
        moved = 0.0
        for g in list(v.groups):
            name = groups[g.group]
            if name not in sub_names and g.weight > 0:
                take = g.weight * t[v.index]
                ob.vertex_groups[name].add([v.index], g.weight - take, "REPLACE")
                moved += take
        if moved > 0:
            head_vg.add([v.index], moved, "ADD")
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for i in sub:
        eb = arm.data.edit_bones[rig.names[i]]
        h, tl = np.array(eb.head), np.array(eb.tail)
        eb.head = Vector((centre + (h - centre) * sc).tolist()) if i != head else eb.head
        eb.tail = Vector((centre + (tl - centre) * sc).tolist())
    bpy.ops.object.mode_set(mode="OBJECT")


def _descends(rig, i, root) -> bool:
    while i >= 0:
        if i == root:
            return True
        i = rig.parent[i]
    return False

