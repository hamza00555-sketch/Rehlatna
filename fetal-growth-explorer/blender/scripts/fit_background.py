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

    a = np.stack([percentile_filter(a[..., c], 20, size=5) for c in range(3)], -1)
    from scipy.ndimage import binary_dilation

    mask = ~binary_dilation(subject, iterations=2)
    h, w, _ = a.shape
    v, u = np.mgrid[0:h, 0:w]
    u = ((u + 0.5) / w).ravel()
    v = ((v + 0.5) / h).ravel()
    sel = mask.ravel()
    P = terms(u, v)
    # the luminous halo behind the fetus: an elliptical Gaussian on top of the
    # smooth gradient, its centre and size found by grid search (weighted least
    # squares on backdrop pixels only; the fetus hides the halo's core)
    best = None
    for uc in np.linspace(0.35, 0.65, 7):
        for vc in np.linspace(0.40, 0.65, 6):
            for su in (0.15, 0.22, 0.30):
                for sv in (0.10, 0.15, 0.22):
                    g = np.exp(-0.5 * (((u - uc) / su) ** 2 + ((v - vc) / sv) ** 2))
                    A = np.c_[P, g]
                    err = 0.0
                    cs = []
                    for c in range(3):
                        x, res, *_ = np.linalg.lstsq(A[sel], a[..., c].ravel()[sel], rcond=None)
                        cs.append(x)
                        err += float(np.sum((A[sel] @ x - a[..., c].ravel()[sel]) ** 2))
                    if best is None or err < best[0]:
                        best = (err, (uc, vc, su, sv), cs)
    _, halo, cs = best
    coeffs = [c[:-1].tolist() for c in cs]
    amp = [float(c[-1]) for c in cs]
    g = np.exp(-0.5 * (((u - halo[0]) / halo[2]) ** 2 + ((v - halo[1]) / halo[3]) ** 2))
    fit = np.stack([np.c_[P, g] @ c for c in cs], -1)
    err = np.abs(fit[sel] - a.reshape(-1, 3)[sel]).mean() * 255
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"degree": DEGREE, "space": "sRGB", "uv": "u right, v down, 0..1", "coefficients": coeffs,
                               "halo": {"centre": [halo[0], halo[1]], "sigma": [halo[2], halo[3]], "amplitude": amp},
                               "mean_abs_error_8bit": round(float(err), 2)}, indent=2))
    print("background fit, mean abs error (8-bit):", round(float(err), 2), "halo", np.round(halo, 2), np.round(np.array(amp) * 255, 1))


if __name__ == "__main__":
    main()
