# Phase 2: Scroll Engine & Depth System — Plan

## Context

Phase 1 built the full HTML content layer (6 scale sections, populated from markdown/JSON,
navigable, accessible). Phase 2 makes it move: Lenis smooth scroll + GSAP ScrollTrigger + the
Zustand depth store, wired so scroll drives a canonical `depth` (0–1), CSS custom properties
blend warm→cool per scale, the depth indicator animates from the store, reduced motion is
centralized (OS pref + on-page toggle), and URL fragments sync bidirectionally. No 3D yet — the
atmospheric shift is visible in the HTML layer. This is the coordinate-system foundation that
Phase 3+ camera keyframes and scene mounting are authored against.

## Decisions

- **Piecewise-canonical depth** (approved): sections have content-driven unequal heights, so
  `scale-manager` measures real section spans from the DOM and the scroll engine remaps raw
  ScrollTrigger progress so each section lands exactly on its canonical band (tissue→[0,0.17), …).
  Depth stays stable for camera authoring even when copy changes; depth/px varies per section
  (camera arrives when a section is on screen — intentional).
- **Root attribute is `data-current-scale`, NOT `data-scale`** — avoids triggering the existing
  `[data-scale]::before/::after` atmospherics on `<html>`. Same intent as PLAN-portfolio.md 2.3.
- **Cross-boundary color blend** = stateless per-tick `gsap.utils.interpolate` write of channel
  vars onto `documentElement.style` (not re-triggered timed tweens, not `@property` CSS
  transitions). Scale themes read once from each section via `getComputedStyle` — no duplicated JS
  color table. `TRANSITION_ZONE = 0.03` canonical units straddling each internal boundary.
- **Reduced motion = `osReduced || userReduced`** (toggle only adds reduction). Depth keeps
  updating; only smoothing/blending is disabled: `lenis.options.lerp = 1` (verified read live in
  1.3.25), theme snaps, nav jumps `immediate: true`, CSS `--dur-*` zeroed via `[data-motion]` mirror
  blocks that parallel the existing `@media (prefers-reduced-motion)` no-JS floor.
- **StrictMode-safe singleton** engine (module flag guard; App effect has no cleanup).
- Extra scope approved: keyboard scale nav (Arrow/PageUp/Down) and a CI `vitest run` step.
- Verification split: Claude runs typecheck/lint/vitest/build; user runs commits and dev-server
  visual checks.

## Files

| Path | Change | Why |
|---|---|---|
| `src/engine/scale-manager.ts` | create | Canonical boundaries, scale/transition/blend derivation, piecewise remap, DOM measurement. Moves `SCALES`/`SCALE_BOUNDARIES`/`scaleFromDepth` out of `depth.ts`. |
| `src/engine/scale-manager.test.ts` | create | Pure-logic tests (node env). |
| `src/stores/depth.ts` | rewrite | `subscribeWithSelector`, transition state fields, re-exports scale-manager constants for the 4 existing importers. |
| `src/stores/depth.test.ts` | create | Store clamps + derived fields. |
| `src/hooks/useDepth.ts`, `useCurrentScale.ts`, `useScrollProgress.ts` | create | Thin store selectors (SPEC public API). |
| `src/stores/motion.ts` | create | `osReduced`/`userReduced`/`reduced`, localStorage-persisted. |
| `src/hooks/useReducedMotion.ts` | create | `reduced` selector. |
| `src/engine/scroll-engine.ts` | create | Lenis + GSAP ticker + master ScrollTrigger singleton. |
| `src/engine/theme-bridge.ts` | create | Scroll-driven root channel-var blending. |
| `src/engine/url-scale-sync.ts` + `.test.ts` | create | Hash↔scale mapping, replaceState sync, initial-hash jump. |
| `src/components/DepthIndicator.tsx` | rewrite | Store-driven active/fill/label + keyboard scale nav (reuses SCALE_INFO). |
| `src/components/MotionToggle.tsx` | create | On-page reduce-motion button. |
| `src/app.tsx` | modify | Init effect wires engine, theme-bridge, motion, url-sync; mounts MotionToggle. |
| `src/styles/globals.css` | modify | Drop `scroll-behavior:smooth`; `@import 'lenis/dist/lenis.css'`; `html` bg→`var(--bg)`; `[data-motion='reduced']` mirrors; `.motion-toggle`; `.depth-indicator__label` crossfade; fill transition tweak. |
| `src/hooks/useReveal.ts`, `useGlitchCycle.ts` | modify | Absorb inline `matchMedia` into `useReducedMotion` (live). |
| `src/scales/tissue/TissueContent.tsx` | modify | aria-hidden glitch span + stable SR label. |
| `src/scales/expression/TerminalMail.tsx` | modify | `lenis.stop()/start()` on open/close + `data-lenis-prevent`. |
| `vite.config.ts` | modify | vitest `test` block (node env, `.test.ts`). |
| `.github/workflows/ci.yml` | modify | `npm test -- --run` between lint and build. |

