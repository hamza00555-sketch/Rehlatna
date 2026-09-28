"""Stage shape keys W12…W40 on the rigged week-24 body.

Proportions come from fetal biometry (data/fetal_growth.json), relative to
the base week:

- head vs trunk: HC/AC ratio (the head is ~1.3x the abdomen at 12 w, ~1.0 at term)
- limb length vs trunk: FL/AC ratio (short limbs at 12 w, level from ~20 w)
- fullness: lean and thin-limbed early, subcutaneous fat from ~28 w

Each key is the rest pose deformed by per-bone scales (LBS with the body's
own weights) plus a fullness offset along the rest normals, so every week
shares one topology and one rig: the timeline morphs between neighbouring
keys, and overall size per week (crown-heel length) is applied as scale by
the viewer, not baked into the keys.

    python build_week_keys.py
"""

from __future__ import annotations

import json
from pathlib import Path

import bpy
import numpy as np

from fge import mhfit

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "fetal_master.blend"
DATA = ROOT / "data" / "fetal_growth.json"

# lean (-) to full (+), per week: skin close over muscle early, fat from ~28 w
FULLNESS = {12: -1.0, 16: -0.8, 20: -0.5, 24: 0.0, 28: 0.3, 32: 0.6, 36: 0.85, 40: 1.0}
FAT_MM = 2.6   # offset at fullness 1 (the base body is ~200 mm crown-heel)
LEAN_MM = 1.8  # inset at fullness -1
HEAD_BONE = "head"
LIMB_ROOTS = ("upperarm01.L", "upperarm01.R", "upperleg01.L", "upperleg01.R")


def main():
    data = json.loads(DATA.read_text())
    base = str(data["base_week"])
    weeks = data["weeks"]
    ratio = lambda w, a, b: weeks[w][a] / weeks[w][b]

    bpy.ops.wm.open_mainfile(filepath=str(MASTER))
    ob = bpy.data.objects["FET_Body"]
    arm = bpy.data.objects["FET_Rig"]
    me = ob.data
    if me.shape_keys is None:
        ob.shape_key_add(name="Basis", from_mix=False)
    basis = np.array([v.co[:] for v in me.shape_keys.key_blocks["Basis"].data])

    rig = mhfit.Rig(arm, ob)
    rig.rest_verts = basis  # keys are built from the basis, not the fitted shape
    world_inv = np.linalg.inv(np.array(arm.matrix_world))
    # rest normals of the basis (armature space)
    faces = np.array([p.vertices[:3] for p in me.polygons] + [[p.vertices[0], p.vertices[2], p.vertices[3]] for p in me.polygons if len(p.vertices) == 4])
    fn = np.cross(basis[faces[:, 1]] - basis[faces[:, 0]], basis[faces[:, 2]] - basis[faces[:, 0]])
    N = np.zeros_like(basis)
    for k in range(3):
        np.add.at(N, faces[:, k], fn)
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)
    # hands and feet stay lean-neutral (fat there reads as swelling)
    ends = np.zeros(len(basis))
    for i, n in enumerate(rig.names):
        if n.startswith(("wrist", "foot", "toe", "finger", "metacarpal")):
            ends += rig.W[:, i]
    fat_mask = 1.0 - np.clip(ends, 0.0, 1.0)

    for w in sorted(weeks, key=int):
        rig.reset()
        s_head = ratio(w, "hc", "ac") / ratio(base, "hc", "ac")
        s_limb = ratio(w, "fl", "ac") / ratio(base, "fl", "ac")
        full = FULLNESS[int(w)]
        girth = 1.0 + 0.10 * full  # limbs thicken with fat, thin early
        rig.scale[rig.index[HEAD_BONE]] = (s_head, s_head, s_head)
        for b in LIMB_ROOTS:
            if b in rig.index:
                # local Y is the bone's length axis
                rig.scale[rig.index[b]] = (girth, s_limb, girth)
        V = rig.verts()  # world space
        V = (np.c_[V, np.ones(len(V))] @ world_inv.T)[:, :3]  # back to armature/mesh space
        off = (FAT_MM if full > 0 else LEAN_MM) * 1e-3 * full
        V = V + N * (off * fat_mask)[:, None]
        name = f"W{int(w):02d}"
        key = me.shape_keys.key_blocks.get(name) or ob.shape_key_add(name=name, from_mix=False)
        key.data.foreach_set("co", V.ravel())
        key.value = 0.0
        key.slider_min, key.slider_max = 0.0, 1.0
        d = np.linalg.norm(V - basis, axis=1)
        print(f"[fge] {name}: head x{s_head:.3f}, limbs x{s_limb:.3f}, fullness {full:+.2f}; shift median {np.median(d) * 1000:.1f} mm, max {d.max() * 1000:.1f} mm")

    ob["fge_weeks"] = json.dumps({w: {"ch_cm": v["ch_cm"], "weight_g": v["weight_g"]} for w, v in weeks.items()})
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER), compress=True)
    print(f"[fge] week keys written to {MASTER.name}")


if __name__ == "__main__":
    main()
