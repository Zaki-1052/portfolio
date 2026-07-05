# 2026-07-05 — Phase 4 iteration: hub resculpt, signal pulses, network atmosphere

Third session of the day, from the user's eye-pass feedback: the trunk read too
basic/botanical; the band should read as a signal-bearing NETWORK structure;
plus four accepted polish items and one interaction bug.

## What was done

- **Resculpt (arbor-generator + arbor-geometry)** — the silhouette is now a
  radiating body, not a botanical trunk: shorter/stouter base (trunkLength
  3.4, radius 1.0) into a **hub** — a rounded central body (UV sphere merged
  into the solid pass at the split point, `hubScale` dial, 16×26 so the fbm
  relief reads as surface not facets) that swallows the limb junctions;
  **2 decorative minor limbs** radiating near-laterally; **one long thin
  trailing filament** descending from the hub (the silhouette's
  counterweight). New limb tag `DECOR_LIMB = 3` (dims on focus like any
  non-focused member, never labeled); `extractSpines` rewritten as a
  structural chain-walk (any number of members, any tag). +1 generator test
  (decorative members, filament descends) → 12.
- **Signal pulses (shader-only)** — a brightness wave sweeps root→tip along
  the growth parameter, phased per limb so members fire in turn; the tips
  discharge (×1.4 flash) when their limb's wave arrives. `pulseSpeed`/
  `pulseGain` in look params + panel; gain forced 0 under reduced motion (a
  frozen bright band would read as a defect).
- **Network atmosphere (`arbor-atmosphere.tsx`)** — `ArborDrift`: rose signal
  motes floating between the reaches (shared DriftField, now exported from
  the tissue module); `ArborNeighbors`: two faint glow-only structures
  (strands+tips at seeds 23/41, scaled/rotated, dim 0.16/0.22) far in the
  haze, carrying the same pulses — distant firing glimmers through the mist.
  +5 draw calls; scene total ≈ 10 + composer.
- **Polish + bug fixes** — annotation side FROZEN while its branch is
  focused/hovered + 6%-width hysteresis (the "panel chases the cursor across
  the anchor" bug); labels clamped into the viewport (clamped annotations dim
  their connector); tipSize 0.34→0.46; feathered radial darkening behind
  entries (no box; inset widened so the gradient dies before its own edge).
- **Knot retune** — targets dropped to frame the full body (hub at world
  y≈-10.6, anchors y≈+2..+5 after the resculpt — refetched live via Vite
  module import); trunkLength slider floor 4→2 (was clamping the new default).

## Verified live (Playwright, dpr 2)

Index dwell: hub + radiating limbs + all three labels in-frame, a crown
caught mid-fire by the pulse, motes drifting, neighbor glimmering at frame
edge — 62 FPS. Focus click: pivot + dim + fully legible feathered entries;
side stays put while approaching the panel. Gate: typecheck · lint ·
**134 tests** · build.

## Open items

- User eye-pass: hub relief/shape (still slightly faceted low on the body —
  slider territory), bark register at close range, pulse cadence, neighbor
  placement/dimness, sway. All live-tunable via the arbor panels.
- Blessed values → freeze into ARBOR_DEFAULTS with a sign-off line.
- 4.3 tail unchanged: final knot/fog tuning passes with the user.

## Key file paths

`src/utils/arbor-generator.ts(.test)` · `src/scales/cellular/{arbor-geometry,
arbor-atmosphere,ArborMesh,CellularScene,ArborAnnotations,arbor-params,
arbor-glow-material}.ts[x]` · `src/scales/cellular/shaders/arbor-{strand,tip}.frag.glsl` ·
`src/scales/tissue/atmosphere-motes.tsx` (DriftField exported) ·
`src/engine/camera-keyframes.ts` · `src/dev/arbor-dev-tools.tsx` · `src/styles/globals.css`
