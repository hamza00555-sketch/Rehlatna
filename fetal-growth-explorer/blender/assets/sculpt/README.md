# Fetus sculpt (optional, external asset)

Put a fetus sculpt here (`.glb`, `.gltf`, `.obj` or `.fbx`); `build_base.py`
binds it to the fitted MakeHuman rig (`fge/sculpt.py`) and uses it as the
body surface. Assets in this folder are not committed.

Current candidate: **"Baby"** by joekarava —
https://sketchfab.com/3d-models/baby-f05a87806cad49feb75ac7659d55c368 —
licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
Credit required: "Baby" by joekarava, CC BY 4.0, via Sketchfab.

## How the adoption works (`fge/sculpt.py`)

1. **Import**: all mesh parts are baked to world space and welded; a copy of
   that original connectivity is kept, then the parts are fused into one
   closed surface (voxel remesh) and reduced to ~40k faces. If a part is
   named like a head (`head`, `testa`, ...) its vertices are labelled.
2. **Register**: similarity alignment to the posed MakeHuman body, started
   from the posed bone frames and matched on the heads, refined by symmetric
   ICP. The rig pose is then fitted to the sculpt (chamfer, multi-start
   limb stages).
3. **Weights**: carried from the MakeHuman body only where the two surfaces
   truly coincide (within 5 mm, agreeing normals, mutual nearest neighbours,
   same head/body part); everything else is filled by harmonic diffusion over
   the *original* connectivity, so a hand resting on a thigh does not inherit
   the thigh. Hands and feet are rigid at the wrist/ankle. The fitted pose is
   applied as the rest pose, so binding moves nothing.
4. **Reference pose**: solved from the sculpt's own pose against the
   reference outline and cranium circle (bounded Powell, small bends, the
   tucked arm pinned) and keyed as `FET_W24_Curl`.

A full `build_base.py` run with the sculpt takes about an hour on CPU; the
pose stage alone can be re-run on the saved blend in ~6 minutes.

Known limits with this asset: the tucked hand is an open, spread hand, so it
must stay out of view; the mesh has no UVs (the skin shader uses rest-space
coordinates); the rest pose is the sculpt's curl, not a symmetric A-pose.