## Steps

Full step detail (with code) lives in the approved plan mirror at
`~/.claude/plans/per-the-current-state-sequential-flask.md`. Task-level tracking:

- [x] **1** scale-manager.ts + vitest harness + tests; depth.ts re-exports
- [x] **2** depth store transition state + thin hooks + store test
- [x] **3** scroll-engine.ts (Lenis+GSAP+ScrollTrigger) + globals.css scroll fixes + app wiring
- [x] **4** theme-bridge.ts (boundary color blend) + app wiring
- [x] **5** DepthIndicator store-driven rewrite + keyboard scale nav + label crossfade CSS
- [x] **6** motion store + useReducedMotion + MotionToggle + CSS mirrors + reveal/glitch absorption
- [x] **7** url-scale-sync.ts (wiring) + hash mapping in scale-manager + tests + app wiring
- [x] **8** TerminalMail scroll lock under Lenis
- [x] **9** CI test step + full verification + session log

**Deviations from the drafted step detail (all verified):** vitest lives in a
standalone `vitest.config.ts` (importing `defineConfig` from `vitest/config` in
`vite.config.ts` collided with the plugins' Vite types); the pure hash↔scale
mappers live in `scale-manager.ts` (not `url-scale-sync.ts`) so the node test
suite never imports gsap/lenis; `scroll-engine.ts` adds an `import.meta.hot`
dispose so dev never runs two engines.

## Edge cases

- **Last section shorter than viewport** — its top can't reach viewport top, so its measured band
  compresses toward the end. Handled gracefully (clamp01 + monotonic guard in
  `measureSectionBoundaries`); depth still reaches ~1.0 at page bottom. Flag in manual verify.
- **Late reflow (webfonts `font-display:swap`, 584KB pfp.png)** shifts section heights after first
  measure — `ResizeObserver` on `<main>` + `document.fonts.ready` → `ScrollTrigger.refresh()`.
- **StrictMode double-invoke / HMR** — module `initialized` flag; `import.meta.hot.dispose` tears the
  engine down before replacement so dev never runs two engines.
- **`getComputedStyle` var() resolution** — load-bearing for the no-color-table design; theme-bridge
  errors loudly if a channel resolves to an unresolved `var(...)`. Fallback: literal table.
- **Reduced-motion depth** — depth pipeline must keep running (theming depends on it); only smoothing
  and color interpolation are disabled.
- **Keyboard nav vs form typing** — global keydown bails on INPUT/TEXTAREA/SELECT/contentEditable.

## Verification

Claude runs these and reports raw output after each milestone:
1. `npm test -- --run` — scale-manager, depth store, url-sync suites pass.
2. `npm run typecheck` — clean (`tsc -b --noEmit`).
3. `npm run lint` — 0 errors.
4. `npm run build` — succeeds; test files not bundled.

User dev-server checks (`npm run dev`):
5. Slow full scroll top→bottom: background warm `#2c2a28`→cool `#21252b` continuously; headings
   Lora→Inter→Fira Code at boundaries; `ScrollTrigger.getAll().length === 1`; depth hits
   ~0.17/0.33/… as each section top reaches viewport top.
6. `getComputedStyle(document.getElementById('tissue')).getPropertyValue('--accent')` → resolved
   literal (not `var(...)`).
7. Depth indicator: dot glows current-scale accent while scrolling, fill advances *within* a section,
   label crossfades on boundary, click/arrow/PageUp-Down jump, Tab+Enter still work.
8. Reduced-motion toggle: instant scroll, snapped colors, static glitch, instant reveals; persists
   across reload; matches OS emulation.
9. `#protein` in URL lands there instantly; scrolling updates hash without polluting history.
10. `$ mail zara` open: wheel over modal doesn't move page; textarea scrolls; close resumes scroll.
