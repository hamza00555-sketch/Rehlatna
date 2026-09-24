"""Hero-still finishing: backdrop, haze, bloom, grade, grain.

The Cycles pass is rendered on a transparent film; this composites it over
the fitted backdrop gradient and applies the grade from the brief: low
contrast, lifted blacks, desaturated teal ambient, warm skin kept warm,
rim-only bloom and very light grain. Pure NumPy/SciPy so the numbers are
easy to mirror in the real-time post chain.

    python post.py renders/raw_W24.png renders/render_W24.png
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT = Path(__file__).resolve().parents[2]
BACKGROUND = ROOT / "blender" / "lookdev" / "background.json"

LOOK = {
    "haze": 0.04,  # subject veiled toward the backdrop
    "bloom_threshold": 0.72,
    "bloom_sigma": 0.018,  # fraction of image height
    "bloom_strength": 0.35,
    "lift": 0.03,  # black lift toward the teal shadow tint
    "shadow_tint": (0.30, 0.40, 0.41),
    "contrast": 1.0,
    "saturation": 0.95,
    "grain": 0.010,
}


def load_png(path) -> np.ndarray:
    im = Image.open(path)
    a = np.asarray(im).astype(np.float64)
    return a / (65535.0 if a.max() > 255 else 255.0)


def background(width: int, height: int) -> np.ndarray:
    spec = json.loads(BACKGROUND.read_text())
    deg = spec["degree"]
    v, u = np.mgrid[0:height, 0:width]
    u = (u + 0.5) / width
    v = (v + 0.5) / height
    T = np.stack([u**i * v**j for i in range(deg + 1) for j in range(deg + 1 - i)], axis=-1)
    return np.clip(np.stack([T @ np.array(c) for c in spec["coefficients"]], axis=-1), 0.0, 1.0)


def finish(rgba: np.ndarray, look=LOOK, seed: int = 1) -> np.ndarray:
    h, w, _ = rgba.shape
    fg, alpha = rgba[..., :3], rgba[..., 3:4]
    bg = background(w, h)
    out = fg * alpha + bg * (1.0 - alpha)
    out = out * (1.0 - look["haze"] * alpha) + bg * (look["haze"] * alpha)

    lum = out @ np.array([0.2126, 0.7152, 0.0722])
    bright = np.clip(lum - look["bloom_threshold"], 0.0, None)[..., None] * out
    sigma = look["bloom_sigma"] * h
    bloom = np.stack([gaussian_filter(bright[..., c], sigma) for c in range(3)], axis=-1)
    out = out + bloom * look["bloom_strength"]

    mid = 0.5
    out = (out - mid) * look["contrast"] + mid
    grey = (out @ np.array([0.2126, 0.7152, 0.0722]))[..., None]
    out = grey + (out - grey) * look["saturation"]
    tint = np.array(look["shadow_tint"])
    out = out * (1.0 - look["lift"]) + tint * look["lift"]

    rng = np.random.default_rng(seed)
    noise = rng.normal(0.0, look["grain"], size=(h, w, 1))
    out = out + noise * (0.6 + 0.4 * (1.0 - grey))
    return np.clip(out, 0.0, 1.0)


def save(img: np.ndarray, path) -> None:
    Image.fromarray((img * 255.0 + 0.5).astype(np.uint8)).save(path)


def main(src: str, dst: str) -> None:
    save(finish(load_png(src)), dst)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
