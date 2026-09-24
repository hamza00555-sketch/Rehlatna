"""Signed-distance primitives and smooth CSG, vectorised with NumPy.

The fetus is authored as an implicit surface: a tree of primitives joined
with smooth unions. Evaluating it is pure NumPy (no bpy), so the same code
drives meshing on a grid, projecting an existing mesh onto the surface (fine
detail, later the per-week shape keys) and quick silhouette checks.

Conventions: points are (N, 3) float arrays in metres; a rotation `R` is a
3x3 matrix whose columns are the primitive's local axes in world space, so
local coordinates are `(P - c) @ R`.
"""

from __future__ import annotations

import numpy as np

# Stand-in for "no surface nearby". Finite so smooth-min never sees inf - inf.
FAR = 1.0e3


def normalize(v) -> np.ndarray:
    v = np.asarray(v, dtype=float)
    return v / np.linalg.norm(v)


def frame(primary, hint=(0.0, 1.0, 0.0)) -> np.ndarray:
    """Orthonormal frame: column 0 follows `primary`, column 1 is as close to `hint` as possible."""
    x = normalize(primary)
    h = np.asarray(hint, dtype=float)
    y = h - x * np.dot(h, x)
    if np.linalg.norm(y) < 1e-6:
        y = np.cross(x, (0.0, 0.0, 1.0)) if abs(x[2]) < 0.9 else np.cross(x, (1.0, 0.0, 0.0))
    y = normalize(y)
    z = np.cross(x, y)
    return np.stack([x, y, z], axis=1)


def rot_y(deg: float) -> np.ndarray:
    """Rotation about world Y (the camera axis). Positive tilts +X toward +Z."""
    a = np.radians(deg)
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0.0, -s], [0.0, 1.0, 0.0], [s, 0.0, c]])


def smin(a: np.ndarray, b: np.ndarray, k: float) -> np.ndarray:
    """Polynomial smooth minimum; k is the blend radius in metres."""
    if k <= 0.0:
        return np.minimum(a, b)
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.minimum(a, b) - h * h * k * 0.25


def smax(a: np.ndarray, b: np.ndarray, k: float) -> np.ndarray:
    return -smin(-a, -b, k)


class Shape:
    name = ""

    def bounds(self) -> tuple[np.ndarray, np.ndarray]:
        raise NotImplementedError

    def dist(self, P: np.ndarray) -> np.ndarray:
        raise NotImplementedError


class Ellipsoid(Shape):
    """Ellipsoid with semi-axes `r` along the columns of `R` (Quilez's bound)."""

    def __init__(self, c, r, R=None, name=""):
        self.c = np.asarray(c, dtype=float)
        self.r = np.asarray(r, dtype=float)
        self.R = np.eye(3) if R is None else np.asarray(R, dtype=float)
        self.name = name

    def bounds(self):
        ext = np.abs(self.R) @ self.r
        return self.c - ext, self.c + ext

    def dist(self, P):
        q = (P - self.c) @ self.R
        k0 = np.linalg.norm(q / self.r, axis=1)
        k1 = np.linalg.norm(q / (self.r * self.r), axis=1)
        return k0 * (k0 - 1.0) / np.maximum(k1, 1e-12)


class Sphere(Shape):
    def __init__(self, c, r, name=""):
        self.c = np.asarray(c, dtype=float)
        self.r = float(r)
        self.name = name

    def bounds(self):
        return self.c - self.r, self.c + self.r

    def dist(self, P):
        return np.linalg.norm(P - self.c, axis=1) - self.r


class RoundCone(Shape):
    """Capsule with different end radii (exact, after Quilez). Limbs, fingers, toes."""

    def __init__(self, a, b, r1, r2=None, name=""):
        self.a = np.asarray(a, dtype=float)
        self.b = np.asarray(b, dtype=float)
        self.r1 = float(r1)
        self.r2 = float(r1 if r2 is None else r2)
        self.name = name

    def bounds(self):
        lo = np.minimum(self.a - self.r1, self.b - self.r2)
        hi = np.maximum(self.a + self.r1, self.b + self.r2)
        return lo, hi

    def dist(self, P):
        ba = self.b - self.a
        l2 = float(np.dot(ba, ba))
        rr = self.r1 - self.r2
        a2 = l2 - rr * rr
        il2 = 1.0 / l2
        pa = P - self.a
        y = pa @ ba
        z = y - l2
        w = pa * l2 - np.outer(y, ba)
        x2 = np.einsum("ij,ij->i", w, w)
        y2 = y * y * l2
        z2 = z * z * l2
        k = np.sign(rr) * rr * rr * x2
        d_cap_b = np.sqrt(x2 + z2) * il2 - self.r2
        d_cap_a = np.sqrt(x2 + y2) * il2 - self.r1
        d_side = (np.sqrt(np.maximum(x2 * a2 * il2, 0.0)) + y * rr) * il2 - self.r1
        return np.where(np.sign(z) * a2 * z2 > k, d_cap_b, np.where(np.sign(y) * a2 * y2 < k, d_cap_a, d_side))


