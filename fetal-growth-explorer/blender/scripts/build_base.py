"""Build the week-24 base fetus and save blender/fetal_master.blend.

FET_Body      even quad mesh (voxel remesh of the implicit surface), the
              carrier for per-week shape keys and the web export.
FET_Body_Hero FET_Body subdivided once and re-projected onto the exact
              surface: sub-millimetre detail for Cycles stills.

    python build_base.py            # bpy as a module (pip install bpy==5.2.2)
    blender -b -P build_base.py     # or inside Blender 5.2
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402

from fge import lookdev, meshing  # noqa: E402
from fge.body import build_w24  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "fetal_master.blend"
GRID_VOXEL = 0.0006
REMESH_VOXEL = 0.0008


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    fetus = lookdev.collection("FETUS")
    base, hero = meshing.build_body_meshes(build_w24(), grid_voxel=GRID_VOXEL, remesh_voxel=REMESH_VOXEL, collection=fetus)
    base["fge_week"] = 24
    hero["fge_week"] = 24
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER), compress=True)
    print(f"[fge] saved {MASTER} ({len(base.data.vertices)} base / {len(hero.data.vertices)} hero verts)")


if __name__ == "__main__":
    main()
