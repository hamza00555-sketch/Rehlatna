"""The fetus as an implicit surface: week-24 base, posed like the reference.

Every landmark below was measured on the north-star reference
(reference/north-star.webp): image percentages mapped to metres on the subject plane
(frame height 0.50 m at the camera's focus distance, crown–rump ≈ 21 cm).
World axes: +X toward the face (screen right), +Z up, +Y away from the
camera. The fetus's right side faces the camera, so "near" limbs are its
right limbs (Y < 0).

Parts are grouped (head, trunk, limbs) with their own blend radii so joints
read soft without fusing things that should stay apart (forearm vs chest,
fingers vs each other). Stage variants (weeks 8–40) will re-use this layout
with different proportions.
"""

from __future__ import annotations

import numpy as np

from .face import FACE_OUT, FACE_UP, NASION, FaceParams, face_field
from .sdf import Displaced, Ellipsoid, Group, RoundCone, Sphere, frame, normalize, rot_y

Y = np.array([0.0, 1.0, 0.0])


def V(x, y, z) -> np.ndarray:
    return np.array([x, y, z], dtype=float)




def chain(group: Group, points, radii, k_joint: float, k_first: float | None = None, name: str = "") -> None:
    """Round-cone chain through `points` (fingers, toes)."""
    for i in range(len(points) - 1):
        k = k_first if (i == 0 and k_first is not None) else k_joint
        group.add(RoundCone(points[i], points[i + 1], radii[i], radii[i + 1], name=f"{name}_{i}"), k=k)


def finger(base, tip, r_base, r_tip, curl, fractions=(0.0, 0.45, 0.75, 1.0), bends=(0.0, 0.6, 1.0, 1.15)):
    base, tip, curl = np.asarray(base), np.asarray(tip), np.asarray(curl)
    pts = [base + f * (tip - base) + b * curl for f, b in zip(fractions, bends)]
    radii = [r_base + f * (r_tip - r_base) for f in fractions]
    return pts, radii


# --------------------------------------------------------------------------
# Head
# --------------------------------------------------------------------------


def ear(side: float, c) -> Group:
    """side = -1 for the near (right) ear, +1 for the far ear.

    A thin plate with a rolled C-shaped helix rim (round-cone chain from the
    front-top, over the top and down the back to the lobe), a concha bowl,
    antihelix ridge, tragus and lobe. The ear faces out and a little forward.
    """
    g = Group("ear", k=0.0010)
    up = normalize((-0.18, 0.0, 1.0))  # long axis, top tilted back
    out = normalize((0.28, side, 0.0))  # the ear's face normal
    fwd = normalize(np.cross(out, up)) if np.cross(out, up)[0] > 0 else -normalize(np.cross(out, up))
    R = np.stack([up, out, fwd], axis=1)

    def at(a_up, a_fwd, a_out=0.0):
        return c + a_up * up + a_fwd * fwd + a_out * out

    g.add(Ellipsoid(c, (0.0104, 0.0026, 0.0071), R, name="ear_plate"))
    # Helix: C-shaped rim, thickest over the top and back.
    t = np.linspace(-0.35 * np.pi, 1.30 * np.pi, 12)
    rim = [at(0.0100 * np.sin(a + 0.5 * np.pi) * (1.0 if a < 0.5 * np.pi else 1.05), -0.0064 * np.cos(a + 0.5 * np.pi) - 0.0006, 0.0014) for a in t]
    radii = [0.0010 + 0.0006 * np.sin(np.clip((a + 0.35 * np.pi) / (1.65 * np.pi), 0, 1) * np.pi) for a in t]
    for i in range(len(rim) - 1):
        g.add(RoundCone(rim[i], rim[i + 1], radii[i], radii[i + 1], name="ear_helix"), k=0.0008)
    g.add(Ellipsoid(at(-0.0085, 0.0008, 0.0006), (0.0030, 0.0022, 0.0030), R, name="ear_lobe"), k=0.0014)
    g.sub(Ellipsoid(at(-0.0012, 0.0014, 0.0030), (0.0042, 0.0026, 0.0030), R, name="ear_concha"), k=0.0009)
    g.add(RoundCone(at(0.0045, -0.0012, 0.0016), at(-0.0030, -0.0020, 0.0018), 0.0009, 0.0008, name="ear_antihelix"), k=0.0007)
    g.add(Sphere(at(-0.0022, 0.0052, 0.0014), 0.0014, name="ear_tragus"), k=0.0009)
    return g


