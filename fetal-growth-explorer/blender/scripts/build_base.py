"""Build the week-24 base fetus and save blender/fetal_master.blend.

Default body: the CC0 MakeHuman baby, reproportioned, posed and fitted to
the reference silhouette (fge.mhbody; run fetch_makehuman.py and
fit_reference_mask.py once first). `--sdf` builds the earlier procedural
implicit-surface body instead.

FET_Body      quad mesh, the carrier for per-week shape keys and the web export.
FET_Body_Hero FET_Body with subdivision for Cycles stills.
FET_MH_rig    (MakeHuman path) the fitted armature, kept for later posing.

    python build_base.py [--sdf]    # bpy as a module (pip install bpy==5.2.2)
    blender -b -P build_base.py     # or inside Blender 5.2
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy
from fge import lookdev

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "fetal_master.blend"
GRID_VOXEL = 0.0006
REMESH_VOXEL = 0.0008


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    fetus = lookdev.collection("FETUS")
    if "--sdf" in sys.argv:
        from fge import meshing
        from fge.body import build_w24

        base, hero = meshing.build_body_meshes(build_w24(), grid_voxel=GRID_VOXEL, remesh_voxel=REMESH_VOXEL, collection=fetus)
    else:
        from fge import mhbody

        base, hero, _ = mhbody.build(collection=fetus)
    base["fge_week"] = 24
    hero["fge_week"] = 24
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER), compress=True)
    print(f"[fge] saved {MASTER} ({len(base.data.vertices)} base / {len(hero.data.vertices)} hero verts)")


if __name__ == "__main__":
    main()
