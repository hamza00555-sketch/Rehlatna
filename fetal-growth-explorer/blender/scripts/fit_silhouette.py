"""Corrective shape key that pulls the posed fetus onto the reference outline.

The rigged body keeps its rest shape and weights; this adds one shape key,
`REF_W24_fit` (value 1), in rest space, so the week-24 pose lands on the
reference silhouette and any other pose still deforms normally.

Each round: pose the body, project it through the hero camera, find the
vertices on its outline, move each along the reference's signed-distance
gradient onto the reference outline (capped), spread the motion smoothly over
the surface (harmonic, pinned to zero beyond a few centimetres), and map it
back to rest space through the inverse of each vertex's skinning matrix.

    python fit_silhouette.py [--rounds 3] [--cap 28]
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import bpy
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation, distance_transform_edt, gaussian_filter
from scipy.spatial import cKDTree

from fge import mhfit
from fge.camera import HERO, project_points
from fge.sculpt import _diffuse

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "fetal_master.blend"
MASK = ROOT / "lookdev" / "reference_mask.png"
FRAME = (1080, 1920)
SIL = (540, 960)  # outline raster (half resolution)
KEY = "REF_W24_fit"


def reference_field():
    m = np.asarray(Image.open(MASK).convert("L").resize(FRAME)) > 127
    sdf = distance_transform_edt(~m) - distance_transform_edt(m)  # + outside, - inside
    g = gaussian_filter(sdf, 2.0)
    gy, gx = np.gradient(g)
    n = np.maximum(np.hypot(gx, gy), 1e-6)
    return sdf, gx / n, gy / n


def posed_world(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    me = ob.evaluated_get(dg).to_mesh()
    M = np.array(ob.matrix_world)
    P = np.array([v.co[:] for v in me.vertices]) @ M[:3, :3].T + M[:3, 3]
    ob.evaluated_get(dg).to_mesh_clear()
    return P


def outline_vertices(P, faces):
    """Indices of vertices that sit on the rendered outline (half-res raster)."""
    sil = mhfit.silhouette(P, faces, SIL)
    edge = sil & ~np.pad(sil, 1)[2:, 1:-1] | sil & ~np.pad(sil, 1)[:-2, 1:-1] | sil & ~np.pad(sil, 1)[1:-1, 2:] | sil & ~np.pad(sil, 1)[1:-1, :-2]
    edge = binary_dilation(edge, iterations=1)
    uv, _ = project_points(P, HERO, SIL)
    x = np.clip(uv[:, 0].astype(int), 0, SIL[0] - 1)
    y = np.clip(uv[:, 1].astype(int), 0, SIL[1] - 1)
    on = edge[y, x]
    # only the front-most layer at each outline pixel counts
    return np.where(on)[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rounds", type=int, default=7)
    ap.add_argument("--outside", type=float, default=1.5, help="px outside the reference that pulls any vertex in")
    ap.add_argument("--retract", action="store_true", help="outside vertices retract toward their own body part")
    ap.add_argument("--rigid-ends", dest="rigid_ends", action="store_true", help="hands and feet move semi-rigidly (keeps toes/fingers, costs outline fit)")
    ap.add_argument("--end-keep", dest="end_keep", type=float, default=0.35, help="share of each hand/foot vertex's own move kept around the part's mean")
    ap.add_argument("--cap-hole", dest="cap_hole", type=float, default=60.0, help="max retraction per round, px")
    ap.add_argument("--cap", type=float, default=28.0, help="max move per round, px at 1080x1920")
    ap.add_argument("--smooth", type=int, default=12, help="Laplacian rounds on the displacement field")
    args = ap.parse_args()

    bpy.ops.wm.open_mainfile(filepath=str(MASTER))
    ob = bpy.data.objects["FET_Body"]
    arm = bpy.data.objects["FET_Rig"]
    for m in ob.modifiers:
        if m.type in ("SUBSURF", "CORRECTIVE_SMOOTH"):
            m.show_viewport = False
    bpy.context.view_layer.update()

    me = ob.data
    if me.shape_keys is None:
        ob.shape_key_add(name="Basis", from_mix=False)
    key = me.shape_keys.key_blocks.get(KEY) or ob.shape_key_add(name=KEY, from_mix=False)
    key.value = 1.0
    basis = np.array([v.co[:] for v in me.shape_keys.key_blocks["Basis"].data])
    cur = np.array([v.co[:] for v in key.data])

    faces = np.array([p.vertices[:3] for p in me.polygons] + [[p.vertices[0], p.vertices[2], p.vertices[3]] for p in me.polygons if len(p.vertices) == 4])
    edges = np.array([e.vertices[:] for e in me.edges])
    sdf, gx, gy = reference_field()
    f_px = (FRAME[1] / 2.0) / math.tan(HERO.fov_v / 2.0)

    rig = mhfit.Rig(arm, ob)
    rig.read_pose(arm)
    import re as _re

    def _family(name):
        n = name.lower()
        side = "L" if n.endswith(".l") else "R" if n.endswith(".r") else ""
        if _re.search("upperleg|lowerleg|foot|toe", n):
            return "leg" + side
        if _re.search("upperarm|lowerarm|wrist|finger|metacarpal|thumb", n):
            return "arm" + side
        if _re.search("head|neck|jaw|eye|ear|tongue|oris|levator|temporalis|special|lip|cheek|nose|brow", n):
            return "head"
        return "trunk"

    fams = np.array([_family(rig.names[b]) for b in rig.W.argmax(1)])
    part_of_vertex = fams

    def _end(name):
        n = name.lower()
        side = "L" if n.endswith(".l") else "R" if n.endswith(".r") else ""
        if _re.search("foot|toe", n):
            return "foot" + side
        if _re.search("wrist|finger|metacarpal|thumb", n):
            return "hand" + side
        return ""

    ends = np.array([_end(rig.names[b]) for b in rig.W.argmax(1)])
    S = rig.pose_matrices() @ np.linalg.inv(rig.rest)  # armature-space skinning
    A = np.einsum("vb,bij->vij", rig.W, S[:, :3, :3])  # per-vertex linear part
    A_inv = np.linalg.inv(A)
    R_arm_inv = np.linalg.inv(np.array(arm.matrix_world)[:3, :3])

    for r in range(args.rounds):
        P = posed_world(ob)
        idx = outline_vertices(P, faces)
        # plus every vertex that lands outside the reference: the reference has
        # holes (under the chin, between forearm and belly, between the legs)
        # that the outer rim alone cannot open
        uv_all, _ = project_points(P, HERO, FRAME)
        from scipy.ndimage import map_coordinates as _mc

        s_all = _mc(sdf, np.vstack([np.clip(uv_all[:, 1], 0, FRAME[1] - 1), np.clip(uv_all[:, 0], 0, FRAME[0] - 1)]), order=1)
        outside = np.where(s_all > args.outside)[0]
        idx = np.union1d(idx, outside)
        uv, depth = project_points(P[idx], HERO, FRAME)
        # sub-pixel samples of the reference distance field
        from scipy.ndimage import map_coordinates

        coords = np.vstack([np.clip(uv[:, 1], 0, FRAME[1] - 1), np.clip(uv[:, 0], 0, FRAME[0] - 1)])
        d = map_coordinates(sdf, coords, order=1)
        du = -d * map_coordinates(gx, coords, order=1)
        dv = -d * map_coordinates(gy, coords, order=1)
        if args.retract:
            # a vertex outside the reference retracts toward its own body part
            # (belly toward the trunk, forearm toward the arm): the first point
            # along that ray that lies inside the reference
            fam = part_of_vertex
            cen = {k: uv_all[fam == k].mean(0) for k in np.unique(fam)}
            sel = np.where(np.isin(idx, outside))[0]
            for k in sel:
                v = idx[k]
                c = cen[fam[v]]
                dirv = c - uv[k]
                L = np.hypot(*dirv)
                if L < 1e-3:
                    continue
                dirv /= L
                steps = np.arange(1, min(args.cap_hole, L) + 1)
                pts = uv[k][None, :] + steps[:, None] * dirv[None, :]
                sv = map_coordinates(sdf, np.vstack([np.clip(pts[:, 1], 0, FRAME[1] - 1), np.clip(pts[:, 0], 0, FRAME[0] - 1)]), order=1)
                hit = np.where(sv <= 0)[0]
                if len(hit):
                    du[k], dv[k] = steps[hit[0]] * dirv[0], steps[hit[0]] * dirv[1]
        mag = np.hypot(du, dv)
        cap = np.where(np.isin(idx, outside), args.cap_hole if args.retract else args.cap, args.cap)
        scale = np.minimum(1.0, cap / np.maximum(mag, 1e-6))
        du, dv = du * scale, dv * scale
        # pixel motion -> world motion in the image plane at each vertex's depth
        dw = np.zeros((len(idx), 3))
        dw[:, 0] = du * depth / f_px
        dw[:, 2] = -dv * depth / f_px
        # spread: outline verts fixed to their motion, verts > 3 cm from any outline vert fixed at 0
        D = np.zeros((len(P), 3))
        D[idx] = dw
        far = cKDTree(P[idx]).query(P)[0] > 0.03
        anchor = np.zeros(len(P), dtype=bool)
        anchor[idx] = True
        anchor |= far
        D = _diffuse(D, edges, anchor)
        # smooth the whole field (outline verts included) so the new outline
        # is as smooth as the surface: a ragged rim reads as damage
        for _ in range(args.smooth):
            acc = np.zeros_like(D)
            cnt = np.zeros(len(D))
            np.add.at(acc, edges[:, 0], D[edges[:, 1]])
            np.add.at(acc, edges[:, 1], D[edges[:, 0]])
            np.add.at(cnt, edges.ravel(), 1)
            D[~far] = 0.5 * D[~far] + 0.5 * (acc[~far] / np.maximum(cnt[~far], 1)[:, None])
        # hands and feet move as rigid pieces (their own mean move): per-vertex
        # pulls smear toes and fingers
        if args.rigid_ends:
            for e in np.unique(ends):
                if e:
                    m = ends == e
                    mu = D[m].mean(0)
                    D[m] = mu + args.end_keep * (D[m] - mu)
        # world -> armature -> rest (inverse of the blended skinning matrix)
        D_arm = D @ R_arm_inv.T
        D_rest = np.einsum("vij,vj->vi", A_inv, D_arm)
        cur = cur + D_rest
        key.data.foreach_set("co", cur.ravel())
        me.update()
        bpy.context.view_layer.update()
        before = np.abs(d).mean()
        print(f"[fge] round {r + 1}: {len(idx)} outline verts, mean outline error {before:.1f} px, max move {np.abs(D_rest).max() * 1000:.1f} mm")

    for m in ob.modifiers:
        if m.type == "SUBSURF":
            m.show_viewport = True
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER), compress=True)
    shift = np.linalg.norm(cur - basis, axis=1)
    print(f"[fge] {KEY}: median {np.median(shift) * 1000:.2f} mm, p99 {np.percentile(shift, 99) * 1000:.1f} mm, max {shift.max() * 1000:.1f} mm")


if __name__ == "__main__":
    main()
