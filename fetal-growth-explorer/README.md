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
python fetch_makehuman.py            # (once) CC0 MakeHuman base mesh, baby targets, rig → blender/assets/
python fit_reference_mask.py         # (once) fetus silhouette traced from the reference
python fit_reference_veils.py        # (once) membrane fold lines traced from the reference
python calibrate_backdrop.py         # (after a render) backdrop glow calibrated against the reference; re-render
python build_base.py                 # fitted MakeHuman baby → FET_Body + FET_Body_Hero → fetal_master.blend (~6 min)
                                     # (--sdf: the earlier procedural implicit-surface body)
python lookdev.py                    # materials, cord, membranes, lights, camera, render settings
python render_stages.py --week 24    # Cycles 1080×1920 → post → blender/renders/render_W24.png
python fit_background.py             # (once) backdrop gradient fitted to the reference
```

`fetal_master.blend` (~30 MB) is generated, not committed: the scripts are
the source of truth and rebuild it from code.

## How the fetus is built

**Current body (default): posed MakeHuman baby** (`scripts/fge/mhbody.py`).
The procedural SDF body below matched the silhouette but never reached the
reference's anatomy (hands, feet, ears, face). The default body starts from
the CC0 MakeHuman hm08 mesh at age "baby" (mean of the six ethnic targets,
closed-eye expression units, and MakeHuman's own belly / trunk-depth /
buttock targets) with its default rig and skin weights, then:

- **Joints.** Rig joint recipes that pair skin with helper vertices break on
  the baby shape (neck01 collapsed, neck03 flipped); they are evaluated on
  the base mesh and carried over with a local affine fit, and the neck chain
  is spaced evenly between the neck and head joint cubes (`fge/mh.py`).
- **Proportions.** Limb segment lengths come from the reference landmark
  skeleton; each bone scales only its own segment (inherited pose scale
  sheared the head and face into grooves).
- **Head.** The vault is Taubin-smoothed and pulled toward a fitted
  ellipsoid (ears protected via MakeHuman's ear targets), then the head is
  enlarged ×1.5 about a pivot low on the neck so the junction cannot fold.
- **Pose.** Anatomical flexion of spine, neck and head relative to rest;
  the trunk is turned onto the reference pelvis→neck line and the limbs are
  aimed along the landmark skeleton. A Nelder-Mead solve over the three
  flexion angles, head size and placement fits the body to the traced
  reference outline and the cranium's outline circle to the reference's,
  with a prior on every parameter. Skinning is volume-preserving with
  corrective smoothing; the cord is attached at the navel found from
  MakeHuman's navel targets.

**Rig-ready by construction.** The body is never baked into its pose:

| | |
| --- | --- |
| `FET_Rig` | MakeHuman default rig, 163 bones (body, fingers, toes, eyes, lids, jaw, lips). Object transform = shot placement (rotation + offset, scale 1). |
| `FET_Body` | Skinned quad mesh (13 378 quads, no tris/ngons), MakeHuman UVs, ≤ 4 normalised weights per vertex (glTF / three.js), parented to `FET_Rig`. |
| Rest pose | Upright and symmetric along the rig axes (face −Y, up +Z), ~30 cm crown–heel, fetal proportions baked in; no pose-level scale anywhere. |
| Pose | The week-24 curl is the rig's pose, keyed as action `FET_W24_Curl`; switch the armature to *Rest Position* to see the neutral body. |
| Deformers | Armature (preserve volume) → corrective smooth (masked off the head) → subdivision, all live modifiers. |
| Shading | Skin textures read the undeformed position (`Generated`, pinned texture space) and a `fge_scalp` attribute, so nothing swims when the body moves. |

`blender/renders/rig_W24.jpg` shows rest pose, week-24 pose and a quick
animation test with the skeleton overlaid.

**Earlier body (`--sdf`):**

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
| Skin `MAT_Skin` | Principled, random-walk skin SSS (weight 0.55, radius 1.0/0.35/0.2), AO-driven crease tint `#B58877` → `#D2AC9E`, faint sheen, micro-bump, faint scalp vessel layer (scales up for earlier weeks) |
| Cord `FET_Cord` | NURBS tube along the measured S-curve, pale translucent SSS with a thin coat |
| Membranes `ENV_Membrane_01…07` | folded silk veils on elliptical orbits, fresnel opacity (clear face-on, white edge-on), camera-only (they never light or shadow the fetus) |
| Particles | 160 tiny light motes, camera-only, mostly lost in the depth of field |
| Lights | `LGT_Key` large warm area from the left, low (≈25° up) so it reaches neck and shoulder under the head · `LGT_Fill` low teal-neutral from the right · `LGT_Rim` soft back light for the edge and SSS glow · `LGT_Bounce` faint underside |
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
