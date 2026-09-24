"""Fast look at an SDF body from the hero camera, without Blender.

Marching cubes on a coarse grid, then a painter's-algorithm rasteriser with
flat shading. Used to line the pose up against the reference before any
Cycles render: `overlay()` draws the silhouette outline on the reference.
"""

from __future__ import annotations

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from skimage.measure import marching_cubes

from .camera import HERO, project_points
from .sdf import Shape, sample_grid


def mesh(shape: Shape, voxel: float = 0.0012):
    vol, origin = sample_grid(shape, voxel)
    verts, faces, _, _ = marching_cubes(vol, level=0.0, spacing=(voxel, voxel, voxel))
    return verts + origin, faces


def shade(shape: Shape, size=(558, 1000), voxel: float = 0.0012, light=(-0.55, -0.45, 0.70)):
    verts, faces = mesh(shape, voxel)
    uv, depth = project_points(verts, HERO, size)
    tri = verts[faces]
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    L = np.asarray(light) / np.linalg.norm(light)
    lum = np.clip(n @ L, 0.0, 1.0) * 0.75 + 0.2
    order = np.argsort(-depth[faces].mean(axis=1))
    img = Image.new("RGB", size, (40, 60, 64))
    mask = Image.new("L", size, 0)
    d, dm = ImageDraw.Draw(img), ImageDraw.Draw(mask)
    for f in order:
        pts = [tuple(p) for p in uv[faces[f]]]
        v = int(lum[f] * 235)
        d.polygon(pts, fill=(v, int(v * 0.86), int(v * 0.8)))
        dm.polygon(pts, fill=255)
    return img, mask


def overlay(reference: Image.Image, mask: Image.Image, color=(255, 40, 40)) -> Image.Image:
    ref = reference.convert("RGB").resize(mask.size, Image.LANCZOS)
    edge = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(3)), mask.filter(ImageFilter.MinFilter(3)))
    out = ref.copy()
    out.paste(Image.new("RGB", mask.size, color), (0, 0), edge)
    return out