class Displaced(Shape):
    """A shape whose surface is pushed outward by a smooth field D(P) (metres): d' = d - D.

    Keep |grad D| below ~1 so the result stays a usable distance field.
    """

    def __init__(self, shape: Shape, field, max_disp: float, name=""):
        self.shape = shape
        self.field = field
        self.max_disp = float(max_disp)
        self.name = name or shape.name

    def bounds(self):
        lo, hi = self.shape.bounds()
        return lo - self.max_disp, hi + self.max_disp

    def dist(self, P):
        return self.shape.dist(P) - self.field(P)

    def find(self, name: str):
        return self.shape.find(name) if isinstance(self.shape, Group) else None


class Group(Shape):
    """Ordered smooth CSG. Each item is added (smooth union) or carved (smooth subtraction).

    Items are skipped for points outside their bounds padded by 2k, which
    leaves the zero level set unchanged (see module docs) and keeps a dense
    grid evaluation cheap.
    """

    def __init__(self, name="", k=0.0):
        self.name = name
        self.k = float(k)
        self.items: list[tuple[Shape, str, float]] = []

    def add(self, shape: Shape, k: float | None = None) -> Shape:
        self.items.append((shape, "add", self.k if k is None else float(k)))
        return shape

    def sub(self, shape: Shape, k: float | None = None) -> Shape:
        self.items.append((shape, "sub", self.k if k is None else float(k)))
        return shape

    def bounds(self):
        los, his = [], []
        for shape, mode, k in self.items:
            if mode != "add":
                continue
            lo, hi = shape.bounds()
            los.append(lo - k)
            his.append(hi + k)
        return np.min(los, axis=0), np.max(his, axis=0)

    def dist(self, P):
        d = np.full(len(P), FAR)
        if len(P) == 0:
            return d
        plo, phi = P.min(axis=0), P.max(axis=0)
        for shape, mode, k in self.items:
            lo, hi = shape.bounds()
            pad = 2.0 * k + 1e-4
            if np.any(plo > hi + pad) or np.any(phi < lo - pad):
                continue
            m = np.all((P >= lo - pad) & (P <= hi + pad), axis=1)
            if not m.any():
                continue
            dc = shape.dist(P[m])
            if mode == "add":
                d[m] = smin(d[m], dc, k)
            else:
                d[m] = smax(d[m], -dc, k)
        return d

    def find(self, name: str) -> Shape | None:
        for shape, _, _ in self.items:
            if shape.name == name:
                return shape
            if isinstance(shape, Group):
                hit = shape.find(name)
                if hit is not None:
                    return hit
        return None


def evaluate(shape: Shape, P: np.ndarray, chunk: int = 400_000) -> np.ndarray:
    out = np.empty(len(P))
    for i in range(0, len(P), chunk):
        out[i : i + chunk] = shape.dist(P[i : i + chunk])
    return out


def gradient(shape: Shape, P: np.ndarray, h: float = 5e-5) -> np.ndarray:
    g = np.empty_like(P)
    for axis in range(3):
        e = np.zeros(3)
        e[axis] = h
        g[:, axis] = (evaluate(shape, P + e) - evaluate(shape, P - e)) / (2.0 * h)
    return g


def project(shape: Shape, P: np.ndarray, iterations: int = 4, max_step: float = 0.004) -> np.ndarray:
    """Newton-project points onto the zero level set (steps clamped for stability)."""
    P = P.copy()
    for _ in range(iterations):
        d = evaluate(shape, P)
        g = gradient(shape, P)
        g2 = np.maximum(np.einsum("ij,ij->i", g, g), 1e-12)
        step = np.clip(d / g2, -max_step, max_step)
        P -= g * step[:, None]
    return P


def sample_grid(shape: Shape, voxel: float, pad: float = 0.003):
    """Dense signed-distance grid over the shape's bounds: (values[x, y, z], origin)."""
    lo, hi = shape.bounds()
    lo = lo - pad
    hi = hi + pad
    n = np.ceil((hi - lo) / voxel).astype(int) + 1
    xs = lo[0] + np.arange(n[0]) * voxel
    ys = lo[1] + np.arange(n[1]) * voxel
    zs = lo[2] + np.arange(n[2]) * voxel
    vol = np.empty((n[0], n[1], n[2]), dtype=np.float32)
    gy, gz = np.meshgrid(ys, zs, indexing="ij")
    plane = np.stack([np.zeros(gy.size), gy.ravel(), gz.ravel()], axis=1)
    for i, x in enumerate(xs):
        plane[:, 0] = x
        vol[i] = shape.dist(plane).reshape(n[1], n[2])
    return vol, lo
