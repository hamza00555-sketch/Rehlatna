"""Add the look to fetal_master.blend: skin, cord, membranes, particles,
lights, hero camera, world and render settings. Re-runnable: it clears
what it created before rebuilding.

    python lookdev.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402

from fge import lookdev  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "fetal_master.blend"
OWNED = ("CORD", "MEMBRANES", "LIGHTS", "CAMERAS", "ENVIRONMENT")


def clear_lookdev():
    for name in OWNED:
        col = bpy.data.collections.get(name)
        if col is None:
            continue
        for ob in list(col.objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        bpy.data.collections.remove(col)
    for mat in list(bpy.data.materials):
        if mat.name.startswith("MAT_"):
            bpy.data.materials.remove(mat)


def main():
    bpy.ops.wm.open_mainfile(filepath=str(MASTER))
    clear_lookdev()
    scene = bpy.context.scene
    lookdev.make_world(scene)
    lookdev.setup_render(scene)
    base, hero = bpy.data.objects["FET_Body"], bpy.data.objects["FET_Body_Hero"]
    skin = lookdev.skin_material()
    for ob in (base, hero):
        ob.data.materials.clear()
        ob.data.materials.append(skin)
    base.hide_render = True
    base.hide_viewport = True
    lookdev.make_cord(lookdev.cord_material())
    lookdev.make_membranes(lookdev.membrane_material())
    lookdev.make_particles(lookdev.particle_material())
    lookdev.make_lights()
    lookdev.make_camera(scene)
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER), compress=True)
    print(f"[fge] look-dev applied to {MASTER}")


if __name__ == "__main__":
    main()
