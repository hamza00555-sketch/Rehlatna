"""Segment the fetus in the north-star reference (run once).

The skin is warmer than everything else in the frame (R - B > 0 while the
backdrop, membranes and cord sit near or below zero). A strict threshold
finds the body, a looser one near it recovers the cool rim-lit edge. The
mask drives the silhouette fit of the posed body (fge.mhbody).

    python fit_reference_mask.py
"""

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "reference" / "north-star.webp"
OUT = ROOT / "blender" / "lookdev" / "reference_mask.png"


def largest(mask):
    lab, n = nd.label(mask)
    sizes = nd.sum(mask, lab, range(1, n + 1))
    return lab == (np.argmax(sizes) + 1)


def main():
    im = np.asarray(Image.open(REF).convert("RGB")).astype(float)
    warm = im[..., 0] - im[..., 2]
    core = largest(nd.binary_opening(warm > 12, iterations=2))
    core = nd.binary_fill_holes(nd.binary_closing(core, iterations=4))
    mask = (warm > -7) & nd.binary_dilation(core, iterations=22)
    mask = largest(nd.binary_opening(mask, iterations=3))
    mask = nd.binary_fill_holes(nd.binary_closing(mask, iterations=3))
    Image.fromarray((mask * 255).astype(np.uint8)).save(OUT)
    print(f"[fge] wrote {OUT} ({mask.mean():.1%} of frame)")


if __name__ == "__main__":
    main()