def build_head(face: FaceParams | None = None) -> Group:
    """Blank head (skull, convex face block, jaw) + face features as smooth displacement."""
    blank = Group("head_blank", k=0.004)
    # Cranium: ellipse fitted to the reference outline (centre, semi-axes, 9.6° forward tilt).
    blank.add(Ellipsoid(V(-0.0043, 0.0, 0.0705), (0.0399, 0.0320, 0.0374), rot_y(9.6), name="cranium"))
    # Lower head: one broad mandible/cheek mass under the cranium.
    blank.add(Ellipsoid(V(-0.0090, 0.0, 0.0375), (0.0180, 0.0270, 0.0160), rot_y(-8.0), name="lower_face"), k=0.016)
    # Face block: the convex infant midface. Its placement and the midline
    # feature amplitudes are a least-squares fit to the reference profile
    # (0.6 mm RMS from brow to under-chin).
    face_frame = np.stack([FACE_OUT, Y, FACE_UP], axis=1)
    blank.add(Ellipsoid(NASION - 0.0108 * FACE_OUT - 0.0129 * FACE_UP, (0.0117, 0.0200, 0.0164), face_frame, name="face_block"), k=0.0087)
    for s in (-1.0, 1.0):
        blank.add(Ellipsoid(V(-0.0080, s * 0.0200, 0.0480), (0.0120, 0.0100, 0.0110), name="temple"), k=0.016)
        blank.add(RoundCone(V(-0.0005, s * 0.0085, 0.0200), V(-0.0215, s * 0.0215, 0.0420), 0.0040, 0.0055, name="jaw"), k=0.012)
    head = Group("head", k=0.0015)
    head.add(Displaced(blank, face_field(face), max_disp=0.004, name="head_face"))
    for s in (-1.0, 1.0):
        head.add(ear(s, V(-0.0262, s * 0.0272, 0.0535)))
    return head


# --------------------------------------------------------------------------
# Trunk
# --------------------------------------------------------------------------


def build_trunk() -> Group:
    t = Group("trunk", k=0.016)
    t.add(RoundCone(V(-0.0170, 0.0, 0.0390), V(-0.0310, 0.0, 0.0110), 0.0155, 0.0185, name="neck"))
    t.add(Ellipsoid(V(-0.0310, 0.0, -0.0020), (0.0285, 0.0300, 0.0290), rot_y(10.0), name="chest"))
    t.add(Ellipsoid(V(-0.0365, 0.0, 0.0055), (0.0200, 0.0280, 0.0140), name="shoulder_girdle"))
    # Upper chest rises toward the tucked chin, so the head sits on the body rather than on a stalk.
    t.add(Ellipsoid(V(-0.0200, 0.0, 0.0120), (0.0190, 0.0250, 0.0150), name="upper_chest"), k=0.014)
    t.add(Ellipsoid(V(-0.0270, 0.0, -0.0440), (0.0335, 0.0290, 0.0300), name="abdomen"))
    t.add(Ellipsoid(V(-0.0075, 0.0, -0.0445), (0.0175, 0.0245, 0.0210), name="belly"), k=0.012)
    t.add(Ellipsoid(V(-0.0300, 0.0, -0.0720), (0.0240, 0.0260, 0.0210), rot_y(-30.0), name="pelvis"))
    for s in (-1.0, 1.0):
        t.add(Ellipsoid(V(-0.0270, s * 0.0120, -0.0810), (0.0200, 0.0160, 0.0180), rot_y(-30.0), name="buttock"), k=0.012)
    return t


# --------------------------------------------------------------------------
# Arms and hands
# --------------------------------------------------------------------------


