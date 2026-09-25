"""Look development: materials, lights, camera, cord, membranes, particles.

Everything is created by code so the look is reproducible and can be matched
by the real-time version (same colours, same light directions). Values come
from the brief and were tuned against the north-star reference.
"""

from __future__ import annotations

import math
from pathlib import Path

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
    bg.inputs["Color"].default_value = rgba("#9DB8BC")
    bg.inputs["Strength"].default_value = 0.14  # the amniotic surround tints the shadow side teal, as in the reference
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
    # Warm key close above-left of the head (0.3 m, 45° up, a little in front),
    # aimed at the head: its falloff leaves the lower body in shade, the
    # reference's light gradient from crown to feet (measured per region on
    # the fetus interior: head/torso/legs within a few levels of the reference
    # instead of +7/+15/+34 with a distant key).
    area_light("LGT_Key", (-0.220, -0.056, 0.287), (-0.01, 0.0, 0.08), "#FFE6D8", 2.84, 0.294, col=col)
    # Neutral fill low from the front-right lifts the face and belly.
    area_light("LGT_Fill", (0.90, -1.00, 0.10), target, "#E2E4DF", 1.0, 1.4, col=col)
    # Soft back light straight behind: a thin environment-like edge all round,
    # and SSS glow through ears, fingers and toes.
    area_light("LGT_Rim", (0.05, 1.00, 0.30), target, "#FFE2D0", 80.0, 0.8, col=col)
    # Faint low bounce so the underside never goes muddy.
    area_light("LGT_Bounce", (0.20, -0.80, -0.90), target, "#C9BDB5", 0.3, 1.2, col=col)


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


