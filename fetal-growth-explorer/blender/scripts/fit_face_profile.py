"""Fit the face block and midline feature amplitudes to the reference profile.

1. Extracts the face silhouette from reference/north-star.webp (rightmost
   skin pixel per row, brow to under-chin) and maps it to metres.
2. Fits the face block's placement/radii and the nose, lip, mentolabial and
   chin amplitudes with bounded least squares against the model's
   silhouette (continuous, from the signed distance along X).
3. Prints the values to copy into fge/body.py (face_block) and fge/face.py.

    python fit_face_profile.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
from scipy.optimize import least_squares  # noqa: E402

from fge import body  # noqa: E402
from fge.face import FACE_OUT, FACE_UP, NASION, FaceParams, face_field  # noqa: E402
from fge.sdf import Displaced, Ellipsoid, Group, RoundCone, rot_y  # noqa: E402

REFERENCE = Path(__file__).resolve().parents[2] / "reference" / "north-star.webp"
FRAME_H, FRAME_W = 0.50, 0.279  # metres at the subject plane


def reference_profile(z_values):
    im = np.asarray(Image.open(REFERENCE).convert("RGB")).astype(float)
    h, w, _ = im.shape
    skin = ((im[..., 0] - im[..., 2]) > 10) | (im.mean(-1) < 125)
    out = []
    for z in z_values:
        row = int(round(h * (0.5 - z / FRAME_H)))
        x0, x1 = int(w * 0.40), int(w * 0.70)
        hits = np.nonzero(skin[row, x0:x1])[0]
        xp = (x0 + hits[-1]) / w if len(hits) else np.nan
        out.append((xp - 0.5) * FRAME_W)
    return np.array(out)


XS = np.arange(-0.012, 0.040, 0.00025)
YS = np.arange(-0.02, 0.0201, 0.001)
GX, GY = np.meshgrid(XS, YS, indexing="ij")


def model_silhouette(shape, z):
    P = np.stack([GX.ravel(), GY.ravel(), np.full(GX.size, z)], 1)
    d = shape.dist(P).reshape(GX.shape)
    best = np.nan
    for j in range(d.shape[1]):
        col = d[:, j]
        neg = np.nonzero(col < 0)[0]
        if len(neg) == 0 or neg[-1] + 1 >= len(col):
            continue
        i = neg[-1]
        x = XS[i] + (XS[i + 1] - XS[i]) * (col[i] / (col[i] - col[i + 1]))
        best = x if np.isnan(best) else max(best, x)
    return best


NAMES = ["depth", "up", "rx", "rz", "k_block", "nose_amp", "nose_z", "upper_lip", "lower_lip", "chin_amp", "chin_z", "mentolabial"]
P0 = np.array([-0.0079, -0.0145, 0.0124, 0.0220, 0.012, 0.0026, -0.0100, 0.0016, 0.0016, 0.0012, -0.0285, -0.0006])
LO = np.array([-0.020, -0.022, 0.008, 0.014, 0.004, 0.0010, -0.0130, 0.0004, 0.0004, 0.0000, -0.0320, -0.0015])
HI = np.array([-0.002, -0.008, 0.018, 0.028, 0.016, 0.0045, -0.0080, 0.0030, 0.0030, 0.0030, -0.0240, 0.0000])


def head_for(p):
    V, Y = body.V, np.array([0.0, 1.0, 0.0])
    fp = FaceParams()
    fp.bumps["nose_tip"].amp, fp.bumps["nose_tip"].z = p[5], p[6]
    fp.bumps["upper_lip"].amp, fp.bumps["lower_lip"].amp = p[7], p[8]
    fp.bumps["chin"].amp, fp.bumps["chin"].z, fp.bumps["mentolabial"].amp = p[9], p[10], p[11]
    blank = Group("head_blank", k=0.004)
    blank.add(Ellipsoid(V(-0.0043, 0.0, 0.0705), (0.0399, 0.0320, 0.0374), rot_y(9.6)))
    blank.add(Ellipsoid(V(-0.0090, 0.0, 0.0375), (0.0180, 0.0270, 0.0160), rot_y(-8.0)), k=0.016)
    blank.add(Ellipsoid(NASION + p[0] * FACE_OUT + p[1] * FACE_UP, (p[2], 0.0200, p[3]), np.stack([FACE_OUT, Y, FACE_UP], axis=1)), k=p[4])
    for s in (-1.0, 1.0):
        blank.add(Ellipsoid(V(-0.0080, s * 0.0200, 0.0480), (0.0120, 0.0100, 0.0110)), k=0.016)
        blank.add(RoundCone(V(-0.0005, s * 0.0085, 0.0200), V(-0.0215, s * 0.0215, 0.0420), 0.0040, 0.0055), k=0.012)
    return Displaced(blank, face_field(fp), 0.004)


def main():
    zs = np.arange(0.0475, 0.0149, -0.0025)
    ref = reference_profile(zs)

    def residuals(p):
        sh = head_for(p)
        r = (np.array([model_silhouette(sh, z) for z in zs]) - ref) * 1000.0
        return np.concatenate([np.nan_to_num(r, nan=10.0), (p - P0) / (HI - LO) * 2.0])

    sol = least_squares(residuals, P0, bounds=(LO, HI), diff_step=0.02, max_nfev=120)
    rms = float(np.sqrt(np.mean(residuals(sol.x)[: len(zs)] ** 2)))
    print(f"profile fit: {rms:.2f} mm RMS over {len(zs)} rows")
    for n, v in zip(NAMES, sol.x):
        print(f"  {n:12s} {v:+.4f}")


if __name__ == "__main__":
    main()
