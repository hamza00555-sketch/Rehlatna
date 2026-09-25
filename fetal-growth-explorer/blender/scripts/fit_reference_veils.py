"""Trace the bright membrane lines of the north-star reference (run once).

The veils in the reference read as thin bright lines (fold edges seen
edge-on). They are the local luminance ridges: a difference-of-Gaussians
response, thresholded, thinned to one-pixel skeletons and walked into
polylines. The fetus and cord are masked out. Polylines are written in
reference pixels to blender/lookdev/reference_veils.json; lookdev builds a
thin camera-facing ribbon along each, back-projected onto a depth plane
behind the fetus, so the membranes follow the painting's folds.

    python fit_reference_veils.py
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd
from skimage.morphology import skeletonize

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fge.camera import HERO, project_points  # noqa: E402

CORD_PATH = None  # filled in main() (fge.lookdev imports bpy)

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "reference" / "north-star.webp"
MASK = ROOT / "blender" / "lookdev" / "reference_mask.png"
OUT = ROOT / "blender" / "lookdev" / "reference_veils.json"
MIN_LEN = 60  # px per traced piece before linking (reference is 1116 x 2000)


def trace(skel: np.ndarray) -> list[list[tuple[int, int]]]:
    """Walk a one-pixel skeleton into polylines, splitting at junctions."""
    nb = nd.convolve(skel.astype(int), np.ones((3, 3), int), mode="constant") - 1
    pts = skel & (nb <= 2)  # drop junction pixels so every component is a simple path
    lab, n = nd.label(pts, structure=np.ones((3, 3)))
    lines = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < MIN_LEN:
            continue
        pix = set(zip(ys.tolist(), xs.tolist()))
        deg = {p: sum((p[0] + dy, p[1] + dx) in pix for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx) for p in pix}
        start = min(pix, key=lambda p: (deg[p], p))
        path, seen, cur = [start], {start}, start
        while True:
            nxt = [(cur[0] + dy, cur[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (cur[0] + dy, cur[1] + dx) in pix and (cur[0] + dy, cur[1] + dx) not in seen]
            if not nxt:
                break
            cur = nxt[0]
            seen.add(cur)
            path.append(cur)
        if len(path) >= MIN_LEN:
            lines.append([(int(x), int(y)) for y, x in path[::6]])  # (u, v), every 6th pixel
    return lines


def link(lines, max_gap=70.0, max_turn=40.0, min_total=180.0):
    """Greedily join polylines whose ends meet (gap < max_gap px) and continue in
    the same direction (turn < max_turn deg): the thresholded ridges break
    where a fold fades, but the painted line runs on."""
    L = [np.asarray(l, float) for l in lines]

    def end_dir(a, tail):
        seg = a[-4:] if tail else a[:4][::-1]
        d = seg[-1] - seg[0]
        return d / max(np.linalg.norm(d), 1e-9)

    merged = True
    while merged:
        merged = False
        best = None
        for i in range(len(L)):
            for j in range(len(L)):
                if i == j:
                    continue
                for ri in (False, True):
                    for rj in (False, True):
                        a = L[i][::-1] if ri else L[i]
                        b = L[j][::-1] if rj else L[j]
                        gap = np.linalg.norm(b[0] - a[-1])
                        if gap > max_gap:
                            continue
                        da, db = end_dir(a, True), -end_dir(b, False)
                        bridge = (b[0] - a[-1]) / max(gap, 1e-9)
                        turn = max(np.degrees(np.arccos(np.clip(da @ db, -1, 1))), np.degrees(np.arccos(np.clip(da @ bridge, -1, 1))) if gap > 5 else 0)
                        if turn < max_turn and (best is None or gap < best[0]):
                            best = (gap, i, j, ri, rj)
        if best:
            _, i, j, ri, rj = best
            a = L[i][::-1] if ri else L[i]
            b = L[j][::-1] if rj else L[j]
            L[i] = np.vstack([a, b])
            del L[j]
            merged = True
    length = lambda a: float(np.sum(np.linalg.norm(np.diff(a, axis=0), axis=1)))  # noqa: E731
    return [[(int(x), int(y)) for x, y in a] for a in L if length(a) >= min_total]


def main():
    global CORD_PATH
    import ast

    src = (Path(__file__).resolve().parent / "fge" / "lookdev.py").read_text()
    CORD_PATH = ast.literal_eval(src.split("CORD_PATH = ")[1].split("\n]\n")[0] + "\n]")
    im = np.asarray(Image.open(REF).convert("RGB")).astype(float)
    L = im.mean(-1)
    dog = nd.gaussian_filter(L, 2.0) - nd.gaussian_filter(L, 9.0)
    body = nd.binary_dilation(np.asarray(Image.open(MASK).convert("L")) > 127, iterations=25)
    # the cord: its drawn path (fge.lookdev.CORD_PATH follows the reference cord), widened
    cord = np.zeros_like(body)
    uv, _ = project_points(np.array(CORD_PATH), HERO, (im.shape[1], im.shape[0]))
    for (u0, v0), (u1, v1) in zip(uv[:-1], uv[1:]):
        for t in np.linspace(0, 1, 40):
            x, y = int(u0 + (u1 - u0) * t), int(v0 + (v1 - v0) * t)
            if 0 <= y < cord.shape[0] and 0 <= x < cord.shape[1]:
                cord[y, x] = True
    cord = nd.binary_dilation(cord, iterations=45)
    ridges = (dog > 1.8) & ~body & ~cord
    ridges = nd.binary_closing(ridges, structure=np.ones((3, 3)), iterations=2)  # bridge small gaps
    ridges = nd.binary_opening(ridges, structure=np.ones((2, 2)))
    lines = link(trace(skeletonize(ridges)))
    OUT.write_text(json.dumps({"frame": [im.shape[1], im.shape[0]], "polylines": lines}))
    print(f"[fge] traced {len(lines)} veil lines -> {OUT}")


if __name__ == "__main__":
    main()
