# 2026-07-13 — Phase 8: Expression Scale (Signal Origin), Stages A–D

Implements `docs/PLAN-expression.md` (from DESIGN-terminal-expression §4–§6).

## What was done

- **Stage A (pure logic/seams):** `expression-beats.ts` (beat params + envelopes + sign-off scrub), `signal-geometry.ts` (`resolveSignalOrigin` — the custody handoff's single source of truth), `signal-pulse.ts`, `expression-fog.ts` (the descent's one NEGATIVE delta — the fog lifts), `signal-focus.ts` store; camera knots authored inside `(0.86, 1.0)` (0.92 `reducedAnchor`; 1.0 retuned to frame `AUTHORED_SIGNAL_ORIGIN`); `channelFocusPoseFor` in camera-focus; scene registry + atmosphere composition; reveal-seam CSS, `.expression-doc`, runways; `signoff`/`garnish` frontmatter slots.
- **Cursor custody (code-side fix):** `code-cursor-state.ts` now carries cell width/height; `CodeCursorSurvivor` hides at `dissolveEnd` while still writing the mirror; `SignalOriginNode` renders the mirror gate — position/size/blink continuous both directions (verified numerically in preview: adoption lerp exact per axis).
- **Stage B (scene):** merged 5-line tube fan with gentle bow (`signal-lines-geometry`), traveling-pulse + focus-dim + event-pulse + warm-bookend shader, packet Points with life-breathing sprites, `SignalOriginNode`, `SignalLines`; dev tools (look/beats/surface folders), `expression-preview.html` (`?beat/?depth/?dpr/?wheel/?handoff=1`). 3 scene draw calls.
- **Stage C (HTML):** `ExpressionIntro` (CoilIntro twin), `ExpressionAnnotations` — 5 terminus labels (mono register), iterative de-collision, focus-expand with real handles, `% mail zara ▊` prompt, sign-off anchor, idle garnish, CSS scanline overlay, `--expression-warmth` via color-mix; `TerminalMail` gained `onSuccess` → `fireSubmitSpark`; `mailOpen` lifted to the store (both registers, one dialog).
- **Stage D (closing movement):** `surface-flight.ts` + `SurfaceControl` (`> surface_`: fade → jump-under-dark → replay `INTRO_KEYFRAMES` push-in → land; Esc/wheel/touch cancel; reduced = instant cut; DEV reverse-scroll toggle); camera-controller third track + channel focus block (controller-owned blend tween, release at ±0.012); final-pulse threshold watcher.
- **Fix en route:** `ProjectCard` tag keys index-qualified (censored placeholder tags collide on value — content untouched, per the projects.json note).

## Decisions

- Custody transfer = mirror visibility gates on both sides of `dissolveEnd` + always-written mirror; origin eases adopted→authored over [0.86, 0.885].
- Channel focus is arbor-shaped (controller-owned tween; `focusBlend` doubles as `uFocusDim`); `channelFocusPoseFor` takes the resolved origin as a parameter so camera-focus stays pure.
- `> surface_` never touches the intro store — a third sampling track over `INTRO_KEYFRAMES`.
- Scanline is CSS (fixed overlay, no GL pass); warm bookend is one pure `warmBookendT` dual-written to uniforms + `--expression-warmth`.
- Submit spark + final pulse share one `uEventPulse` uniform pair (max of two stamps).
- `packetDensity` moved to look params (pattern A — pool rebuild needs the push).

## Verification

- 323 tests green (42 new), typecheck/lint clean, prod build passes.
- Preview (dpr 2): adoption ease numerically exact; custody gates both sides; 3 scene draws; end beat reads amber-embers.
- Live site: labels/focus/Esc/mail/scanline pass; floor state (sign-off typed, warmth 1.0, `> surface_` revealed); ascent lands pop-free on the establish frame; reduced-motion instant paths pass.
- Perf (500 ms windows, dpr 2): expr plateau 620 calls / 29.1k tris / 930 pts (≈20 calls/frame incl. composer); code dissolve shows exactly +1 call/+2 tris (the survivor quad).

## Open items (Stage E remainder — needs Zara)

- Leva tune + bake both bands: expression look/beats/fan/`AUTHORED_SIGNAL_ORIGIN`+camera knots (one bake), terminal beats/window look (Phase 7 fold-in); runway height feel passes; the code→expression seam as one movement (§6.6 dissolve-overlap answered by feel).
- Judge the reverse-flight experiment (keep the DEV toggle or delete).
- Content (§6.5): sign-off line, expression intro prose, resume URL (`#`), garnish line (default provided); censored `projects.json` fields.
- Mobile pass + SR spot-check.

## Key paths

`src/scales/expression/*` (scene, annotations, beats, geometry, fog, params), `src/stores/signal-focus.ts`, `src/engine/{surface-flight,camera-controller,camera-focus,camera-keyframes,scene-manager,scene-atmosphere}.ts(x)`, `src/components/SurfaceControl.tsx`, `src/scales/code/{code-cursor-state.ts,CodeCursorSurvivor.tsx}`, `expression-preview.html`, `src/dev/expression-{dev-tools,preview}.tsx`, `globals.css`, `content/sections/expression.md`, `docs/PLAN-expression.md`.
