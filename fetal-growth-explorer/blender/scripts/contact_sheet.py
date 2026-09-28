"""Contact sheet of the stage keys: every week in the week-24 pose and shot,
same on-screen size (proportions only; real size is in the labels).

    python contact_sheet.py   -> renders/stages_contact.jpg
"""

import json
from pathlib import Path

import bpy
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "renders" / "stages_contact.jpg"
TMP = ROOT / "renders" / "_stage_tmp.png"


def main():
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / "fetal_master.blend"))
    sc = bpy.context.scene
    ob = bpy.data.objects["FET_Body"]
    keys = ob.data.shape_keys.key_blocks
    weeks = json.loads(ob["fge_weeks"])
    for c in ("MEMBRANES", "CORD"):
        col = bpy.data.collections.get(c)
        if col:
            for o in col.objects:
                o.hide_render = True
    sc.cycles.samples = 24
    sc.render.resolution_percentage = 30
    sc.render.border_min_x, sc.render.border_max_x = 0.2, 0.85
    sc.render.border_min_y, sc.render.border_max_y = 0.28, 0.72
    sc.render.use_border = True
    sc.render.use_crop_to_border = True
    tiles = []
    for w in sorted(weeks, key=int):
        for k in keys:
            if k.name.startswith("W") and k.name[1:].isdigit():
                k.value = 1.0 if int(k.name[1:]) == int(w) else 0.0
        sc.render.filepath = str(TMP)
        bpy.ops.render.render(write_still=True)
        tiles.append((w, Image.open(TMP).convert("RGB")))
        print(f"[fge] rendered W{w}")
    tw, th = tiles[0][1].size
    cols = 4
    rows = (len(tiles) + cols - 1) // cols
    pad, lab = 10, 46
    sheet = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + lab + pad) + pad), (12, 16, 20))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
    except OSError:
        font = small = ImageFont.load_default()
    for i, (w, im) in enumerate(tiles):
        x = pad + (i % cols) * (tw + pad)
        y = pad + (i // cols) * (th + lab + pad)
        d.text((x + 6, y + 4), f"Week {w}", fill=(230, 238, 236), font=font)
        v = weeks[w]
        d.text((x + 6, y + 27), f"{v['ch_cm']} cm · {v['weight_g']} g", fill=(150, 175, 173), font=small)
        sheet.paste(im, (x, y + lab))
    sheet.save(OUT, quality=90)
    TMP.unlink(missing_ok=True)
    print(f"[fge] wrote {OUT}")


if __name__ == "__main__":
    main()
