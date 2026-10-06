"""Week slider on the rig: one property drives the whole growth.

Adds to FET_Rig:

- `week` (12..40): drives every stage key W12..W40 (each key peaks at its own
  week and fades to its neighbours, so the slider morphs continuously)
- `growth`: crown-heel length relative to the base week, read from the same
  slider through the biometry table (driven, read-only in practice)
- `real_size` (0..1): 1 scales the rig to the true size of the week, 0 keeps
  every week the same size (handy for posing and comparing proportions)

Everything is plain drivers with keyframed mapping curves: no Python
expressions, so the file works without "Auto Run Python Scripts". `week` is
keyframable, so a growth animation is two keyframes; the bones still pose
and animate at any week.

    python build_week_rig.py
"""

from __future__ import annotations

import json
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "fetal_master.blend"
DATA = ROOT / "data" / "fetal_growth.json"
RIG, BODY = "FET_Rig", "FET_Body"


def _prop(ob, name, value, lo, hi, desc):
    ob[name] = value
    ui = ob.id_properties_ui(name)
    ui.update(min=lo, max=hi, soft_min=lo, soft_max=hi, description=desc)
    if isinstance(value, float):
        ui.update(step=10, precision=2)


def _mapped_driver(owner, path, rig, prop, points, index=-1):
    """Driver whose curve maps rig[prop] through `points` (x -> y, linear,
    constant outside)."""
    owner.driver_remove(path, index)
    fc = owner.driver_add(path, index)
    drv = fc.driver
    drv.type = "AVERAGE"
    for v in list(drv.variables):
        drv.variables.remove(v)
    var = drv.variables.new()
    var.name = prop
    var.targets[0].id = rig
    var.targets[0].data_path = f'["{prop}"]'
    for m in list(fc.modifiers):
        fc.modifiers.remove(m)
    fc.keyframe_points.clear()  # new driver curves come with a default 0..1 ramp
    for x, y in points:
        kp = fc.keyframe_points.insert(x, y)
        kp.interpolation = "LINEAR"
    fc.extrapolation = "CONSTANT"
    return fc


def main():
    data = json.loads(DATA.read_text())
    weeks = sorted(int(w) for w in data["weeks"])
    base = int(data["base_week"])
    ch = {int(w): v["ch_cm"] for w, v in data["weeks"].items()}

    bpy.ops.wm.open_mainfile(filepath=str(MASTER))
    rig = bpy.data.objects[RIG]
    body = bpy.data.objects[BODY]
    keys = body.data.shape_keys.key_blocks

    _prop(rig, "week", float(base), float(weeks[0]), float(weeks[-1]), "Gestational week: morphs the body between the stage keys")
    _prop(rig, "real_size", 1.0, 0.0, 1.0, "1 = true size of the week, 0 = every week at the base size")
    _prop(rig, "growth", 1.0, 0.0, 10.0, "Crown-heel length relative to the base week (driven by week)")

    # stage keys: a tent per week over its neighbours
    for i, w in enumerate(weeks):
        k = keys.get(f"W{w:02d}")
        if k is None:
            raise SystemExit(f"missing shape key W{w:02d}: run build_week_keys.py first")
        pts = [(w, 1.0)]
        if i > 0:
            pts.insert(0, (weeks[i - 1], 0.0))
        if i < len(weeks) - 1:
            pts.append((weeks[i + 1], 0.0))
        _mapped_driver(k, "value", rig, "week", pts)

    # growth from the biometry table, then the rig scale from growth and real_size
    _mapped_driver(rig, '["growth"]', rig, "week", [(w, ch[w] / ch[base]) for w in weeks])
    for axis in range(3):
        rig.driver_remove("scale", axis)
        fc = rig.driver_add("scale", axis)
        drv = fc.driver
        drv.type = "SCRIPTED"
        for name, path in (("g", '["growth"]'), ("r", '["real_size"]')):
            v = drv.variables.new()
            v.name = name
            v.targets[0].id = rig
            v.targets[0].data_path = path
        drv.expression = "1 + r * (g - 1)"  # simple expression: no auto-run needed

    if body.parent != rig:
        mw = body.matrix_world.copy()
        body.parent = rig
        body.matrix_world = mw
    for o in bpy.data.objects:  # cord and other props follow the rig too
        if o.name.startswith("FET_Cord") and o.parent is None:
            mw = o.matrix_world.copy()
            o.parent = rig
            o.matrix_world = mw

    # quick check at a few weeks
    for w in (12, 18, 24, 33, 40):
        rig["week"] = float(w)
        rig.update_tag()
        bpy.context.scene.frame_set(bpy.context.scene.frame_current)
        active = {k.name: round(k.value, 2) for k in keys if k.name.startswith("W") and k.value > 0.001}
        print(f"[fge] week {w}: keys {active}, growth {rig['growth']:.3f}, scale {rig.scale[0]:.3f}")
    rig["week"] = float(base)
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER), compress=True)
    print(f"[fge] week slider on {RIG}: Object Properties > Custom Properties > week")


if __name__ == "__main__":
    main()
