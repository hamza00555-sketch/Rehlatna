"""Look development: materials, lights, camera, cord, membranes, particles.

Everything is created by code so the look is reproducible and can be matched
by the real-time version (same colours, same light directions). Values come
from the brief and were tuned against the north-star reference.
"""

from __future__ import annotations

import math

import bpy
import numpy as np
from mathutils import Vector

from .camera import HERO, Camera


def hex_rgb(h: str) -> tuple[float, float, float]:
    """sRGB hex → linear RGB (Blender colour sockets are linear)."""
    h = h.lstrip("#")
    srgb = [int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)


def rgba(h: str, a: float = 1.0):
    return (*hex_rgb(h), a)


def collection(name: str) -> bpy.types.Collection:
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col


# --------------------------------------------------------------------------
# Render settings
# --------------------------------------------------------------------------


def setup_render(scene, width=1080, height=1920, samples=256, transparent=True):
    scene.render.engine = "CYCLES"
    c = scene.cycles
    c.device = "CPU"
    c.samples = samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.01
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.max_bounces = 10
    c.diffuse_bounces = 4
    c.glossy_bounces = 4
    c.transmission_bounces = 8
    c.transparent_max_bounces = 48
    c.volume_bounces = 0
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.blur_glossy = 1.0
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_depth = "16"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium Low Contrast"
    scene.view_settings.exposure = -1.05
    scene.view_layers[0].use_pass_mist = True
    scene.world.mist_settings.start = 1.10
    scene.world.mist_settings.depth = 0.45
    scene.world.mist_settings.falloff = "LINEAR"


# --------------------------------------------------------------------------
# World, lights, camera
# --------------------------------------------------------------------------


def make_world(scene) -> None:
    """Teal-grey ambient for fill. The visible backdrop is added in post (film is transparent)."""
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = rgba("#9DB3B5")
    bg.inputs["Strength"].default_value = 0.16
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])


def area_light(name, location, target, color_hex, energy, size, shape="DISK", col=None):
    data = bpy.data.lights.new(name, "AREA")
    data.shape = shape
    data.size = size
    data.energy = energy
    data.color = hex_rgb(color_hex)
    ob = bpy.data.objects.new(name, data)
    ob.location = location
    direction = Vector(target) - Vector(location)
    ob.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    (col or bpy.context.scene.collection).objects.link(ob)
    return ob


def make_lights(target=(0.0, 0.0, 0.02)):
    col = collection("LIGHTS")
    # Large soft warm key above and in front-left: the crown reads bright and the
    # near side of the body falls off softly (a side key put the camera-facing
    # half of the head in shadow with a hard terminator across the skull).
    area_light("LGT_Key", (-0.40, -0.60, 1.20), target, "#FFDCC2", 55.0, 0.9, col=col)
    # Neutral fill low from the front-right lifts the face and belly.
    area_light("LGT_Fill", (0.90, -1.00, 0.10), target, "#E2E4DF", 8.0, 1.4, col=col)
    # Soft back light straight behind: a thin environment-like edge all round,
    # and SSS glow through ears, fingers and toes.
    area_light("LGT_Rim", (0.05, 1.00, 0.30), target, "#FFE2D0", 45.0, 0.8, col=col)
    # Faint low bounce so the underside never goes muddy.
    area_light("LGT_Bounce", (0.20, -0.80, -0.90), target, "#C9BDB5", 1.5, 1.2, col=col)


def make_camera(scene, cam: Camera = HERO, focus_point=(0.0185, -0.013, 0.040), name="CAM_Hero"):
    data = bpy.data.cameras.new(name)
    data.lens = cam.focal_mm
    data.sensor_fit = "VERTICAL"
    data.sensor_height = cam.sensor_mm
    data.clip_start = 0.05
    data.clip_end = 20.0
    data.dof.use_dof = True
    data.dof.aperture_fstop = cam.f_stop
    ob = bpy.data.objects.new(name, data)
    ob.location = cam.location
    ob.rotation_euler = (math.pi / 2.0, 0.0, 0.0)
    data.dof.focus_distance = float(focus_point[1] - cam.location[1])
    collection("CAMERAS").objects.link(ob)
    scene.camera = ob
    return ob


