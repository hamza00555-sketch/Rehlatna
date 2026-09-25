"""Render hero stills from fetal_master.blend and finish them (post.py).

Writes renders/render_W{week}.png (1080×1920, finished) and, for the
look-dev checkpoint, renders/lookdev_W24_vs_reference.jpg and
renders/outline_W24.jpg (render with the reference outline on top).

    python render_stages.py --week 24 --samples 256
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter, ImageFont  # noqa: E402

import post  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "fetal_master.blend"
RENDERS = ROOT / "renders"
REFERENCE = ROOT.parent / "reference" / "north-star.webp"
REFERENCE_MASK = ROOT / "lookdev" / "reference_mask.png"


def side_by_side(render_png: Path, out: Path) -> None:
    ours = Image.open(render_png).convert("RGB")
    ref = Image.open(REFERENCE).convert("RGB").resize(ours.size, Image.LANCZOS)
    pad, label_h = 24, 72
    sheet = Image.new("RGB", (ours.width * 2 + pad * 3, ours.height + pad * 2 + label_h), (18, 24, 25))
    sheet.paste(ours, (pad, pad + label_h))
    sheet.paste(ref, (ours.width + pad * 2, pad + label_h))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 34)
    except OSError:
        font = ImageFont.load_default()
    draw.text((pad, pad + 10), "Blender / Cycles · week 24", fill=(220, 232, 232), font=font)
    draw.text((ours.width + pad * 2, pad + 10), "North-star reference", fill=(220, 232, 232), font=font)
    sheet.save(out, quality=92)


def outline_check(render_png: Path, out: Path) -> None:
    """The render with the reference fetus outline (fit_reference_mask.py) drawn
    on top, cropped to the body: a quick read of where the silhouettes differ."""
    mask = Image.open(REFERENCE_MASK).convert("L")
    ours = Image.open(render_png).convert("RGB").resize(mask.size, Image.LANCZOS)
    edge = mask.filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v > 60 else 0).filter(ImageFilter.MaxFilter(3))
    ours.paste((255, 40, 40), (0, 0), edge)
    x0, y0, x1, y1 = mask.getbbox()
    pad = 60
    ours.crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad)).save(out, quality=92)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--week", type=int, default=24)
    ap.add_argument("--samples", type=int, default=256)
    ap.add_argument("--percent", type=int, default=100)
    ap.add_argument("--keep-raw", action="store_true", help="keep the unfinished Cycles pass (for grading tests)")
    args = ap.parse_args()
    RENDERS.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(MASTER))
    scene = bpy.context.scene
    scene.cycles.samples = args.samples
    scene.render.resolution_percentage = args.percent
    raw = RENDERS / f"raw_W{args.week:02d}.png"
    scene.render.filepath = str(raw)
    bpy.ops.render.render(write_still=True)
    final = RENDERS / f"render_W{args.week:02d}.png"
    post.save(post.finish(post.load_png(raw)), final)
    if not args.keep_raw:
        raw.unlink()
    print(f"[fge] wrote {final}")
    if args.week == 24:
        side_by_side(final, RENDERS / "lookdev_W24_vs_reference.jpg")
        outline_check(final, RENDERS / "outline_W24.jpg")
        print("[fge] wrote lookdev_W24_vs_reference.jpg, outline_W24.jpg")


if __name__ == "__main__":
    main()