def near_hand(wrist) -> Group:
    """Raised right hand near the chin, fingers softly open, back of the hand to camera."""
    g = Group("hand_r", k=0.0012)
    d = normalize((0.0244, 0.0, 0.0047))
    R = frame(d, hint=(0.0, 0.0, 1.0))
    a = R[:, 1]
    palm_c = wrist + 0.0075 * d
    g.add(Ellipsoid(palm_c, (0.0078, 0.0072, 0.0035), R, name="palm"), k=0.004)
    mcp = palm_c + 0.0068 * d
    curl = V(0.0, 0.0006, 0.0)
    fingers = [
        ("index", +0.0050, 0.0000, V(0.0290, -0.0335, 0.0113), 0.0018, 0.0014),
        ("middle", +0.0017, 0.0000, V(0.0323, -0.0335, 0.0040), 0.0019, 0.0015),
        ("ring", -0.0017, -0.0003, V(0.0309, -0.0335, -0.0027), 0.0018, 0.0014),
        ("little", -0.0048, -0.0008, V(0.0277, -0.0335, -0.0074), 0.0015, 0.0012),
    ]
    for name, off_a, off_d, tip, rb, rt in fingers:
        base = mcp + off_a * a + off_d * d
        pts, radii = finger(base, tip, rb, rt, curl)
        chain(g, pts, radii, k_joint=0.0010, k_first=0.0020, name=name)
    thumb = [V(0.0100, -0.0290, 0.0030), V(0.0135, -0.0285, 0.0065), V(0.0160, -0.0285, 0.0082), V(0.0180, -0.0290, 0.0095)]
    chain(g, thumb, [0.0030, 0.0024, 0.0021, 0.0019], k_joint=0.0012, k_first=0.0025, name="thumb")
    return g


def far_hand(wrist) -> Group:
    """Left hand in front of the belly, loosely curled around the cord."""
    g = Group("hand_l", k=0.0012)
    d = normalize((0.0085, -0.0080, -0.0025))
    R = frame(d, hint=(0.0, 0.0, 1.0))
    palm_c = wrist + 0.0070 * d
    g.add(Ellipsoid(palm_c, (0.0072, 0.0068, 0.0034), R, name="palm"), k=0.004)
    for i, dz in enumerate((0.0048, 0.0016, -0.0016, -0.0046)):
        base = palm_c + 0.0060 * d + V(0.0, 0.0, dz)
        mid = base + V(0.0048, -0.0040, -0.0006)
        tip = mid + V(0.0010, -0.0038, -0.0012)
        r = 0.0018 if i < 3 else 0.0015
        chain(g, [base, mid, tip], [r, r * 0.92, r * 0.84], k_joint=0.0010, k_first=0.0018, name=f"finger_l{i}")
    thumb = [palm_c + V(0.0015, -0.0010, 0.0055), palm_c + V(0.0055, -0.0045, 0.0065), palm_c + V(0.0075, -0.0075, 0.0055)]
    chain(g, thumb, [0.0026, 0.0021, 0.0018], k_joint=0.0012, k_first=0.0022, name="thumb_l")
    return g


def arm(shoulder, elbow, wrist, hand: Group, side: float) -> tuple[Group, Group]:
    upper = Group("upper_arm", k=0.004)
    upper.add(RoundCone(shoulder, elbow, 0.0115, 0.0092, name="humerus"))
    upper.add(Ellipsoid(shoulder + V(0.0015, side * 0.0035, 0.0010), (0.0110, 0.0100, 0.0115), name="deltoid"), k=0.008)
    lower = Group("forearm", k=0.004)
    lower.add(RoundCone(elbow, wrist, 0.0095, 0.0070, name="forearm"))
    lower.add(hand, k=0.004)
    return upper, lower


# --------------------------------------------------------------------------
# Legs and feet
# --------------------------------------------------------------------------


