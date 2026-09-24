"""The face as smooth displacement over a blank head.

Features are Gaussian bumps and grooves in a face-aligned frame, so the
transitions stay soft (no seams where primitives meet) and each feature is a
handful of numbers: amplitude (outward, metres), centre and widths. The
midline amplitudes were fitted to the reference profile. Later weeks scale
these (baby-fat cheeks, fuller lips); early weeks flatten them.

Face frame: origin at the nasion on the surface, x out of the face (the
face looks down-right), z up the face, y lateral (negative = near side).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .sdf import normalize

FACE_OUT = normalize((0.78, 0.0, -0.62))
FACE_UP = normalize((0.62, 0.0, 0.78))
NASION = np.array([0.0200, 0.0, 0.0402])


@dataclass
class Bump:
    amp: float
    y: float
    z: float
    sy: float
    sz: float
    mirror: bool = False


@dataclass
class Groove:
    """A thin line: depth `amp` (negative), along z = z0 + bend * ((y - y0) / half)^2, |y - y0| < half."""

    amp: float
    y0: float
    z0: float
    half: float
    bend: float
    width: float
    mirror: bool = False


@dataclass
class FaceParams:
    bumps: dict = field(default_factory=lambda: {
        "nose_bridge": Bump(0.0006, 0.0, -0.0035, 0.0035, 0.0045),
        "nose_tip": Bump(0.0038, 0.0, -0.0098, 0.0040, 0.0034),
        "nose_ala": Bump(0.0012, 0.0050, -0.0122, 0.0022, 0.0020, mirror=True),
        "nostril": Bump(-0.0007, 0.0030, -0.0133, 0.0012, 0.0010, mirror=True),
        "upper_lip": Bump(0.0025, 0.0, -0.0172, 0.0066, 0.0020),
        "lower_lip": Bump(0.0024, 0.0, -0.0215, 0.0056, 0.0019),
        "mentolabial": Bump(-0.0008, 0.0, -0.0248, 0.0060, 0.0018),
        "chin": Bump(0.0004, 0.0, -0.0301, 0.0068, 0.0032),
        "cheek": Bump(0.0040, 0.0152, -0.0105, 0.0068, 0.0082, mirror=True),
        "brow": Bump(0.0008, 0.0110, 0.0055, 0.0065, 0.0022, mirror=True),
        "orbit": Bump(-0.0017, 0.0125, 0.0006, 0.0068, 0.0050, mirror=True),
        "lid": Bump(0.0028, 0.0126, -0.0002, 0.0054, 0.0030, mirror=True),
    })
    grooves: dict = field(default_factory=lambda: {
        "mouth": Groove(-0.00110, 0.0, -0.0194, 0.0094, 0.0004, 0.00050),
        "lid_crease": Groove(-0.00085, 0.0126, -0.0008, 0.0062, -0.0012, 0.00052, mirror=True),
        "under_eye": Groove(-0.00030, 0.0130, -0.0052, 0.0060, 0.0008, 0.00120, mirror=True),
    })


def face_coords(P: np.ndarray):
    rel = P - NASION
    return rel @ FACE_OUT, P[:, 1], rel @ FACE_UP


def _window(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    t = np.clip((x - lo) / (hi - lo), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def face_field(params: FaceParams | None = None):
    params = params or FaceParams()

    def D(P: np.ndarray) -> np.ndarray:
        xf, yf, zf = face_coords(P)
        # Only the front of the head is displaced.
        w = _window(xf, -0.030, -0.014)
        out = np.zeros(len(P))
        for b in params.bumps.values():
            for sgn in ((-1.0, 1.0) if b.mirror else (1.0,)):
                out += b.amp * np.exp(-0.5 * (((yf - sgn * b.y) / b.sy) ** 2 + ((zf - b.z) / b.sz) ** 2))
        for g in params.grooves.values():
            for sgn in ((-1.0, 1.0) if g.mirror else (1.0,)):
                u = (yf - sgn * g.y0) / g.half
                zc = g.z0 + g.bend * u * u
                along = np.exp(-(u**6))
                out += g.amp * along * np.exp(-0.5 * ((zf - zc) / g.width) ** 2)
        return out * w

    return D
