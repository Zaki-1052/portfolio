# 2026-07-15 — Protein Stage B.1: ribbon geometry, materials, static render

Session 4 of the protein scale. The band renders for the first time. **Gate 2 is
not signed off** — it needs a browser and an eye against the reference renders.

## What was done

- `protein-params.ts` — collapsed the three per-SS radial constants into one
  `RIBBON_RADIAL_SEGMENTS = 8`; reshaped `RibbonProfile` from `{width, height}`
  to a superellipse `{a, b, n}`; added `PROTEIN_WORLD_SCALE`, `PROFILE_FLOOR`,
  `MIN_STRAND_RUN`, the look param set + defaults, and a real
  `applyProteinRibbonLook`
- `protein-guide.ts` + test — pure guide math (no three): Catmull-Rom at 4
  sub-samples/residue per fragment, tangents, the frame, flip correction,
  strand-run detection, `receptorCenter`. 17 tests
- `protein-geometry.ts` + test — the sweep: superellipse cross-sections, SS
  transition morph, arrow taper, end caps, merged fragments, build/write pair.
  15 tests
- `protein-materials.ts` + `shaders/protein-ribbon.{vert,frag}.glsl` — cyan
  register, chain brightness, RMSF warmth, Fresnel, per-SS specular, rim shade,
  manual exp2 fog, breathing displacement
- `ProteinMesh.tsx` — the mount transforms, async load, reveal envelope, uniform
  writes. `ProteinScene.tsx` now holds it instead of a placeholder
- `protein-live-params.ts`, `src/dev/protein-dev-tools.tsx`,
  `protein-preview.html` + `src/dev/protein-preview.tsx`, `app.tsx` gating
- `protein-loader.ts` — documented the `midplaneY`/Z trap on the field itself;
  test now decodes the **real committed binaries** off disk (7 new tests)

## Decisions made

- **The carbonyl-derived vector is the ribbon's WIDTH axis, not its surface
  normal.** A 90° rotation of every ribbon rode on this. Pinned by an
  ideal-coil unit test in node. The design doc's glossary says the opposite of
  its own construction — noted in both the module header and the test so nobody
  "fixes" it back.
- **Measure the convention on the AXIAL projection, not the radial one.** The
  first attempt asserted `|up·radial| > 0.9` and failed at 0.891. Not a code
  bug: `up` picks up tangential content because the spline scallops, so the
  radial measure understates. Axial separates the two candidate conventions by
  ~6× (`|up·axial|` 0.10–0.15 vs ~0.9 if swapped).
- **Constant 8 radial segments**, superellipse profiles — the morph is a lerp of
  three scalars. Forced: differing ring counts can't strip-connect or morph, and
  the animation write needs fixed topology.
- **2 draw calls, not 5.** Subject's 2 fragments merge; supporting chains' 3
  merge. Only subject-vs-supporting needs independent opacity.
- **Raw RMSF in the attribute, normalised in the shader.** Makes the range
  slider a uniform write instead of a geometry rebuild. The shipped uniform
  interface already anticipated this.
- **Supporting chains carry zero flexibility**, not the live floor — no
  measurement, no dynamics layer, and it can't desync from the panel.
- **Å in, transform at the mount**: scale 0.035, −90° X rotation, centre on
  (subject X̄, subject Ȳ, midplane). Geometry never imports a placement constant.

## Open items

- **Gate 2 unsigned.** Needs `/protein-preview.html?depth=0.64&dpr=2` compared
  against `amarolab/charmm-gui/Figure_5HT2A_psilocin_membrane_full.png` and
  `amarolab/demo/protein.png`. **The GLSL has never been compiled** — tests
  can't reach it.
- **Camera knots are still placeholder.** Gate 2 is the first moment real
  geometry exists to tune against; the leva `camera` panel already builds
  `kf… · d59/d64/d69` folders. Bake → paste.
- **Scalloping**: splining Cα 100° apart at 4 samples/residue dips the radius
  ~1.70–2.50 Å against a 2.3 Å source. Inherent to the `count × 4` contract the
  pipeline baked in; real renderers get the same slight ropiness. If it reads
  badly, the fix is a Cα smoothing pass before splining, not a sweep change.
- `PROTEIN_WORLD_SCALE = 0.035` is derived from the placeholder camera, not
  measured against the render.
- Session 5 (B.2): frame interpolation + write guard, membrane, ligand.
  `BREATHING_AMP = 0.05` Å is ~0.04% of the complex — expect to raise it ~5×;
  the slider already brackets to 0.6.
- `receptor.gi.bindingPocketLitResids` is `[]` — Session 8 must use the primary
  system's list for both.

## Key file paths

**New (10):** `src/scales/protein/protein-guide.ts` + `.test.ts`,
`protein-geometry.ts` + `.test.ts`, `protein-materials.ts`,
`protein-live-params.ts`, `ProteinMesh.tsx`,
`shaders/protein-ribbon.{vert,frag}.glsl`; `src/dev/protein-dev-tools.tsx`,
`src/dev/protein-preview.tsx`; `protein-preview.html`

**Modified (5):** `src/scales/protein/protein-params.ts`, `ProteinScene.tsx`,
`src/utils/protein-loader.ts` + `.test.ts`, `src/app.tsx`

**Verification:** typecheck green, lint clean, 389/389 tests (43 files), up from
349.
