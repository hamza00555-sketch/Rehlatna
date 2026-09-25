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
    base = bpy.data.objects["FET_Body"]
    hero = bpy.data.objects.get("FET_Body_Hero")  # SDF build only; the rigged body subdivides itself
    skin = lookdev.skin_material()
    for ob in (base, hero):
        if ob is None:
            continue
        ob.data.materials.clear()
        ob.data.materials.append(skin)
        ob.data.use_auto_texspace = False  # rest coordinates for the skin textures (see lookdev._rest_coords)
        ob.data.texspace_location = (0.0, 0.0, 0.0)
        ob.data.texspace_size = (1.0, 1.0, 1.0)
    if hero is not None:
        base.hide_render = True
        base.hide_viewport = True
    path = lookdev.CORD_PATH
    if "fge_navel" in base:
        path = lookdev.attach_cord(path, base["fge_navel"], base["fge_navel_normal"])
    lookdev.make_cord(lookdev.cord_material(), path=path)
    traced = ROOT / "lookdev" / "reference_veils.json"
    if traced.exists():  # the reference's own membrane lines (fit_reference_veils.py) + soft sheets
        # soft milky silk well behind (no rims), then the reference's own fold lines on top
        lookdev.make_membranes(lookdev.membrane_material(opacity=0.35, hem=0.0, haze=0.12))
        veil = lookdev.membrane_material("MAT_Veil_Traced", one_sided=True, fade_ends=True, haze=0.14, hem=1.0, hem_band=(0.955, 0.985), strength=3.5)
        lookdev.make_traced_veils(veil, traced, film=0.10)
    else:
        lookdev.make_membranes(lookdev.membrane_material(), specs=lookdev.MEMBRANE_RINGS + lookdev.MEMBRANE_SPECS)
    lookdev.make_particles(lookdev.particle_material())
    lookdev.make_lights()
    lookdev.make_camera(scene)
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER), compress=True)
    print(f"[fge] look-dev applied to {MASTER}")


if __name__ == "__main__":
    main()
