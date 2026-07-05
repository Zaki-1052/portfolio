# 2026-07-05 — Phase 4: fluorescence color balance (reference-match pass)

> Neutral-vocabulary convention holds (arbor / trunk / limb / strand / tip / hub /
> sheath / puncta).

Fifth session of the day. From the user's eye-pass against the reference: the band
had the right silhouette but the wrong color story — it read blue + white on navy,
where the reference reads blue + **green** + **warm multicolor dots** on navy. Six
gaps addressed in one color/intensity pass (no geometry, camera, or interaction
change), then a goldward follow-up.

## What was done

- **Green-on-blue limbs (balanced).** Widened the sheath fbm coverage in
  `arbor-trunk.frag.glsl` (`smoothstep(0.35,0.75)` → `(0.22,0.70)`) and raised the
  growth-gate floor (`0.35 + 0.65·glowK` → `0.55 + 0.45·glowK`) so mid-limbs near
  the hub read green, not just the reaches. `sheathAmount` 0.55 → 0.72, `sheathColor`
  vivified. Blue base kept saturated so it still reads through the coat.
- **Beads survive bloom — root cause found.** `hexToRgb` (`arbor-geometry.ts`) was
  pushing sRGB palette bytes into the `aColor` attribute as if linear, so every bead
  rendered lighter + desaturated before bloom (then ACES laundered them white). Now
  routed through three's `Color` (sRGB→linear), matching how the strand/tip `uColor`
  uniforms already resolve. White core mix 0.3 → 0.14, base glow 1.25 → 1.15.
- **Tips keep color.** Cut the three stacking white-shifts: tip `0.28→0.14` + firing
  cap `0.7→0.45` (`arbor-tip.frag`), strand `0.18→0.10` + crackle cap `0.6→0.4`
  (`arbor-strand.frag`), trunk emissive white-shift `0.25→0.15`. `tipColor` moved
  from icy `#c6ecff` to green-cyan `#a6e8cf` (feeds both the reach-albedo blend and
  the emissive), `emissiveStrength` 1.3 → 1.1. The reaches still bloom — colored now.
- **Saturated-blue hub.** `hubGlowA` → electric blue `#3b82f0`, `hubGlowB` →
  blue-cyan `#57c4e0`, `baseColor` → `#2f6aa0`. Blessed `hubGlowStrength`/`hubBump`
  left as-is (retint only).
- **Warm multicolor field dots.** Added an **opt-in per-particle palette** to the
  shared `DriftField` (`atmosphere-motes.tsx` + its vert/frag): always-emitted
  `aColor` attribute (white default ⇒ `uColor` unchanged, so the tissue dust/embers
  stay byte-identical), hashed from the palette when present (sRGB→linear). Canopy
  drift count 510 → 760, peak opacity 0.65 → 0.9, given a warm palette.
- **Goldward follow-up (user: "more christmas-y now").** The red-on-green combo read
  as a holiday palette. Dropped the pure red from both pools and warmed the slots to
  gold/amber/orange: `PUNCTA_PALETTE` → gold/amber/orange/green/cyan; canopy field
  palette → all gold/amber. User signed off.

## Decisions

- Bloom is a single global depth curve (`post-fx-curves.ts`) shared with tissue and
  has no per-band knob — fixed the **sources** (white-shifts, corrected bead color),
  not the shared curve, to protect the tissue band.
- The `DriftField` palette is strictly opt-in so a shared component change couldn't
  regress the tissue approach corridor.

## Verified

- Gate green: typecheck · lint · **137 tests** · `npm run build` (462 kB gzip).
- User-confirmed in their browser: green-coated limbs with blue reading through,
  distinct gold/amber beads, colored (not white) tips, warm multicolor field scatter.

## Open items

- Perf spot-check: dev HUD showed 37 FPS at the dwell with the r3f-perf panel +
  screenshot capture active (draw calls 26, well under budget) — confirm 60 in a
  clean focused window; only +250 drift particles were added.
- Optional live slider pass to further tune the exposed colors → freeze if changed.
- Chromatin's palette adoption lands with its own scene (Phase 5).

## Key file paths

`src/scales/cellular/shaders/arbor-{trunk,puncta,tip,strand}.frag.glsl` ·
`src/scales/cellular/arbor-geometry.ts` (hexToRgb sRGB→linear) ·
`src/scales/cellular/arbor-params.ts` (LOOK_DEFAULTS, PUNCTA_PALETTE) ·
`src/scales/cellular/arbor-atmosphere.tsx` (CANOPY_DRIFT) ·
`src/scales/tissue/atmosphere-motes.tsx` + `shaders/atmosphere-motes.{vert,frag}.glsl`
(opt-in per-particle palette)