def foot(heel, ball, toe_dir_hint, side: float, scale: float = 1.0) -> Group:
    g = Group("foot", k=0.003)
    axis = normalize(ball - heel)
    R = frame(axis, hint=(0.0, 1.0, 0.0))
    width, up = R[:, 1], R[:, 2]
    g.add(Sphere(heel, 0.0068 * scale, name="heel"))
    g.add(Ellipsoid((heel + ball) / 2, (np.linalg.norm(ball - heel) / 2 + 0.002, 0.0068 * scale, 0.0052 * scale), R, name="midfoot"), k=0.005)
    g.add(Ellipsoid(ball, (0.0050 * scale, 0.0074 * scale, 0.0048 * scale), R, name="ball"), k=0.004)
    toe_dir = normalize(axis + toe_dir_hint)
    medial = -side  # the big toe sits toward the body midline
    toes = [(0.0046, 0.0000, 0.0062, 0.0027), (0.0020, -0.0004, 0.0052, 0.0020), (-0.0003, -0.0008, 0.0046, 0.0019), (-0.0025, -0.0013, 0.0041, 0.0018), (-0.0045, -0.0019, 0.0035, 0.0016)]
    for i, (off_w, off_a, length, r) in enumerate(toes):
        base = ball + 0.0030 * axis + off_a * axis + medial * off_w * width + 0.0006 * up
        tip = base + length * scale * toe_dir - 0.0012 * up
        mid = (base + tip) / 2 + 0.0004 * up
        chain(g, [base, mid, tip], [r * scale, r * 0.95 * scale, r * 0.85 * scale], k_joint=0.0009, k_first=0.0016, name=f"toe{i}")
    return g


def leg(hip, knee, ankle, heel, ball, side: float, thigh_r=(0.0182, 0.0118), calf_r=(0.0108, 0.0066)) -> tuple[Group, Group]:
    upper = Group("thigh", k=0.004)
    upper.add(RoundCone(hip, knee, thigh_r[0], thigh_r[1], name="femur"))
    lower = Group("shin", k=0.004)
    s = normalize(ankle - knee)
    p = np.cross(s, Y)
    if p[0] > 0:
        p = -p
    lower.add(RoundCone(knee, ankle, calf_r[0], calf_r[1], name="tibia"))
    lower.add(Ellipsoid(knee + 0.35 * (ankle - knee) + 0.0035 * p, (0.0140, 0.0076, 0.0076), frame(s, hint=p), name="calf"), k=0.006)
    front = normalize(np.cross(Y, s)) if np.cross(Y, s)[0] > 0 else -normalize(np.cross(Y, s))
    lower.add(Ellipsoid(knee + 0.0058 * front + V(0.0, 0.0, 0.0015), (0.0060, 0.0070, 0.0065), name="patella"), k=0.004)
    lower.add(foot(heel, ball, V(0.0, 0.0, -0.15), side), k=0.006)
    return upper, lower


# --------------------------------------------------------------------------
# Whole body
# --------------------------------------------------------------------------


def build_w24() -> Group:
    body = Group("FET_Body")
    body.add(build_head())
    body.add(build_trunk(), k=0.011)

    s_r, e_r, w_r = V(-0.0420, -0.0305, 0.0060), V(-0.0290, -0.0445, -0.0265), V(0.0065, -0.0335, -0.0010)
    s_l, e_l, w_l = V(-0.0355, 0.0270, 0.0040), V(-0.0215, 0.0400, -0.0300), V(-0.0010, 0.0250, -0.0305)
    up_r, low_r = arm(s_r, e_r, w_r, near_hand(w_r), side=-1.0)
    up_l, low_l = arm(s_l, e_l, w_l, far_hand(w_l), side=1.0)

    h_r, k_r, a_r = V(-0.0200, -0.0185, -0.0700), V(0.0385, -0.0260, -0.0480), V(0.0525, -0.0200, -0.0840)
    h_l, k_l, a_l = V(-0.0200, 0.0185, -0.0700), V(0.0320, 0.0230, -0.0520), V(0.0330, 0.0120, -0.0935)
    th_r, sh_r = leg(h_r, k_r, a_r, heel=V(0.0490, -0.0180, -0.0895), ball=V(0.0735, -0.0140, -0.0775), side=-1.0)
    th_l, sh_l = leg(h_l, k_l, a_l, heel=V(0.0255, 0.0100, -0.0975), ball=V(0.0490, 0.0055, -0.1085), side=1.0, thigh_r=(0.0176, 0.0112), calf_r=(0.0103, 0.0064))

    body.add(up_r, k=0.006)  # near upper arm reads as its own limb in front of the chest
    body.add(up_l, k=0.010)
    for g in (th_r, th_l):
        body.add(g, k=0.008)  # low blend keeps a groin crease so the thigh reads as a leg
    for g in (low_r, low_l, sh_r, sh_l):
        body.add(g, k=0.004)
    return body
