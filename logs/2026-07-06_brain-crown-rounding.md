# 2026-07-06 — Brain crown rounding (less-flat top)

Goal: make the top of the tissue/brain shell read less flat / more domed near the
hero, without losing the slab-halves character.

## What was done

- **Two-number tune** (committed separately by Zara, own commit for easy revert):
  `crown` preset (= `SHELL_DEFAULTS`) `boxiness` 2.7 → 2.3, `bottomFlat` 0.82 → 0.95.
  - `boxiness` ↓ rounds the flat top *face* (global — also softens side walls).
  - `bottomFlat` ↑ cuts the crown radial tuck (~18% → ~5%) under `profileFlip: 1`,
    so the crown domes instead of narrowing into a plateau; base untouched.

- **New `crownRound` dial** (0..1) — decoupled top-pole rounding:
  - `shell-shape.glsl`: new `uniform float uCrownRound`.
  - `tissue-shell.vert.glsl` `toBase`: `n = mix(uBoxiness, min(uBoxiness, 2.0), uCrownRound * smoothstep(0.25, 0.9, u.y))`.
    Eases the superellipsoid exponent toward a pure ellipsoid only near +Y;
    `u.y` gate keeps side walls at full `uBoxiness`. `min()` guarantees the top
    is never boxier than the sides.
  - `shell-params.ts`: `crownRound` added to `ShellParams`, all 3 presets (0),
    `ShellParamUniforms`, and `applyShellParams` mapper.
  - `tissue-shell-material.ts`: `uCrownRound` uniform default seeded.
  - `shell-dev-tools.tsx`: `crownRound` slider (0–1, step 0.01) in "shell form".

## Decisions

- Chose a dedicated decoupled param over just lowering global `boxiness` further,
  so the crown can dome independently of the slab-sided halves.
- Exponent target floored at 2.0 (pure ellipsoid) — below that the superellipsoid
  goes concave/pinched. That caps the max dome; a stronger dome would need an
  additive crown bulge, deferred.
- Blessed value: `crown` ships `crownRound: 0.12` (tuned live against the hero
  framing); `loaf` (pre-rework baseline) and `bluff` stay at 0. No leva clamp
  divergence (0.12 is in [0,1]).
- No effect on the stalk companion mesh (footprint is at −Y, mask = 0 there).

## Open items

- Blessed `crownRound: 0.12` into `crown` (done). If it later reads too subtle,
  revisit with an additive crown bulge or a nudge to side `boxiness`.

## Key file paths

- `src/scales/tissue/shell-params.ts`
- `src/shaders/shell-shape.glsl`
- `src/scales/tissue/shaders/tissue-shell.vert.glsl`
- `src/scales/tissue/tissue-shell-material.ts`
- `src/dev/shell-dev-tools.tsx`
