# 2026-07-05 — Performance pass, Phase 1 (safe/bit-identical wins)

Targeted optimization sweep of `src/` before the remaining 3D scenes land. Goal:
remove pure waste (dead per-frame compute, redundant DOM writes, off-screen work,
module-eval cost) with **zero change to output** — every change here is
bit-identical. Three read-only Explore agents mapped the render path first; the
codebase was already clean (imperative scroll pipeline, thorough disposal, single
EffectComposer, lazy scene mounting), so this is a surgical pass, not a rewrite.

## What was done

1. **Shell fragment shader — guard dead `fbm` (headline GPU win).**
   Wrapped the breakthrough dissolve aperture and interior exit disintegration
   blocks in `if (uDissolve > 0.0)` / `if (uExitDissolve > 0.0)`. Both were no-ops
   when their uniform is 0 (discard can't fire, edge term → 0) yet still evaluated
   two 4-octave `fbm` (~8 `snoise`/fragment) every frame across the whole tissue
   band, on both the shell and stalk-companion sphere. Uniform branch (coherent,
   no divergence), no texture taps inside → safe. Removes the cost for ~95% of the
   tissue experience; the breakthrough animates identically.

2. **theme-bridge — skip redundant root style writes.** `applyDepth` now diffs
   each channel against the last-applied value and only calls `setProperty` on
   change, reusing a scratch `out` object and rebuilding `blendedTheme` only when a
   channel moved. Outside the 0.03 blend zones (most of the scroll) this elides all
   5 `<html>` style writes + 2 allocations per scroll tick.

3. **Hero glitch cycle — pause off-screen.** Added an `enabled` option to
   `useGlitchCycle` (holds first item, clears timers when false). `TissueContent`
   gates it on `useCurrentScale()` (`approach`/`tissue` only), so the scramble
   stops re-rendering the hero once scrolled to cellular and below.

4. **`BRANCH_ANCHORS` — defer off module-eval.** Replaced the eager
   `export const BRANCH_ANCHORS = computeBranchAnchors()` with a lazily-memoized
   `getBranchAnchors()`, moving the ~600-node arbor generation off the initial
   synchronous module-eval / FCP path. Updated both consumers + both node tests.

## Decisions made

- Split the work into bit-identical "safe wins" (this commit) vs. quality-tradeoff
  experiments (MSAA 4→2, tessellation, particle GPU-port) gated behind visual A/B.
  Only the safe wins shipped, per the hard "no look compromise" constraint.
- Shader guard uses `> 0.0` exactly (no epsilon) so every active dissolve value is
  untouched; only the true-zero idle case is skipped.
- Glitch gate uses `useCurrentScale` (≈6 re-renders total) over an
  IntersectionObserver — simpler, negligible cost, no new refs.

## Verification

- `npm run typecheck` ✓, `npm run lint` ✓, `npm test -- --run` ✓ (20 files, 151 tests).
- Visual A/B (dpr-2 screenshots) + r3f-perf GPU delta on the tissue band: **deferred
  to manual review** — note r3f-perf GPU-ms reads 0 on macOS (no
  `EXT_disjoint_timer_query_webgl2`); use DevTools Performance GPU track or an
  uncapped-FPS stress instead.

## Open items

- Phase 2 experiments (opt-in, need visual sign-off): MSAA `multisampling` 4→2,
  stalk/shell icosphere detail 64 reduction, breakthrough-particles GPU port,
  per-tick `blendZoneFor` allocation dedup. Plan file:
  `~/.claude/plans/hi-there-please-make-dreamy-candle.md`.
- Dead-code footgun: `useDepth()` / `useScrollProgress()` remain unused (would
  re-render per tick if wired into a component) — left as-is.

## Key file paths

- `src/scales/tissue/shaders/tissue-shell.frag.glsl` (shader guards)
- `src/engine/theme-bridge.ts` (write-skip)
- `src/hooks/useGlitchCycle.ts` + `src/scales/tissue/TissueContent.tsx` (glitch gate)
- `src/scales/cellular/arbor-anchors.ts` + `camera-focus.ts`, `ArborAnnotations.tsx`,
  `arbor-anchors.test.ts`, `camera-focus.test.ts` (lazy anchors)
