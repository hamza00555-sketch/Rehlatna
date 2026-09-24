# Fetal Growth Explorer

One continuous 3D fetus you can scrub from week 8 to week 40, built in
Blender (procedural, scripted) and played back in Three.js. This folder
holds the Blender side; the web app lands at checkpoint 3.

```
Blender (bpy)  ──►  GLB (mesh + morph targets + armature + cord)  ──►  Three.js web app
     └──► hero stills per stage (Cycles, 9:16)  ──►  poster / fallback
```

## Status

| Checkpoint | State |
| --- | --- |
| 1. Look-dev lock (week 24 vs reference) | **for review** — `blender/renders/lookdev_W24_vs_reference.jpg` |
| 2. Stages (shape keys W08…W40, contact sheet) | not started — waits for look-dev approval |
| 3. GLB export + web prototype | not started |
| 4. Polish | not started |
| 5. QA | not started |

## Run

Python 3.13 with Blender as a module (or run the same scripts inside
Blender 5.2 with `blender -b -P <script>`):

```bash
uv venv --python 3.13 .venv && . .venv/bin/activate
uv pip install bpy==5.2.2 scikit-image pillow scipy

cd blender/scripts
python build_base.py                 # SDF → FET_Body + FET_Body_Hero → blender/fetal_master.blend  (~2.5 min)
python lookdev.py                    # materials, cord, membranes, lights, camera, render settings
python render_stages.py --week 24    # Cycles 1080×1920 → post → blender/renders/render_W24.png
python fit_background.py             # (once) backdrop gradient fitted to the reference
```

`fetal_master.blend` (~30 MB) is generated, not committed: the scripts are
the source of truth and rebuild it from code.

## How the fetus is built

- **Implicit surface.** The body is a signed-distance function: ellipsoids
  and round cones joined with smooth unions (`scripts/fge/sdf.py`,
  `scripts/fge/body.py`). Every landmark (crown, occiput, ear, face profile,
  hands, knees, feet, cord path) was measured on the reference and mapped to
  metres on the subject plane (frame height 0.50 m, crown–rump ≈ 21 cm).
- **Face.** A blank convex head plus the features as smooth Gaussian
  displacements in a face-aligned frame (`scripts/fge/face.py`): nose,
  lips, mouth line, chin, cheeks, brow, eye socket, closed lid and lid
  crease. The face block and midline amplitudes are a least-squares fit to
  the reference profile (0.6 mm RMS from brow to under-chin).
- **Meshing.** Marching cubes → voxel remesh → every vertex projected back
  onto the exact surface with tangential relaxation (`FET_Body`, 145k
  verts, the shape-key carrier). `FET_Body_Hero` is that mesh subdivided once
  and re-projected, for sub-millimetre detail in Cycles.
- **Stages (next).** The same parametric layout with per-week proportions;
  each week's shape key comes from transferring `FET_Body`'s vertices into
  that week's surface (part-space transfer + projection), so every week
  shares one topology and the web scrub never pops.

## Look

| Element | Setup |
| --- | --- |
| Skin `MAT_Skin` | Principled, random-walk skin SSS (weight 0.55, radius 1.0/0.35/0.2), AO-driven crease tint `#B98474` → `#D6AA9A`, faint sheen, micro-bump, faint scalp vessel layer (scales up for earlier weeks) |
| Cord `FET_Cord` | NURBS tube along the measured S-curve, pale translucent SSS with a thin coat |
| Membranes `ENV_Membrane_01…07` | folded silk veils on elliptical orbits, fresnel opacity (clear face-on, white edge-on), camera-only (they never light or shadow the fetus) |
| Particles | 160 tiny motes, camera-only, mostly lost in the depth of field |
| Lights | `LGT_Key` large warm area, top-left and side-on · `LGT_Fill` low teal-neutral from the right · `LGT_Rim` soft back light for the edge and SSS glow · `LGT_Bounce` faint underside |
| Camera `CAM_Hero` | 85 mm, 9:16, f/5.6 focused on the face |
| Grade (`scripts/post.py`) | backdrop gradient (fitted polynomial, `lookdev/background.json`, shared with the web shader) · light haze · rim-only bloom · lifted blacks toward teal · grain |

Colour note: the brief's backdrop hexes (`#DCE8E8` → `#8FA7A9`) are lighter
than the reference at its edges (down to `#3D4F50`). The reference is the
north star, so the fitted gradient follows it.

## Layout

```
fetal-growth-explorer/
├─ reference/north-star.webp        the look-dev target
└─ blender/
   ├─ scripts/
   │  ├─ build_base.py  lookdev.py  render_stages.py  post.py  fit_background.py
   │  └─ fge/  sdf.py  body.py  face.py  meshing.py  lookdev.py  camera.py  preview.py
   ├─ lookdev/background.json
   └─ renders/
```
