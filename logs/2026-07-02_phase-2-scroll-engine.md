# Phase 2: Scroll Engine & Depth System

**Date:** 2026-07-02

## What was done

Wired Lenis + GSAP ScrollTrigger + the Zustand depth store so scroll drives a
canonical `depth` (0–1), with per-scale color blending, an animated depth
indicator, centralized reduced motion, and URL fragment sync. No 3D yet — the
warm→cool shift is visible in the HTML layer.

- **`src/engine/scale-manager.ts`** (new) — canonical scale order/boundaries;
  `scaleFromDepth`, `scaleProgressFor`, `blendZoneFor`, `nextTransitionState`;
  the piecewise `rawProgressToDepth`/`depthToRawProgress` remap; DOM
  `measureSectionBoundaries`; pure `hashForScale`/`scaleFromHash`. Owns all
  domain logic moved out of the store.
- **`src/stores/depth.ts`** — `subscribeWithSelector`; adds `previousScale`,
  `isTransitioning`, `scaleProgress`; re-exports scale constants for the 4
  existing importers (no changes needed there).
- **`src/engine/scroll-engine.ts`** (new) — singleton Lenis (`autoRaf:false`,
  driven by gsap.ticker) + one master ScrollTrigger. `onUpdate` remaps raw
  progress → canonical depth. `ResizeObserver` on `<main>` + `document.fonts.ready`
  re-measure on reflow. `import.meta.hot.dispose` tears down on HMR.
- **`src/engine/theme-bridge.ts`** (new) — reads each scale's resolved channel
  colors once from its section, writes blended values onto `<html>` inline style
  per depth tick via `gsap.utils.interpolate` (stateless, scroll-scrubbed). Sets
  `data-current-scale` on `<html>` for fixed chrome. Loud error if a channel
  resolves to an unresolved `var(...)`.
- **`src/components/DepthIndicator.tsx`** — store-driven active dot/label;
  imperative fill (intra-scale progress) with no re-render per tick; Lenis-routed
  click jumps; keyboard scale nav (Arrow/PageUp-Down, guards form fields);
  label crossfade via `key`.
- **Reduced motion** — `src/stores/motion.ts` (`osReduced || userReduced`,
  localStorage-persisted) + `useReducedMotion` + `MotionToggle`. App reflects
  `reduced` onto `<html data-motion>` + `setEngineReducedMotion` (lenis lerp→1).
  `[data-motion='reduced']` CSS mirrors the `@media (prefers-reduced-motion)`
  blocks. `useReveal`/`useGlitchCycle` now read the hook (live toggle, not
  mount-only); glitch span got a visually-hidden SR label + `aria-hidden`.
- **`src/engine/url-scale-sync.ts`** (new) — `replaceState` on scale change +
  hashchange/initial-hash jump via Lenis.
- **`src/scales/expression/TerminalMail.tsx`** — `lenis.stop()/start()` on
  open/close + `data-lenis-prevent`.
- **globals.css** — dropped `scroll-behavior:smooth`; `@import lenis.css`;
  `html` bg → `var(--bg)`; motion mirrors; `.motion-toggle`; label crossfade;
  removed the fill's height transition.
- **Tests/CI** — `vitest.config.ts` (node env, `.test.ts`); 18 pure tests
  (scale-manager 15, depth store 3); `npm test -- --run` added to CI.

## Decisions made

- **Piecewise-canonical depth** (user-approved): sections have unequal heights,
  so raw scroll is remapped so each section owns its canonical band. Depth is a
  stable coordinate for Phase 3+ camera authoring; depth/px varies per section.
- **`data-current-scale`** on `<html>` (not `data-scale`) to avoid firing the
  existing `[data-scale]::before/::after` atmospherics on the root.
- **Blend via per-tick `gsap.utils.interpolate`**, not re-triggered `gsap.to()`
  (which janks) or `@property` CSS transitions (time-based, not scroll-scrubbed).
- **Standalone `vitest.config.ts`** — `defineConfig` from `vitest/config` in
  `vite.config.ts` collided with the plugins' Vite types (vitest bundles a
  nested Vite). Pure tests don't need the react/tailwind plugins.
- **Hash mappers in `scale-manager.ts`** so the node test suite never transitively
  imports gsap/lenis through `scroll-engine`.
- Reduced motion keeps the depth pipeline running (theming depends on it); only
  smoothing + color interpolation are disabled.

## Open items

- **getComputedStyle var() resolution** is load-bearing for theme-bridge; the
  module errors loudly if it fails. Confirm in the dev-server check (verify #6).
- **Last section (expression) is not `full`-height** — if shorter than the
  viewport its top can't reach viewport top, compressing its band near depth 1.
  Handled gracefully (clamp + monotonic guard); confirm visually / consider
  `full` on expression if depth doesn't reach ~1.0 at the bottom.
- **Bare Arrow-key hijack** removes fine-grained keyboard scroll (SPEC §6 intent);
  revisit in the Phase 7 a11y re-audit; could soften to PageUp/Down only.
- Bundle still ~1.38MB (399KB gzip) — empty R3F Canvas pulls all of three.js;
  resolved by lazy per-scale mounting in later phases.
- For Phase 3: scenes read `previousScale`/`isTransitioning` for crossfades;
  `depthToRawProgress` exists for camera tooling.

## Verified

- `npm test -- --run` — 18 passed
- `npm run typecheck` — clean
- `npm run lint` — 0 errors
- `npm run build` — passes

Dev-server visual checks (scroll feel, color blend, indicator, reduced motion,
hash, modal lock) are pending user confirmation per verification checklist in
`PLAN.md`.

## Key file paths

- `src/engine/scale-manager.ts`, `scroll-engine.ts`, `theme-bridge.ts`,
  `url-scale-sync.ts` (new)
- `src/stores/depth.ts`, `src/stores/motion.ts` (new)
- `src/hooks/useDepth.ts`, `useCurrentScale.ts`, `useScrollProgress.ts`,
  `useReducedMotion.ts` (new); `useReveal.ts`, `useGlitchCycle.ts` (modified)
- `src/components/DepthIndicator.tsx` (rewrite), `MotionToggle.tsx` (new)
- `src/app.tsx`, `src/styles/globals.css`, `src/scales/tissue/TissueContent.tsx`,
  `src/scales/expression/TerminalMail.tsx` (modified)
- `vitest.config.ts`, `.github/workflows/ci.yml`
