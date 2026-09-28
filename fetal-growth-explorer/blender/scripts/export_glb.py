"""Export the rigged week-24 fetus (body + rig + pose action + cord) to GLB for the web app.

    python export_glb.py            -> blender/exports/fetus_W24.glb
"""

from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "fetal_master.blend"
OUT = ROOT / "exports" / "fetus_W24.glb"


def main():
    bpy.ops.wm.open_mainfile(filepath=str(MASTER))
    body = bpy.data.objects["FET_Body"]
    rig = bpy.data.objects["FET_Rig"]
    cord = next((o for o in bpy.data.objects if o.name.startswith("FET_Cord") and o.type == "MESH"), None)
    # web mesh: no render-time subdivision (three.js smooths normals itself)
    for m in body.modifiers:
        if m.type == "SUBSURF":
            m.show_viewport = False
    bpy.ops.object.select_all(action="DESELECT")
    for ob in (body, rig, cord):
        if ob is not None:
            ob.hide_set(False)
            ob.select_set(True)
    bpy.context.view_layer.objects.active = rig
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_skins=True,
        export_animations=True,
        export_morph=True,
        export_morph_normal=False,
        export_morph_tangent=False,
        export_yup=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_image_format="AUTO",
    )
    print(f"[fge] wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
