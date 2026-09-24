"""SDF → Blender meshes.

1. Marching cubes on a dense grid (skimage) gives a closed surface.
2. Blender's voxel remesh turns it into an even quad mesh: FET_Body, the
   base that later carries the per-week shape keys and ships to the web.
3. Every vertex is projected back onto the exact implicit surface, with a
   little tangential relaxation so vertices stay evenly spread.
4. The hero mesh is the base subdivided once and projected again, which
   brings back sub-millimetre detail (eyelid line, lips, nail folds) for
   Cycles renders.
"""

from __future__ import annotations

import time

import bpy
import numpy as np
from skimage.measure import marching_cubes

from .sdf import Shape, gradient, project, sample_grid


def log(msg: str, t0: float | None = None) -> None:
    print(f"[fge] {msg}" + (f" ({time.time() - t0:.1f}s)" if t0 is not None else ""), flush=True)


def mesh_object(name: str, verts: np.ndarray, faces: np.ndarray, collection=None) -> bpy.types.Object:
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts.astype(np.float64), [], faces.astype(np.int64))
    me.validate(clean_customdata=False)
    me.update()
    ob = bpy.data.objects.new(name, me)
    (collection or bpy.context.scene.collection).objects.link(ob)
    return ob


def coords(ob: bpy.types.Object) -> np.ndarray:
    co = np.empty(len(ob.data.vertices) * 3)
    ob.data.vertices.foreach_get("co", co)
    return co.reshape(-1, 3)


def set_coords(ob: bpy.types.Object, P: np.ndarray) -> None:
    ob.data.vertices.foreach_set("co", P.astype(np.float64).ravel())
    ob.data.update()


def edges(ob: bpy.types.Object) -> np.ndarray:
    e = np.empty(len(ob.data.edges) * 2, dtype=np.int64)
    ob.data.edges.foreach_get("vertices", e)
    return e.reshape(-1, 2)


def evaluated_copy(ob: bpy.types.Object, name: str) -> bpy.types.Object:
    """Bake an object's modifier stack into a new mesh object (no operators, no context)."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    me.name = name
    out = bpy.data.objects.new(name, me)
    for c in ob.users_collection:
        c.objects.link(out)
    return out


def relax_on_surface(shape: Shape, P: np.ndarray, E: np.ndarray, rounds: int = 2, amount: float = 0.5) -> np.ndarray:
    """Tangential Laplacian smoothing, re-projected onto the implicit surface each round."""
    n = len(P)
    deg = np.bincount(E.ravel(), minlength=n).astype(float)
    for _ in range(rounds):
        acc = np.zeros_like(P)
        np.add.at(acc, E[:, 0], P[E[:, 1]])
        np.add.at(acc, E[:, 1], P[E[:, 0]])
        avg = acc / np.maximum(deg, 1.0)[:, None]
        g = gradient(shape, P)
        g /= np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-12)
        delta = avg - P
        delta -= g * np.einsum("ij,ij->i", delta, g)[:, None]
        P = project(shape, P + amount * delta, iterations=3)
    return P


def build_body_meshes(shape: Shape, grid_voxel: float = 0.0006, remesh_voxel: float = 0.0008, hero: bool = True, collection=None):
    t0 = time.time()
    vol, origin = sample_grid(shape, grid_voxel)
    log(f"grid {vol.shape}", t0)
    t1 = time.time()
    verts, faces, _, _ = marching_cubes(vol, level=0.0, spacing=(grid_voxel,) * 3)
    verts += origin
    log(f"marching cubes {len(verts)} verts", t1)

    mc = mesh_object("FET_Body_MC", verts, faces, collection)
    rm = mc.modifiers.new("remesh", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = remesh_voxel
    rm.adaptivity = 0.0
    t1 = time.time()
    base = evaluated_copy(mc, "FET_Body")
    bpy.data.objects.remove(mc)
    log(f"voxel remesh {len(base.data.vertices)} verts", t1)

    t1 = time.time()
    P = project(shape, coords(base), iterations=4)
    P = relax_on_surface(shape, P, edges(base), rounds=2)
    set_coords(base, P)
    base.data.shade_smooth()
    log("projected + relaxed base", t1)

    hero_ob = None
    if hero:
        t1 = time.time()
        sub = base.modifiers.new("subd", "SUBSURF")
        sub.levels = sub.render_levels = 1
        hero_ob = evaluated_copy(base, "FET_Body_Hero")
        base.modifiers.remove(sub)
        P = project(shape, coords(hero_ob), iterations=4, max_step=0.001)
        set_coords(hero_ob, P)
        hero_ob.data.shade_smooth()
        log(f"hero mesh {len(hero_ob.data.vertices)} verts", t1)
    log("body meshes done", t0)
    return base, hero_ob