# --------------------------------------------------------------------------
# Materials
# --------------------------------------------------------------------------


def _principled(nt):
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return bsdf, out


def skin_material(name="MAT_Skin", translucency: float = 1.0, vessels: float = 1.0) -> bpy.types.Material:
    """Soft, waxy, backlit skin. `translucency` > 1 and more `vessels` for earlier weeks (thinner skin)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf, _ = _principled(nt)
    bsdf.subsurface_method = "RANDOM_WALK_SKIN"
    # Crease tint: ambient occlusion pulls the base toward the deeper tone.
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
    ao.inputs["Distance"].default_value = 0.010
    ao.samples = 8
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[0].color = rgba("#B48373")
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = rgba("#D9AE9E")
    nt.links.new(ao.outputs["AO"], ramp.inputs["Fac"])
    # Faint vessel network (Voronoi cell edges, broken up by noise), strongest on the scalp.
    coord = nt.nodes.new("ShaderNodeTexCoord")
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.feature = "DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value = 70.0
    vor.inputs["Randomness"].default_value = 0.9
    warp = nt.nodes.new("ShaderNodeTexNoise")
    warp.inputs["Scale"].default_value = 60.0
    warp.inputs["Detail"].default_value = 3.0
    mixv = nt.nodes.new("ShaderNodeMix")
    mixv.data_type = "VECTOR"
    mixv.inputs["Factor"].default_value = 0.12
    nt.links.new(coord.outputs["Object"], mixv.inputs["A"])
    nt.links.new(warp.outputs["Color"], mixv.inputs["B"])
    nt.links.new(mixv.outputs["Result"], vor.inputs["Vector"])
    line = nt.nodes.new("ShaderNodeMapRange")
    line.inputs["From Min"].default_value = 0.0
    line.inputs["From Max"].default_value = 0.035
    line.inputs["To Min"].default_value = 1.0
    line.inputs["To Max"].default_value = 0.0
    nt.links.new(vor.outputs["Distance"], line.inputs["Value"])
    breakup = nt.nodes.new("ShaderNodeTexNoise")
    breakup.inputs["Scale"].default_value = 25.0
    nt.links.new(coord.outputs["Object"], breakup.inputs["Vector"])
    sepz = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Object"], sepz.inputs["Vector"])
    scalp = nt.nodes.new("ShaderNodeMapRange")
    scalp.inputs["From Min"].default_value = 0.045
    scalp.inputs["From Max"].default_value = 0.085
    scalp.inputs["To Min"].default_value = 0.25
    scalp.inputs["To Max"].default_value = 1.0
    nt.links.new(sepz.outputs["Z"], scalp.inputs["Value"])
    m1 = nt.nodes.new("ShaderNodeMath"); m1.operation = "MULTIPLY"
    nt.links.new(line.outputs["Result"], m1.inputs[0]); nt.links.new(breakup.outputs["Fac"], m1.inputs[1])
    m2 = nt.nodes.new("ShaderNodeMath"); m2.operation = "MULTIPLY"
    nt.links.new(m1.outputs["Value"], m2.inputs[0]); nt.links.new(scalp.outputs["Result"], m2.inputs[1])
    m3 = nt.nodes.new("ShaderNodeMath"); m3.operation = "MULTIPLY"
    m3.inputs[1].default_value = 0.10 * vessels
    nt.links.new(m2.outputs["Value"], m3.inputs[0])
    tint = nt.nodes.new("ShaderNodeMix")
    tint.data_type = "RGBA"
    tint.blend_type = "MIX"
    tint.inputs["B"].default_value = rgba("#A8707A")
    nt.links.new(m3.outputs["Value"], tint.inputs["Factor"])
    nt.links.new(ramp.outputs["Color"], tint.inputs["A"])
    nt.links.new(tint.outputs["Result"], bsdf.inputs["Base Color"])
    bsdf.inputs["Subsurface Weight"].default_value = 0.55
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    bsdf.inputs["Subsurface Scale"].default_value = 0.0024 * translucency
    bsdf.inputs["Subsurface IOR"].default_value = 1.38
    bsdf.inputs["Subsurface Anisotropy"].default_value = 0.4
    bsdf.inputs["Roughness"].default_value = 0.5
    bsdf.inputs["Specular IOR Level"].default_value = 0.5
    bsdf.inputs["Sheen Weight"].default_value = 0.12
    bsdf.inputs["Sheen Roughness"].default_value = 0.45
    bsdf.inputs["Sheen Tint"].default_value = rgba("#FFF1EA")
    # Micro surface: fine low-amplitude noise (vellus / skin grain).
    tex = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 900.0
    noise.inputs["Detail"].default_value = 4.0
    noise.inputs["Roughness"].default_value = 0.55
    nt.links.new(tex.outputs["Object"], noise.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.06
    bump.inputs["Distance"].default_value = 0.00015
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def cord_material(name="MAT_Cord") -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf, _ = _principled(nt)
    bsdf.subsurface_method = "RANDOM_WALK"
    bsdf.inputs["Base Color"].default_value = rgba("#E4EEEF")
    bsdf.inputs["Subsurface Weight"].default_value = 0.35
    bsdf.inputs["Subsurface Radius"].default_value = (0.8, 0.85, 0.9)
    bsdf.inputs["Subsurface Scale"].default_value = 0.004
    bsdf.inputs["Roughness"].default_value = 0.45
    bsdf.inputs["Coat Weight"].default_value = 0.15
    bsdf.inputs["Coat Roughness"].default_value = 0.15
    return mat


def membrane_material(name="MAT_Membrane", opacity=0.75) -> bpy.types.Material:
    """Thin silk veil: nearly clear face-on, white where seen edge-on (fresnel-lit edges)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.5
    curve = nt.nodes.new("ShaderNodeMath")
    curve.operation = "POWER"
    curve.inputs[1].default_value = 4.0
    nt.links.new(lw.outputs["Facing"], curve.inputs[0])
    scale = nt.nodes.new("ShaderNodeMapRange")
    scale.inputs["To Min"].default_value = 0.025
    scale.inputs["To Max"].default_value = opacity
    nt.links.new(curve.outputs["Value"], scale.inputs["Value"])
    transp = nt.nodes.new("ShaderNodeBsdfTransparent")
    # unlit: the key light is warm, and lit veils picked up a pink cast the reference doesn't have
    veil = nt.nodes.new("ShaderNodeEmission")
    veil.inputs["Color"].default_value = rgba("#E6F4F6")
    veil.inputs["Strength"].default_value = 1.5
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(scale.outputs["Result"], mix.inputs["Fac"])
    nt.links.new(transp.outputs["BSDF"], mix.inputs[1])
    nt.links.new(veil.outputs["Emission"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return mat


def particle_material(name="MAT_Particle") -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = rgba("#F2FAFA")
    em.inputs["Strength"].default_value = 3.0
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.inputs["Fac"].default_value = 0.35
    nt.links.new(tr.outputs["BSDF"], mix.inputs[1])
    nt.links.new(em.outputs["Emission"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return mat


# --------------------------------------------------------------------------
# Cord, membranes, particles
# --------------------------------------------------------------------------


# Cord centreline measured on the reference (metres, subject plane), from the
# umbilicus up and out toward the top-right corner.
CORD_PATH = [
    (0.0020, 0.0040, -0.0355),
    (0.0120, -0.0020, -0.0300),
    (0.0245, -0.0120, -0.0212),
    (0.0397, -0.0190, -0.0200),
    (0.0523, -0.0230, -0.0300),
    (0.0675, -0.0220, -0.0250),
    (0.0799, -0.0180, -0.0175),
    (0.0849, -0.0120, -0.0050),
    (0.0799, -0.0060, 0.0075),
    (0.0700, -0.0010, 0.0175),
    (0.0647, 0.0020, 0.0300),
    (0.0675, 0.0040, 0.0425),
    (0.0773, 0.0060, 0.0500),
    (0.0951, 0.0100, 0.0575),
    (0.1103, 0.0150, 0.0700),
    (0.1204, 0.0200, 0.0850),
    (0.1254, 0.0260, 0.0975),
    (0.1320, 0.0320, 0.1040),
    (0.1440, 0.0420, 0.1090),
    (0.1600, 0.0560, 0.1130),
    (0.1800, 0.0720, 0.1160),
]


def attach_cord(path, navel, normal, reach=4):
    """Move the cord's first points onto the body's navel: the start sits just
    inside the skin, the next leaves along the belly normal, and the shift fades
    out over `reach` points so the rest of the drawn path is kept."""
    path = [np.array(p, float) for p in path]
    navel, normal = np.asarray(navel, float), np.asarray(normal, float)
    delta = navel - path[0]
    out = []
    for i, p in enumerate(path):
        f = max(0.0, 1.0 - i / reach)
        out.append(p + delta * f * f * (3 - 2 * f))
    out[0] = navel - 0.004 * normal
    out[1] = navel + 0.010 * normal
    return [tuple(p) for p in out]


def make_cord(material, radius=0.0030, path=CORD_PATH, name="FET_Cord"):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 24
    curve.bevel_depth = radius
    curve.bevel_resolution = 6
    curve.use_fill_caps = True
    spline = curve.splines.new("NURBS")
    spline.points.add(len(path) - 1)
    for p, co in zip(spline.points, path):
        p.co = (*co, 1.0)
    spline.use_endpoint_u = True
    spline.order_u = 4
    # Slightly thicker where it leaves the belly.
    for i, p in enumerate(spline.points):
        p.radius = 1.12 if i < 2 else 1.0
    ob = bpy.data.objects.new(name, curve)
    ob.data.materials.append(material)
    collection("CORD").objects.link(ob)
    return ob


def camera_only(ob) -> None:
    """Seen by the camera but never lights, shadows or reflects on the fetus."""
    ob.visible_diffuse = False
    ob.visible_glossy = False
    ob.visible_transmission = False
    ob.visible_volume_scatter = False
    ob.visible_shadow = False


def veil(name, center, radii, tilt_deg, start, sweep, width, depth, twist, folds, fold_amp, seed, material, segments=420, rows=40, col=None):
    """A long silk veil on an elliptical orbit around the fetus.

    Its width turns between the image plane and the depth axis along its
    length (seen face-on it is nearly clear, edge-on it reads as a bright
    line), and its cross-section is folded so one veil carries several soft
    fresnel-lit lines, like chiffon.
    """
    rng = np.random.default_rng(seed)
    u = np.linspace(0.0, 1.0, segments)[:, None]
    v = np.linspace(-1.0, 1.0, rows)[None, :]
    ang = start + sweep * u
    ct, st = math.cos(math.radians(tilt_deg)), math.sin(math.radians(tilt_deg))
    ex, ez = radii
    x0, z0 = ex * np.cos(ang), ez * np.sin(ang)
    ph = rng.uniform(0.0, 2.0 * math.pi, 4)
    P = np.stack([center[0] + ct * x0 - st * z0, center[1] + depth + 0.015 * np.sin(2.0 * math.pi * u * 1.3 + ph[0]), center[2] + st * x0 + ct * z0], axis=-1)[:, 0, :]
    T = np.gradient(P, axis=0)
    T /= np.linalg.norm(T, axis=1, keepdims=True)
    radial = P - np.asarray(center, dtype=float)
    radial[:, 1] = 0.0
    radial -= T * np.einsum("ij,ij->i", radial, T)[:, None]
    radial /= np.maximum(np.linalg.norm(radial, axis=1, keepdims=True), 1e-9)
    depth_axis = np.cross(T, radial)
    theta = (0.5 * math.pi * np.sin(2.0 * math.pi * twist * u[:, 0] + ph[1]))[:, None]
    Wd = np.cos(theta) * radial + np.sin(theta) * depth_axis
    N = np.cross(T, Wd)
    taper = (np.sin(np.pi * u[:, 0]) ** 0.7)[:, None]
    w = width * taper * (0.8 + 0.2 * np.sin(2.0 * math.pi * 1.7 * u + ph[2]))
    fold = fold_amp * np.sin(folds * math.pi * v + 3.0 * u + ph[3]) * (1.0 - 0.5 * v * v)
    V3 = P[:, None, :] + Wd[:, None, :] * (w * v)[..., None] + N[:, None, :] * (fold * taper)[..., None]
    verts = V3.reshape(-1, 3)
    i, j = np.meshgrid(np.arange(segments - 1), np.arange(rows - 1), indexing="ij")
    a = (i * rows + j).ravel()
    faces = np.stack([a, a + rows, a + rows + 1, a + 1], axis=1)
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.shade_smooth()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(material)
    camera_only(ob)
    (col or collection("MEMBRANES")).objects.link(ob)
    return ob


def make_membranes(material, center=(0.008, 0.0, -0.003), clearance=0.070):
    """Veils on concentric orbits that keep the same on-screen gap around the fetus.

    The fetus spans ~0.074 x 0.111 m (half-extents, image plane); each orbit is
    that ellipse grown by `clearance`, then scaled by its depth so the gap reads
    the same from the camera whether the veil sits in front or behind.
    """
    col = collection("MEMBRANES")
    half = (0.074, 0.111)
    dist = HERO.distance
    specs = [
        # start, sweep, width, depth(y), twist, folds, fold amp, extra clearance, tilt, centre offset (x, z)
        (0.4, 5.4, 0.220, 0.25, 0.35, 2.0, 0.018, 0.000, 8.0, (0.000, 0.000)),
        (2.5, 5.0, 0.300, 0.45, 0.45, 2.5, 0.024, 0.020, -12.0, (0.010, 0.015)),
        (4.2, 4.6, 0.050, -0.16, 0.20, 1.0, 0.006, 0.010, 14.0, (-0.006, -0.008)),
        (1.3, 5.6, 0.360, 0.70, 0.50, 3.0, 0.030, 0.040, -18.0, (-0.015, 0.020)),
        (3.4, 4.8, 0.260, 0.12, 0.40, 2.0, 0.020, 0.010, 5.0, (0.010, -0.012)),
        (5.4, 4.4, 0.060, -0.26, 0.20, 1.0, 0.006, 0.006, -8.0, (0.000, 0.008)),
        (0.8, 5.2, 0.420, 1.00, 0.55, 3.0, 0.034, 0.070, 22.0, (0.020, -0.006)),
        (1.7, 3.4, 0.500, 1.35, 0.60, 3.5, 0.045, 0.110, -32.0, (-0.040, 0.060)),
        (4.7, 3.2, 0.480, 1.55, 0.55, 3.0, 0.042, 0.130, 26.0, (0.050, -0.070)),
    ]
    obs = []
    for i, (start, sweep, width, depth, twist, folds, amp, extra, tilt, off) in enumerate(specs, start=1):
        scale = (dist + depth) / dist
        radii = ((half[0] + clearance + extra) * scale, (half[1] + clearance + extra) * scale)
        c = ((center[0] + off[0]) * scale, center[1], (center[2] + off[1]) * scale)
        obs.append(veil(f"ENV_Membrane_{i:02d}", c, radii, tilt, start, sweep, width, depth, twist, folds, amp, seed=i, material=material, col=col))
    return obs


def make_particles(material, count=60, seed=7, name="ENV_Particles"):
    rng = np.random.default_rng(seed)
    col = collection("ENVIRONMENT")
    me_src = bpy.data.meshes.new(name + "_mote")
    import bmesh

    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    bm.to_mesh(me_src)
    bm.free()
    me_src.shade_smooth()
    me_src.materials.append(material)
    obs = []
    for i in range(count):
        # Shell around the fetus, denser toward the camera-side volume.
        r = rng.uniform(0.09, 0.30)
        th = rng.uniform(0, 2 * math.pi)
        ph = rng.uniform(-1.0, 1.0)
        p = (r * math.cos(th) * math.sqrt(1 - ph * ph), rng.uniform(-0.35, 0.45), r * ph * 1.6)
        ob = bpy.data.objects.new(f"{name}_{i:03d}", me_src)
        s = rng.uniform(0.00025, 0.0007)
        ob.scale = (s, s, s)
        ob.location = p
        camera_only(ob)
        col.objects.link(ob)
        obs.append(ob)
    return obs
