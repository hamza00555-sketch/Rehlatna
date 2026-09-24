"""Hero camera, shared by Blender (CAM_Hero) and the NumPy preview.

85 mm lens, vertical sensor fit (36 mm), 9:16 frame. At the focus distance
the frame is 0.50 m tall, which is how reference landmarks map to metres.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Camera:
    focal_mm: float = 85.0
    sensor_mm: float = 36.0  # vertical fit
    frame_height_m: float = 0.50  # at the subject plane (Y = 0)
    target: tuple[float, float, float] = (0.0, 0.0, 0.0)
    f_stop: float = 5.6

    @property
    def fov_v(self) -> float:
        return 2.0 * math.atan(self.sensor_mm / 2.0 / self.focal_mm)

    @property
    def distance(self) -> float:
        return self.frame_height_m / 2.0 / math.tan(self.fov_v / 2.0)

    @property
    def location(self) -> tuple[float, float, float]:
        tx, ty, tz = self.target
        return (tx, ty - self.distance, tz)


HERO = Camera()


def project_points(P: np.ndarray, cam: Camera, size: tuple[int, int]):
    """World points → pixel coords (u right, v down) for a camera looking along +Y."""
    w, h = size
    f_px = (h / 2.0) / math.tan(cam.fov_v / 2.0)
    cx, cy, cz = cam.location
    depth = P[:, 1] - cy
    u = w / 2.0 + f_px * (P[:, 0] - cx) / depth
    v = h / 2.0 - f_px * (P[:, 2] - cz) / depth
    return np.stack([u, v], axis=1), depth
