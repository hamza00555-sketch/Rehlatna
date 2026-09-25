"""Calibrate the backdrop against the reference through the finished render.

The fetus hides the core of the reference's luminous backdrop, so the plate
fitted by fit_background.py cannot recover it. This compares the finished
week-24 render with the reference outside the fetus (low-pass, 279x500),
fits elliptical Gaussians plus a constant to the remaining difference and
stores them in background.json ("corrections"), which post.py adds to the
plate. Re-run render_stages.py afterwards; two passes converge.

    python calibrate_backdrop.py
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[1]
BG = ROOT / "lookdev" / "background.json"
RENDER = ROOT / "renders" / "render_W24.png"
REF = ROOT.parent / "reference" / "north-star.webp"
MASK = ROOT / "lookdev" / "reference_mask.png"
SIZE = (279, 500)
GAIN = 1.0 / 0.97  # post's grade maps plate changes to output at ~0.97


def gaussian(u, v, uc, vc, su, sv):
    return np.exp(-0.5 * (((u - uc) / su) ** 2 + ((v - vc) / sv) ** 2))


def main(terms: int = 2):
    ours = np.asarray(Image.open(RENDER).convert("RGB").resize(SIZE, Image.LANCZOS)).astype(float) / 255
    ref = np.asarray(Image.open(REF).convert("RGB").resize(SIZE, Image.LANCZOS)).astype(float) / 255
    body = nd.binary_dilation(np.asarray(Image.open(MASK).convert("L").resize(SIZE)) > 127, iterations=5)
    d = np.stack([nd.gaussian_filter(ref[..., c] - ours[..., c], 4) for c in range(3)], -1) * GAIN
    h, w = body.shape
    v, u = np.mgrid[0:h, 0:w]
    u, v = (u + 0.5) / w, (v + 0.5) / h
    sel = ~body
    spec = json.loads(BG.read_text())
    corr = spec.get("corrections", [])
    for _ in range(terms):
        best = None
        for uc in np.linspace(0.2, 0.8, 13):
            for vc in np.linspace(0.2, 0.8, 13):
                for su in (0.08, 0.12, 0.18, 0.26):
                    for sv in (0.05, 0.08, 0.12, 0.18):
                        g = gaussian(u, v, uc, vc, su, sv)[sel]
                        A = np.c_[g, np.ones_like(g)]
                        err, amps = 0.0, []
                        for c in range(3):
                            x = np.linalg.lstsq(A, d[..., c][sel], rcond=None)[0]
                            amps.append(x)
                            err += float(np.sum((A @ x - d[..., c][sel]) ** 2))
                        if best is None or err < best[0]:
                            best = (err, (uc, vc, su, sv), amps)
        _, (uc, vc, su, sv), amps = best
        g = gaussian(u, v, uc, vc, su, sv)
        for c in range(3):
            d[..., c] -= amps[c][0] * g + amps[c][1]
        corr.append({"centre": [uc, vc], "sigma": [su, sv], "amplitude": [a[0] for a in amps], "offset": [a[1] for a in amps]})
        print(f"[fge] correction at ({uc:.2f}, {vc:.2f}) sigma ({su:.2f}, {sv:.2f}) amp {np.round(np.array([a[0] for a in amps]) * 255, 1)} offset {np.round(np.array([a[1] for a in amps]) * 255, 1)}")
    print(f"[fge] residual outside the fetus: {np.abs(d[sel]).mean() * 255:.2f} levels")
    spec["corrections"] = corr
    BG.write_text(json.dumps(spec, indent=2))


if __name__ == "__main__":
    main()
