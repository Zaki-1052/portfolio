# 2026-07-12 — Phase 7 code terminal: Stages A–D implemented

Per `docs/PLAN-code-terminal.md` (approved). All of Stages A–D are code-complete;
typecheck, ESLint, `vitest run` (278 tests, 33 files), and the production build
are green. Visual verification (preview + live scroll feel) is the open item.

## What was done

- **Stage A (pure logic + seams):** `terminal-beats.ts` (beat thresholds, scrubs,
  `windowPosePhase`, `windowOpacityFor`, live params), `code-window-pose.ts`
  (flight offsets with the no-pop invariant, locked rect), `utils/quaternion.ts`
  (forward rotation), `terminal-output.ts` (event/tap reveal math),
  `terminal-rows.ts` (projects.json → dir/symlink rows), `code-fog.ts`
  (sustain-only additive delta + green tint), `stores/terminal-focus.ts` — each
  with colocated tests. Camera knots at 0.71/0.79/0.86 (+ test), scene registry
  entry, fog composed in scene-atmosphere, `Project.highlights/readmeSize` +
  lorem content, reveal-seam/runway/doc-yield CSS, CodeContent two-register shape.
- **Stage B (3D):** `window-chrome` SDF shader (macOS chrome: rounded rect,
  brushed title band, traffic lights, faked-extrusion rim/AO, bloom-riding green
  edge glow, flight cursor), `CodeWindowFrame` (screen-locked pose composition),
  `code-environment` (grid + drift motes, 2 draw calls), `CodeCursorSurvivor` +
  `code-cursor-state.ts` (Phase-8 seam), `CameraController` priority `-1`,
  `code-live-params.ts`, `code-dev-tools.tsx`, `code-preview.html` + tsx.
- **Stage C (HTML interior):** `TerminalWindowContent` (layout-box projection
  tick + execute-stamp watcher), `TerminalPromptLine` (scroll-scrubbed
  boot/exit, tap clock), `TerminalInteractiveListing`, `TerminalChips`,
  `TerminalStatusBar`, terminal CSS block (inverse-video selection, print
  stagger, phosphor glow token).
- **Stage D:** `TerminalPager` (focus card, q/Esc/✕/scroll-away, focus
  restore), shared `utils/focus-trap.ts` (TerminalMail now imports it),
  `depthToScrollY` in scroll-engine, tap-to-complete accelerator, symlink
  departure flash, arrow-key roving focus, reduced-motion CSS.

## Decisions made

- Farewell hold sub-beat `[0.845, 0.850]` so the logout output is readable.
- `windowFlightOffset` returns exact `+0` at phase 1 (`term()` helper — negative
  constants × 0 give `-0`, which breaks exact-equality invariant tests).
- Code fog is sustain-only (no spike): digital clarity; zero outside [0.71, 0.86].
- `code-live-params.ts` lives in the scale folder (coil precedent), not `src/dev/`.
- Focus-trap selector gained `a[href]` (pager link cycling; TerminalMail has no
  anchors — behavior-neutral there).
- Accelerator is pointer-only garnish (prompt lines stay aria-hidden/unfocusable).
- Cursor relay: shader (flight only) → CSS `intro-blink` (HTML live, incl. a bare
  cursor after the farewell) → survivor mesh frozen at `farewellHoldEnd`.

## Open items

- Visual pass pending: `npm run dev` → `/code-preview.html?beat=…&dpr=2` (wheel
  scrubs depth), draw calls via `window.__preview.gl.info.render`; then live-site
  scrub/keyboard/reduced-motion passes (Stage D exit checks).
- Stage E: leva tune + bake blessed values, runway-height feel pass, r3f-perf
  baseline per beat, optional tmux split-pane variant.
- Survivor cursor freezes at an approximate prompt seat (−0.55 halfW, −0.2 halfH);
  Stage E may sync it to the farewell cursor's exact DOM position.

## Key file paths

`src/scales/code/*` (all new terminal modules + shaders/), `src/stores/terminal-focus.ts`,
`src/utils/{quaternion,focus-trap}.ts`, `src/dev/{code-dev-tools,code-preview}.tsx`,
`src/engine/{camera-keyframes,camera-controller,scene-manager,scene-atmosphere,scroll-engine,post-fx-curves}.*`,
`content/projects.json`, `src/content/types.ts`, `src/styles/globals.css`, `code-preview.html`.