def _rest_coords(nt):
    """Undeformed object-space position: Generated coordinates with the body's
    texture space pinned to location 0, size 1 (set by the body builder and by
    lookdev.py), so gen = (co + 1) / 2. Unlike Object coordinates these do not
    swim across the skin when the rig deforms it."""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    ma = nt.nodes.new("ShaderNodeVectorMath")
    ma.operation = "MULTIPLY_ADD"
    ma.inputs[1].default_value = (2.0, 2.0, 2.0)
    ma.inputs[2].default_value = (-1.0, -1.0, -1.0)
    nt.links.new(tc.outputs["Generated"], ma.inputs[0])
    return ma.outputs["Vector"]


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
    ramp.color_ramp.elements[0].color = rgba("#B3958D")
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = rgba("#DDC4BC")
    nt.links.new(ao.outputs["AO"], ramp.inputs["Fac"])
    # Faint vessel network (Voronoi cell edges, broken up by noise), strongest on the scalp.
    rest = _rest_coords(nt)
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
    nt.links.new(rest, mixv.inputs["A"])
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
    nt.links.new(rest, breakup.inputs["Vector"])
    # scalp mask: a per-vertex attribute written by the body builder (fge.mhbody)
    scalp_attr = nt.nodes.new("ShaderNodeAttribute")
    scalp_attr.attribute_type = "GEOMETRY"
    scalp_attr.attribute_name = "fge_scalp"
    scalp = nt.nodes.new("ShaderNodeMapRange")
    scalp.inputs["To Min"].default_value = 0.25
    scalp.inputs["To Max"].default_value = 1.0
    nt.links.new(scalp_attr.outputs["Fac"], scalp.inputs["Value"])
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
    # soft mottling: large, low-contrast patches between a cooler rose and a warmer beige
    mottle = nt.nodes.new("ShaderNodeTexNoise")
    mottle.inputs["Scale"].default_value = 18.0
    mottle.inputs["Detail"].default_value = 2.0
    nt.links.new(rest, mottle.inputs["Vector"])
    mot_mix = nt.nodes.new("ShaderNodeMix")
    mot_mix.data_type = "RGBA"
    mot_mix.blend_type = "OVERLAY"
    mot_mix.inputs["Factor"].default_value = 0.35
    nt.links.new(ramp.outputs["Color"], mot_mix.inputs["A"])
    mot_ramp = nt.nodes.new("ShaderNodeValToRGB")
    mot_ramp.color_ramp.elements[0].color = rgba("#B8888E")
    mot_ramp.color_ramp.elements[1].color = rgba("#D8B49A")
    nt.links.new(mottle.outputs["Fac"], mot_ramp.inputs["Fac"])
    nt.links.new(mot_ramp.outputs["Color"], mot_mix.inputs["B"])
    nt.links.new(mot_mix.outputs["Result"], tint.inputs["A"])
    nt.links.new(tint.outputs["Result"], bsdf.inputs["Base Color"])
    bsdf.inputs["Subsurface Weight"].default_value = 0.85
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.7, 0.55)  # less red bleed: the reference skin is pink-beige, not orange
    # thin parts (ears, fge_thin from the body builder) let far more light through, glowing red
    thin = nt.nodes.new("ShaderNodeAttribute")
    thin.attribute_type = "GEOMETRY"
    thin.attribute_name = "fge_thin"
    sss = nt.nodes.new("ShaderNodeMapRange")
    # a deep scatter: the reference skin has soft, low-contrast shading (local
    # contrast on the body matched against it; 2.5x the earlier depth)
    sss.inputs["To Min"].default_value = 0.010 * translucency
    sss.inputs["To Max"].default_value = 0.0175 * translucency
    nt.links.new(thin.outputs["Fac"], sss.inputs["Value"])
    nt.links.new(sss.outputs["Result"], bsdf.inputs["Subsurface Scale"])
    ear_tint = nt.nodes.new("ShaderNodeMix")
    ear_tint.data_type = "RGBA"
    ear_tint.inputs["B"].default_value = rgba("#C9705E")
    ear_k = nt.nodes.new("ShaderNodeMath")
    ear_k.operation = "MULTIPLY"
    ear_k.inputs[1].default_value = 0.35
    nt.links.new(thin.outputs["Fac"], ear_k.inputs[0])
    nt.links.new(ear_k.outputs["Value"], ear_tint.inputs["Factor"])
    base_src = bsdf.inputs["Base Color"].links[0].from_socket
    nt.links.new(base_src, ear_tint.inputs["A"])
    nt.links.new(ear_tint.outputs["Result"], bsdf.inputs["Base Color"])
    rad = nt.nodes.new("ShaderNodeMix")  # redder scattering where thin: light through an ear glows red
    rad.data_type = "VECTOR"
    rad.inputs[4].default_value = (1.0, 0.45, 0.3)  # A (vector): red-weighted, or deep scatter turns thin parts waxy white
    rad.inputs[5].default_value = (1.0, 0.3, 0.15)  # B (vector)
    nt.links.new(thin.outputs["Fac"], rad.inputs["Factor"])
    nt.links.new(rad.outputs[1], bsdf.inputs["Subsurface Radius"])
    bsdf.inputs["Subsurface IOR"].default_value = 1.38
    bsdf.inputs["Subsurface Anisotropy"].default_value = 0.4
    bsdf.inputs["Roughness"].default_value = 0.45
    bsdf.inputs["Specular IOR Level"].default_value = 0.4
    # thin wet film: soft satin highlights on crown and shoulder, as in the reference
    bsdf.inputs["Coat Weight"].default_value = 0.12
    bsdf.inputs["Coat Roughness"].default_value = 0.45
    bsdf.inputs["Sheen Weight"].default_value = 0.12
    bsdf.inputs["Sheen Roughness"].default_value = 0.45
    bsdf.inputs["Sheen Tint"].default_value = rgba("#FFF1EA")
    # Micro surface: fine low-amplitude noise (vellus / skin grain).
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 900.0
    noise.inputs["Detail"].default_value = 4.0
    noise.inputs["Roughness"].default_value = 0.55
    nt.links.new(rest, noise.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.06
    bump.inputs["Distance"].default_value = 0.00015
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def cord_material(name="MAT_Cord") -> bpy.types.Material:
    """Soft, slightly translucent pink-white cord with the faint helical twist of
    its vessels (bump from a stripe that winds around the curve's UV)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf, _ = _principled(nt)
    bsdf.subsurface_method = "RANDOM_WALK"
    bsdf.inputs["Base Color"].default_value = rgba("#E6E2E4")
    bsdf.inputs["Subsurface Weight"].default_value = 0.4
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.75, 0.75)  # a faint pink glow from within
    bsdf.inputs["Subsurface Scale"].default_value = 0.0012  # shorter than the cord radius, or the streaks blur away
    bsdf.inputs["Roughness"].default_value = 0.45
    bsdf.inputs["Coat Weight"].default_value = 0.15
    bsdf.inputs["Coat Roughness"].default_value = 0.15
    # helix: stripe phase = turns * u + v (u along the cord, v around it, 0..1)
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "UVMap"
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(uv.outputs["UV"], sep.inputs["Vector"])
    turns = nt.nodes.new("ShaderNodeMath")
    turns.operation = "MULTIPLY_ADD"
    turns.inputs[1].default_value = 11.0  # full twists along the visible length
    nt.links.new(sep.outputs["X"], turns.inputs[0])
    nt.links.new(sep.outputs["Y"], turns.inputs[2])
    wave = nt.nodes.new("ShaderNodeMath")
    wave.operation = "SINE"
    k = nt.nodes.new("ShaderNodeMath")
    k.operation = "MULTIPLY"
    k.inputs[1].default_value = 2.0 * math.pi  # one broad ridge per turn: the vessels read as a soft spiral
    nt.links.new(turns.outputs["Value"], k.inputs[0])
    nt.links.new(k.outputs["Value"], wave.inputs[0])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.0008
    nt.links.new(wave.outputs["Value"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    # the vessels also show as faint cool-grey spiral streaks under the jelly
    streak = nt.nodes.new("ShaderNodeMapRange")
    streak.inputs["From Min"].default_value = -1.0
    streak.inputs["To Max"].default_value = 0.6
    nt.links.new(wave.outputs["Value"], streak.inputs["Value"])
    tint = nt.nodes.new("ShaderNodeMix")
    tint.data_type = "RGBA"
    tint.inputs["A"].default_value = rgba("#DCE0E4")  # cool blue-white jelly
    tint.inputs["B"].default_value = rgba("#BFC8D0")
    nt.links.new(streak.outputs["Result"], tint.inputs["Factor"])
    nt.links.new(tint.outputs["Result"], bsdf.inputs["Base Color"])
    return mat


def _backdrop_gain_node(nt):
    """Math-node network: backdrop luminance at the pixel's screen position (a
    quadratic fitted to blender/lookdev/background.json), relative to the frame
    centre, clamped to 0.25..1.3."""
    import json
    from pathlib import Path

    spec = json.loads((Path(__file__).resolve().parents[2] / "lookdev" / "background.json").read_text())
    deg = spec["degree"]
    v, u = np.mgrid[0:1:64j, 0:1:36j]
    T = np.stack([u**i * v**j for i in range(deg + 1) for j in range(deg + 1 - i)], axis=-1)
    lum = np.stack([T @ np.array(c) for c in spec["coefficients"]], -1) @ np.array([0.2126, 0.7152, 0.0722])
    lum = np.clip(lum, 0.02, 1.0) ** 2.2  # sRGB -> linear, roughly
    Q = np.stack([np.ones_like(u), u, v, u * u, u * v, v * v], -1).reshape(-1, 6)
    c = np.linalg.lstsq(Q, lum.ravel(), rcond=None)[0]
    c = c / (Q[np.argmin((u.ravel() - 0.5) ** 2 + (v.ravel() - 0.5) ** 2)] @ c)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Window"], sep.inputs["Vector"])
    vdown = nt.nodes.new("ShaderNodeMath")
    vdown.operation = "SUBTRACT"
    vdown.inputs[0].default_value = 1.0
    nt.links.new(sep.outputs["Y"], vdown.inputs[1])

    def mul(a, b):
        n = nt.nodes.new("ShaderNodeMath")
        n.operation = "MULTIPLY"
        nt.links.new(a, n.inputs[0])
        if isinstance(b, float):
            n.inputs[1].default_value = b
        else:
            nt.links.new(b, n.inputs[1])
        return n.outputs["Value"]

    U, V = sep.outputs["X"], vdown.outputs["Value"]
    terms = [U, V, mul(U, U), mul(U, V), mul(V, V)]
    acc = None
    for coef, t in zip(c[1:], terms):
        term = mul(t, float(coef))
        if acc is None:
            acc = term
        else:
            add = nt.nodes.new("ShaderNodeMath")
            add.operation = "ADD"
            nt.links.new(acc, add.inputs[0])
            nt.links.new(term, add.inputs[1])
            acc = add.outputs["Value"]
    out = nt.nodes.new("ShaderNodeMath")
    out.operation = "ADD"
    out.use_clamp = False
    out.inputs[1].default_value = float(c[0])
    nt.links.new(acc, out.inputs[0])
    clamp = nt.nodes.new("ShaderNodeClamp")
    clamp.inputs["Min"].default_value = 0.25
    clamp.inputs["Max"].default_value = 1.3
    nt.links.new(out.outputs["Value"], clamp.inputs["Value"])
    return _Out(clamp.outputs["Result"])


class _Out:
    def __init__(self, socket):
        self.outputs = {"Value": socket}


def membrane_material(name="MAT_Membrane", opacity=0.75, hem=0.9, haze=0.05, strength=3.0, one_sided=False, fade_ends=False, hem_band=(0.955, 0.99)) -> bpy.types.Material:
    """Thin silk veil: a faint milky film, white where seen edge-on (fresnel), with
    a thin bright hem along both long edges — the crisp lines the reference's
    veils draw across the frame."""
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
    scale.inputs["To Min"].default_value = haze
    scale.inputs["To Max"].default_value = opacity
    nt.links.new(curve.outputs["Value"], scale.inputs["Value"])
    # hem: |v| from the veil UV, a thin smooth band at the long edges
    uvn = nt.nodes.new("ShaderNodeUVMap")
    uvn.uv_map = "veil"
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(uvn.outputs["UV"], sep.inputs["Vector"])
    absv = nt.nodes.new("ShaderNodeMath")
    absv.operation = "ADD" if one_sided else "ABSOLUTE"  # one-sided: only the +v edge carries a hem
    absv.inputs[1].default_value = 0.0
    nt.links.new(sep.outputs["Y"], absv.inputs[0])
    band = nt.nodes.new("ShaderNodeMapRange")
    band.interpolation_type = "SMOOTHSTEP"
    band.inputs["From Min"].default_value = hem_band[0]
    band.inputs["From Max"].default_value = hem_band[1]
    band.inputs["To Max"].default_value = hem
    nt.links.new(absv.outputs["Value"], band.inputs["Value"])
    fac = nt.nodes.new("ShaderNodeMath")
    fac.operation = "MAXIMUM"
    nt.links.new(scale.outputs["Result"], fac.inputs[0])
    nt.links.new(band.outputs["Result"], fac.inputs[1])
    if fade_ends:  # traced veils: soften both ends (u = 0..1 along the line)
        u1 = nt.nodes.new("ShaderNodeMath")
        u1.operation = "PINGPONG"
        u1.inputs[1].default_value = 0.5
        nt.links.new(sep.outputs["X"], u1.inputs[0])
        ends = nt.nodes.new("ShaderNodeMapRange")
        ends.interpolation_type = "SMOOTHSTEP"
        ends.inputs["From Max"].default_value = 0.2
        nt.links.new(u1.outputs["Value"], ends.inputs["Value"])
        faded = nt.nodes.new("ShaderNodeMath")
        faded.operation = "MULTIPLY"
        nt.links.new(fac.outputs["Value"], faded.inputs[0])
        nt.links.new(ends.outputs["Result"], faded.inputs[1])
        fac = faded
    transp = nt.nodes.new("ShaderNodeBsdfTransparent")
    # unlit: the key light is warm, and lit veils picked up a pink cast the reference doesn't have
    veil = nt.nodes.new("ShaderNodeEmission")
    veil.inputs["Color"].default_value = rgba("#E6F4F6")
    veil.inputs["Strength"].default_value = 1.5
    # Veils glow in proportion to the backdrop behind them (screen position):
    # constant emission lifted the dark lower corners ~50 levels above the reference.
    gain = _backdrop_gain_node(nt)
    boost = nt.nodes.new("ShaderNodeMath")
    boost.operation = "MULTIPLY"
    boost.inputs[1].default_value = strength
    nt.links.new(gain.outputs["Value"], boost.inputs[0])
    nt.links.new(boost.outputs["Value"], veil.inputs["Strength"])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(fac.outputs["Value"], mix.inputs["Fac"])
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


def make_cord(material, radius=0.0040, path=CORD_PATH, name="FET_Cord"):
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
    # Thicker where it leaves the belly, tapering toward the placenta side.
    n = len(spline.points)
    for i, p in enumerate(spline.points):
        p.radius = 1.12 - 0.25 * (i / max(n - 1, 1))
    tmp = bpy.data.objects.new(name + "_curve", curve)
    bpy.context.scene.collection.objects.link(tmp)
    bpy.context.view_layer.update()
    # Bake to a mesh: glTF has no curves, and the render needs the sweep's UVs
    # (u along the cord, v around it) for the twist.
    mesh = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    mesh.name = name
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(curve)
    ob = bpy.data.objects.new(name, mesh)
    mesh.materials.clear()
    mesh.materials.append(material)
    mesh.shade_smooth()
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
    # UV = (along, across in -1..1): the material draws the hems from it
    uv = me.uv_layers.new(name="veil")
    UV = np.stack(np.broadcast_arrays(u, v), axis=-1).reshape(-1, 2)
    loop_v = np.array([lp.vertex_index for lp in me.loops])
    uv.data.foreach_set("uv", UV[loop_v].ravel())
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(material)
    camera_only(ob)
    (col or collection("MEMBRANES")).objects.link(ob)
    return ob


MEMBRANE_RINGS = [  # procedural orbits (used when no traced veils exist)
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

MEMBRANE_SPECS = [
    # wide silk sheets well behind the fetus (they can never cross the body):
    # the soft folded fabric the reference frames the fetus with
    (2.9, 3.0, 0.900, 0.45, 0.20, 1.5, 0.030, 0.100, 6.0, (0.000, -0.030)),
    (1.2, 2.6, 1.100, 0.80, 0.25, 2.0, 0.040, 0.180, 24.0, (-0.030, 0.050)),
    (-0.9, 2.4, 0.950, 0.60, 0.20, 1.5, 0.034, 0.140, -10.0, (0.030, 0.000)),
    (4.3, 2.0, 1.200, 1.10, 0.25, 2.0, 0.046, 0.260, 14.0, (0.040, -0.050)),
]


def traced_veil_material(name="MAT_Veil_Traced", strength=3.5) -> bpy.types.Material:
    """Silk sheet seen near face-on: a crisp bright edge along the traced line
    (v = +1) and a translucent body that lifts the backdrop and fades out toward
    v = -1. Per-object `veil_step` / `veil_edge` (opacities measured on the
    reference) set how strongly each sheet shows; both ends fade (u)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    uvn = nt.nodes.new("ShaderNodeUVMap")
    uvn.uv_map = "veil"
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(uvn.outputs["UV"], sep.inputs["Vector"])

    def node(kind, op=None, **inputs):
        n = nt.nodes.new(kind)
        if op:
            n.operation = op
        for k, v in inputs.items():
            n.inputs[int(k[1:]) if k.startswith("i") else k].default_value = v
        return n

    def attr(name):
        a = nt.nodes.new("ShaderNodeAttribute")
        a.attribute_type = "OBJECT"
        a.attribute_name = name
        return a.outputs["Fac"]

    edge = nt.nodes.new("ShaderNodeMapRange")
    edge.interpolation_type = "SMOOTHSTEP"
    edge.inputs["From Min"].default_value = 0.91
    edge.inputs["From Max"].default_value = 0.985
    nt.links.new(sep.outputs["Y"], edge.inputs["Value"])
    body = nt.nodes.new("ShaderNodeMapRange")
    body.interpolation_type = "SMOOTHSTEP"
    body.inputs["From Min"].default_value = -1.0
    body.inputs["From Max"].default_value = 0.5
    nt.links.new(sep.outputs["Y"], body.inputs["Value"])
    e = node("ShaderNodeMath", "MULTIPLY")
    nt.links.new(edge.outputs["Result"], e.inputs[0])
    nt.links.new(attr("veil_edge"), e.inputs[1])
    bd = node("ShaderNodeMath", "MULTIPLY")
    nt.links.new(body.outputs["Result"], bd.inputs[0])
    nt.links.new(attr("veil_step"), bd.inputs[1])
    fac = node("ShaderNodeMath", "ADD")
    fac.use_clamp = True
    nt.links.new(e.outputs["Value"], fac.inputs[0])
    nt.links.new(bd.outputs["Value"], fac.inputs[1])
    pp = node("ShaderNodeMath", "PINGPONG", i1=0.5)
    nt.links.new(sep.outputs["X"], pp.inputs[0])
    ends = nt.nodes.new("ShaderNodeMapRange")
    ends.interpolation_type = "SMOOTHSTEP"
    ends.inputs["From Max"].default_value = 0.3
    nt.links.new(pp.outputs["Value"], ends.inputs["Value"])
    faded = node("ShaderNodeMath", "MULTIPLY")
    nt.links.new(fac.outputs["Value"], faded.inputs[0])
    nt.links.new(ends.outputs["Result"], faded.inputs[1])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = rgba("#E6F4F6")
    gain = _backdrop_gain_node(nt)
    boost = node("ShaderNodeMath", "MULTIPLY", i1=strength)
    nt.links.new(gain.outputs["Value"], boost.inputs[0])
    nt.links.new(boost.outputs["Value"], em.inputs["Strength"])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(faded.outputs["Value"], mix.inputs["Fac"])
    nt.links.new(nt.nodes.new("ShaderNodeBsdfTransparent").outputs["BSDF"], mix.inputs[1])
    nt.links.new(em.outputs["Emission"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return mat


def make_traced_veils(material, path, depths=(0.01, 0.10), sheet_px=160.0, seed=3, name="ENV_Veil"):
    """Silk sheets along the membrane edges traced on the reference
    (fit_reference_veils.py).

    Each traced polyline is back-projected onto a plane behind the fetus (depth
    varies per line so the lens blur varies) and becomes the crisp edge of a
    translucent sheet on the side, and with the lift, measured on the
    reference. On curves the sheet is kept narrower than the radius of
    curvature so it never folds over itself."""
    import json

    spec = json.loads(Path(path).read_text())
    W, H = spec["frame"]
    bands = spec.get("bands") or [{"side": 1, "step": 6.0, "edge": 8.0}] * len(spec["polylines"])
    f_px = (H / 2.0) / math.tan(HERO.fov_v / 2.0)
    cx, cy, cz = HERO.location
    rng = np.random.default_rng(seed)
    col = collection("MEMBRANES")
    obs = []
    for k, (line, band) in enumerate(zip(spec["polylines"], bands)):
        uv = np.asarray(line, float)
        if len(uv) < 4:
            continue
        uv = np.stack([np.convolve(np.pad(uv[:, i], 2, mode="edge"), np.ones(5) / 5, "valid") for i in range(2)], -1)
        d = rng.uniform(*depths)
        m_per_px = (d - cy) / f_px
        P = np.stack([cx + (uv[:, 0] - W / 2) * m_per_px, np.full(len(uv), d), cz - (uv[:, 1] - H / 2) * m_per_px], -1)
        t = np.gradient(uv, axis=0)
        t = np.stack([np.convolve(np.pad(t[:, i], 6, mode="edge"), np.ones(13) / 13, "valid") for i in range(2)], -1)
        t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-9)
        n = band["side"] * np.stack([-t[:, 1], t[:, 0]], -1)  # px, toward the sheet body
        # curvature (px): keep the sheet narrower than the radius on the concave side
        ds = np.maximum(np.linalg.norm(np.gradient(uv, axis=0), axis=1), 1e-6)
        kappa = np.gradient(t, axis=0) / ds[:, None]
        concave = np.einsum("ij,ij->i", kappa, n)
        limit = np.where(concave > 1e-6, 0.6 / np.maximum(concave, 1e-6), np.inf)
        width_px = np.minimum(sheet_px, limit)
        width_px = np.convolve(np.pad(width_px, 8, mode="edge"), np.ones(17) / 17, "valid")
        n3 = np.stack([n[:, 0], np.zeros(len(n)), -n[:, 1]], -1)
        rows = 16
        v = np.linspace(1.0, -1.0, rows)  # +1 on the traced edge, -1 at the sheet's far side
        s_along = np.linspace(0.0, 1.0, len(P))
        V3 = P[:, None, :] + n3[:, None, :] * ((width_px * m_per_px)[:, None] * (1 - v[None, :]) / 2)[..., None]
        verts = V3.reshape(-1, 3)
        i, j = np.meshgrid(np.arange(len(P) - 1), np.arange(rows - 1), indexing="ij")
        a = (i * rows + j).ravel()
        faces = np.stack([a, a + 1, a + rows + 1, a + rows], axis=1)
        me = bpy.data.meshes.new(f"{name}_{k:02d}")
        me.from_pydata(verts, [], faces)
        me.shade_smooth()
        uvl = me.uv_layers.new(name="veil")
        UV = np.stack(np.broadcast_arrays(s_along[:, None], v[None, :]), -1).reshape(-1, 2)
        uvl.data.foreach_set("uv", UV[np.array([lp.vertex_index for lp in me.loops])].ravel())
        ob = bpy.data.objects.new(me.name, me)
        me.materials.append(material)
        # measured lifts (8-bit) -> opacities of a near-white emissive film over the backdrop
        ob["veil_step"] = float(np.clip(band["step"] / 55.0, 0.02, 0.28))
        ob["veil_edge"] = float(np.clip(band["edge"] / 15.0 + 0.3, 0.3, 1.0))  # calibrated on the render: thin edges lose ~2/3 to lens blur
        camera_only(ob)
        col.objects.link(ob)
        obs.append(ob)
    return obs


def make_membranes(material, center=(0.008, 0.0, -0.003), clearance=0.070, specs=None, width_scale=1.0):
    """Veils on concentric orbits that keep the same on-screen gap around the fetus.

    The fetus spans ~0.074 x 0.111 m (half-extents, image plane); each orbit is
    that ellipse grown by `clearance`, then scaled by its depth so the gap reads
    the same from the camera whether the veil sits in front or behind.
    """
    col = collection("MEMBRANES")
    half = (0.074, 0.111)
    dist = HERO.distance
    specs = specs or MEMBRANE_SPECS
    obs = []
    for i, (start, sweep, width, depth, twist, folds, amp, extra, tilt, off) in enumerate(specs, start=1):
        scale = (dist + depth) / dist
        radii = ((half[0] + clearance + extra) * scale, (half[1] + clearance + extra) * scale)
        c = ((center[0] + off[0]) * scale, center[1], (center[2] + off[1]) * scale)
        obs.append(veil(f"ENV_Membrane_{i:02d}", c, radii, tilt, start, sweep, width * (width_scale if depth > 0.2 else 1.0), depth, twist, folds, amp, seed=i, material=material, col=col))
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
    placed = 0
    while placed < count:
        # Shell around the fetus, denser toward the camera-side volume.
        r = rng.uniform(0.09, 0.30)
        th = rng.uniform(0, 2 * math.pi)
        ph = rng.uniform(-1.0, 1.0)
        p = (r * math.cos(th) * math.sqrt(1 - ph * ph), rng.uniform(-0.35, 0.45), r * ph * 1.6)
        if p[1] < 0.10 and (p[0] / 0.10) ** 2 + (p[2] / 0.15) ** 2 < 1.0:
            continue  # in front of / beside the body it reads as a speck on the skin
        i = placed
        placed += 1
        ob = bpy.data.objects.new(f"{name}_{i:03d}", me_src)
        s = rng.uniform(0.00025, 0.0007)
        ob.scale = (s, s, s)
        ob.location = p
        camera_only(ob)
        col.objects.link(ob)
        obs.append(ob)
    return obs
