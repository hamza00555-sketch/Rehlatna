"""Fit the backdrop gradient to the north-star reference (run once).

Masks out the fetus (traced silhouette), takes a low local percentile so the
veils rendered on top are not counted twice, fills the holes by normalised convolution,
then fits a degree-4 polynomial per sRGB channel over (u, v) in [0, 1].
The coefficients live in blender/lookdev/background.json and are evaluated
by post.py (hero stills) and, later, by the web background shader, so both
share one backdrop.

    python fit_background.py
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "reference" / "north-star.webp"
OUT = ROOT / "blender" / "lookdev" / "background.json"
MASK = ROOT / "blender" / "lookdev" / "reference_mask.png"
DEGREE = 4


def terms(u, v, degree=DEGREE):
    return np.stack([u**i * v**j for i in range(degree + 1) for j in range(degree + 1 - i)], axis=-1)


def main():
    im = Image.open(REF).convert("RGB")
    small = im.resize((112, 200), Image.LANCZOS)
    a = np.asarray(small).astype(float) / 255.0
    warm = a[..., 0] - a[..., 2]
    # Fetus: the traced silhouette (fit_reference_mask.py), grown a little. The
    # dark corners are backdrop and must stay in the fit (an earlier luminance
    # threshold dropped them and the fit came out ~40 levels too bright there).
    body = np.asarray(Image.open(MASK).convert("L").resize((112, 200))) > 127
    subject = body | (warm > 10 / 255)
    mask = ~subject
    # The veils are rendered on top of this plate, so fit the level *under* them:
    # a low local percentile drops the bright veil lines and the pale cord.
    from scipy.ndimage import percentile_filter

    a = np.stack([percentile_filter(a[..., c], 20, size=9) for c in range(3)], -1)
    m_img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))
    mask = np.asarray(m_img) > 127
    num = np.stack([np.asarray(Image.fromarray((a[..., c] * mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))) for c in range(3)], -1).astype(float)
    den = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))).astype(float)
    plate = np.where(mask[..., None], a, num / np.maximum(den[..., None], 1e-3))
    h, w, _ = plate.shape
    v, u = np.mgrid[0:h, 0:w]
    u = (u + 0.5) / w
    v = (v + 0.5) / h
    A = terms(u.ravel(), v.ravel())
    coeffs = [np.linalg.lstsq(A, plate[..., c].ravel(), rcond=None)[0].tolist() for c in range(3)]
    fit = np.stack([A @ np.array(c) for c in coeffs], -1).reshape(h, w, 3)
    err = np.abs(fit - plate)[mask].mean() * 255
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"degree": DEGREE, "space": "sRGB", "uv": "u right, v down, 0..1", "coefficients": coeffs, "mean_abs_error_8bit": round(float(err), 2)}, indent=2))
    print("background fit, mean abs error (8-bit):", round(float(err), 2))


if __name__ == "__main__":
    main()
