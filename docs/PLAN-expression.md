<!-- docs/PLAN-expression.md — implementation plan for DESIGN-terminal-expression.md §4–§6 (Phase 8, the expression scale). Approved 2026-07-13. -->

# Phase 8 — The Expression Scale (Signal Origin)

## Context

`docs/DESIGN-terminal-expression.md` §5 is validated and ready to build: the expression band `[0.86, 1.0]` becomes the signal-origin scene — the code scale's surviving cursor becomes a small emissive node radiating five luminous lines (one per `content/links.json` channel: email, GitHub, LinkedIn, Bluesky, resume), annotated in the `CoilAnnotations` grammar, with a scene-native `% mail zara ▊` trigger, a closing movement (wind-down → sign-off scrub → warm bookend + final pulse → `> surface_`), and a CRT scanline overlay. This is the last scale; the site closes by signing off.

Zara's scope decisions (2026-07-13): **both optional extras are in** (idle-garnish line §5.5.5; reverse-flight ascent as a DEV-only toggle) and **Phase 7's open Stage E folds into this plan's Stage E** — the code→expression seam (dissolve → surviving cursor → signal arrival) gets tuned as one movement.

Current state (verified in source):
- No `expression` entry in `SCENE_REGISTRY`; no camera knot inside `(0.86, 1.0)` (bare interpolation 0.86 → 1.0 knot; the 0.86 knot is not `reducedAnchor`, so the reduced track jumps 0.79 → 1.0); no fog module (base curve is flat 0.014 past depth 0.31); no color-temperature mechanism anywhere (`theme-bridge.ts` only blends at internal boundaries — nothing after expression).
- The handoff seam is built but **write-only**: `code-cursor-state.ts` is written every active frame by `CodeCursorSurvivor.tsx` (activates at `farewellHoldEnd` 0.85, freezes world position + cell size, blinks `elapsedTime % 1.06 < 0.53`, `#98c379`×1.4 `toneMapped:false`) with **no upper depth bound** — it renders until `CodeScene` unmounts at ≈0.92. `MOUNT_MARGIN` 0.06 means both scenes are live across `[0.80, 0.92]`.
- The live-site canvas is `pointerEvents:'none'` (`app.tsx:150`) — mesh `onClick` fires only in previews; all live tap targets are projected HTML.
- `ExpressionContent.tsx`: doc register with contact links + `mail-trigger` (local `useState` mailOpen) + `<TerminalMail>`; **no** `.expression-doc` wrapper, runways, or reveal-seam CSS entries. `trapFocus` already extracted to `src/utils/focus-trap.ts`. `useTerminalMail.ts` has exactly one `phase:'success'` site (~line 115).
- `INTRO_KEYFRAMES = [{far pose}, {...CAMERA_KEYFRAMES[0], depth:1}]` — sampling it by progress 0→1 IS the overture push-in; `LoadingSequence.skip()` is the fade+instant-jump precedent. `useIntroStore` is designed to never re-enter after `done` — do not reuse it for the surface return.
- Frontmatter parser is generic key:value pass-through — new fields only need optional entries on `SectionFrontmatter` (`src/content/types.ts:85`).

---

## Architecture decisions (the load-bearing ones)

1. **Cursor custody transfer at 0.86 — a required fix on the code side.** `CodeCursorSurvivor` gains an upper visibility bound: `mesh.visible = active && depth < p.dissolveEnd` — while **still writing `setCodeCursorState(...)` every active frame** (the reader needs a live position past 0.86). `code-cursor-state.ts` is extended to also carry the frozen **cell width/height** (`setCodeCursorState(x, y, z, w, h, active)`), so the expression node can adopt size, not just position. `SignalOriginNode` renders the mirror gate (`depth ≥ dissolveEnd`), same blink formula on the same `state.clock` → position, size, and blink phase are all continuous in both scroll directions; no double-render, no pop. Reverse-scrub is symmetric for free.

2. **`resolveSignalOrigin(depth)` is the single source of truth for "where is the node."** Pure function in `signal-geometry.ts`: adopts the live cursor mirror when active, else an authored fallback (`AUTHORED_SIGNAL_ORIGIN` — deep links / no-handoff paths), and eases adopted → authored across `[0.86, 0.885]` as a pure function of depth (reversible; re-freezing after a rewind re-triggers the ease correctly). Three consumers — `SignalOriginNode`, `SignalLines`, `camera-controller` — can never disagree (the `windowLockedRect` single-source precedent).

3. **Live interactivity is HTML-only; mesh handlers are preview parity.** `ExpressionAnnotations` (CoilAnnotations pattern: `worldToScreen` + `getCameraPose()` gsap-ticker with skip-work guard, viewport clamp, de-collision, real buttons, Esc clears, retiring first-focus hint) owns all taps. `SignalLines` additionally gets `onClick`/`onPointerMove` deriving the channel from the intersected geometry's `aChannel` attribute — functional only in the preview, exactly like `CoilMesh.handleClick`.

4. **Third camera focus block is controller-owned (arbor shape, not coil shape).** Channel focus changes no geometry — it dims a uniform and pivots the camera — so `focusBlend` in the new `signal-focus.ts` store is tween-owned by a `camera-controller.tsx` subscription (verbatim mirror of the `useBranchFocusStore.subscribe` block, reusing `FOCUS_TWEEN_S`/`HELD_POSE_OMEGA`), and the same field double-serves as `SignalLines`' `uFocusDim`. New `channelFocusPoseFor(origin: Vec3, channel): CameraSample` in `camera-focus.ts` takes the **resolved origin as a parameter** so that module stays pure/node-testable; the controller computes `resolveSignalOrigin(depth)` once per frame and passes it in.

5. **`> surface_` = a third camera sampling track, reusing `INTRO_KEYFRAMES` — no new keyframe table, no intro-store re-entry.** New module mirror `src/engine/surface-flight.ts` (`{active, progress}` + start/setProgress/cancel — the `camera-pose.ts` data-module pattern). `camera-controller` samples `sampleCamera(progress, INTRO_KEYFRAMES)` while active (parallax reset like the intro). Sequence (skip-control precedent, absorbs PLAN2 §9.5's scroll-to-top): fade overlay in ~0.5 s → `lenis.stop()` + `scrollTo(0, {immediate, force})` under cover of darkness → flight tween 2.5 s `power2.inOut` writing progress + `invalidate()`, overlay fading out 0.8 s in parallel → on complete `cancelSurfaceFlight()` + `lenis.start()`. Cancel (Esc / wheel / touch) is always safe: real scroll is already at 0; only the decorative track stops, and the controller falls back to `sampleCamera(0, …)` — structurally the flight's own endpoint. Reduced motion: instant cut, no flight.

6. **One event-pulse mechanism serves both the submit spark and the final pulse.** Two wall-clock stamps in the store (`signalBurstFiredAtMs`, `finalPulseFiredAtMs`); `SignalLines` computes `uEventPulseT = max(eventPulseProgress(a), eventPulseProgress(b))` on the email channel — one uniform pair, one shader path. Two-clock rule holds: ambient pulses ride `uTime`; these two are event-driven; the sign-off scrubs on depth.

7. **Scanline is CSS, not a GL pass.** The one shared `EffectComposer` stays untouched (its own header forbids growth casually); the design's phrasing — "the HTML register's scanline texture carries into the scene" — is literal: a fixed `pointer-events:none` div at `--z-overlay` with a `repeating-linear-gradient`, opacity = `scanlineOpacityFor(depth) ×` dev-tunable max (~0.04), written imperatively by the annotations ticker.

8. **Warm bookend is a bespoke depth envelope, dual-written.** `warmBookendT(depth)` (0 below ~0.95 → 1 at 1.0) drives (a) scene uniforms `uWarmT`/`uWarmColor` (lines + node lerp toward `--aod-gold` #e5c07b) and (b) a scoped CSS custom property `--expression-warmth` consumed via `color-mix()` on the sign-off and mail-trigger accents. Both sides read the identical pure function — no duplicated envelope math.

9. **Fog is a negative delta (relief).** `expression-fog.ts` returns a smoothstep-ramped **negative** density delta (zero below 0.86, thinnest at 1.0 — "the fog lifts"; sparsest scale) + a subtle warm tint blend tied to `warmStart`. Same additive composition in `scene-atmosphere.tsx`, after the code term; same zero-outside-window + product-is-zero non-overlap tests.

10. **Beats module follows pattern B** (`liveExpressionBeatParams`, mutable copy polled per frame, DEV-gated branch); look params follow pattern A (subscribable override). Every leva slider range brackets its shipped default.

---

## Stage A — Pure logic, state, seams (Vitest-provable first)

New files (pure, colocated `.test.ts`, node env):

| File | Purpose |
| --- | --- |
| `src/scales/expression/expression-beats.ts` + `.test.ts` | `ExpressionBeatParams` (`introStart .87, introEnd .90, annotationsReveal .90, windDownStart .95, warmStart .95, lastPulseAt .955, signoffStart .955, signoffEnd .985, surfaceRevealAt .97, pulseSpeed, packetDensity, eventPulseDurationMs, garnishIdleMs 20000, garnishMinDepth .985`) + frozen `EXPRESSION_BEAT_DEFAULTS` + mutable `liveExpressionBeatParams`; `expressionBeatFor(depth)`; `introRevealT`; `annotationsEnvelope` (rises at `annotationsReveal`, **never fades** — last scale); `windDownT` (0→1 across `[windDownStart, 1]`); `signoffCharsTyped(depth, text, p)` (monotonic/reversible/saturating, the `charsScrubbed` shape); `warmBookendT`; `scanlineOpacityFor(depth, max)` |
| `src/scales/expression/signal-geometry.ts` + `.test.ts` | `SignalChannelId` (`'email'\|'github'\|'linkedin'\|'bluesky'\|'resume'`); `SIGNAL_CHANNEL_IDS` ordered to match `ExpressionContent`'s email → socials → external; `SIGNAL_CHANNEL_DIRECTIONS` (authored normalized fan), `SIGNAL_LINE_LENGTH`, `AUTHORED_SIGNAL_ORIGIN` (placeholder, tuned Stage E), `ORIGIN_EASE_START = SCALE_BOUNDARIES[6]`, `ORIGIN_EASE_END = 0.885`; `signalChannelTerminus(origin, channel)`; `originBlendT(depth)`; `resolveSignalOrigin(depth, cursor = getCodeCursorState(), authored?)`; `resolveSignalNodeSize(depth, cursor?)`; `channelIndexOf(channel)` |
| `src/scales/expression/signal-pulse.ts` + `.test.ts` | `eventPulseProgress(firedAtMs \| null, nowMs, durationMs)` — 0 while unfired, saturates at 1 (the `outputRevealAt` shape) |
| `src/scales/expression/expression-fog.ts` + `.test.ts` | `expressionFogDensityDeltaFor` (negative relief, zero < 0.86), `expressionFogColorBlendT` + `EXPRESSION_FOG_TINT`; non-overlap product test vs `codeFogDensityDeltaFor` |
| `src/stores/signal-focus.ts` + `.test.ts` | `SIGNAL_FOCUS_RELEASE_DELTA = 0.012`, `shouldReleaseSignalFocus`; store: `focusedChannel`, `hoveredChannel`, `focusBlend` (tween-owned by controller), `focusDepth`, `hintRetired`, `mailOpen`, `signalBurst`, `signalBurstFiredAtMs`, `finalPulseFiredAtMs`; setters incl. `fireSubmitSpark()` (increments + stamps), `fireFinalPulse()` (**idempotent** — safe to call every frame past threshold), `clearFinalPulse()` (rewind path, the `bootExecutedAtMs` null-on-rewind mold) |
| `src/scales/expression/ExpressionScene.tsx` | Placeholder `<group/>` — proves mount/unmount wiring |

Modified:

| File | Edit |
| --- | --- |
| `src/scales/code/code-cursor-state.ts` | State gains `width`/`height`; `setCodeCursorState(x, y, z, w, h, active)` (decision 1) |
| `src/scales/code/CodeCursorSurvivor.tsx` | Pass frozen cell size into the mirror; gate `mesh.visible = active && depth < p.dissolveEnd` — the state write stays unconditional while active |
| `src/engine/camera-keyframes.ts` | New knots in `(0.86, 1.0)`: arrival ≈0.88, plateau ≈0.92 (`reducedAnchor: true`), closing ≈0.97; retune the 1.0 endpoint's `target` to frame `AUTHORED_SIGNAL_ORIGIN` (keep its `reducedAnchor: true`); table commentary convention |
| `src/engine/camera-keyframes.test.ts` | Assert a `reducedAnchor` knot inside `(0.86, 1.0)`; depths strictly increasing |
| `src/engine/camera-focus.ts` + `.test.ts` | Add `channelFocusPoseFor(origin, channel)` (decision 4) + tests: looks at the terminus, deterministic for fixed origin |
| `src/engine/scene-manager.tsx` | `expression: ExpressionScene` + `SCENE_KEYS` entry (`'signal-origin'`) |
| `src/engine/scene-atmosphere.tsx` | Compose expression fog delta/tint after the code term |
| `src/content/types.ts` | `SectionFrontmatter` gains `signoff?: string`, `garnish?: string` |
| `content/sections/expression.md` | Add `signoff:` (lorem) and `garnish: % nothing further down. scroll to ascend.` frontmatter slots (§6.5) |
| `src/styles/globals.css` | (1) add `[data-scale='expression']` to reveal-seam groups 1–2 only (the `code + [data-scale]` sibling rule already strips expression's top border; no "own top border" rule needed — code IS scene-native); (2) `[data-webgl='active'] [data-scale='expression'] .expression-doc { display: none; }`; (3) `.expression-runway--arrival/--plateau/--closing` shells (~100/120/90 vh starters, `[data-webgl='active']`-gated) |
| `src/scales/expression/ExpressionContent.tsx` | Wrap doc body in `.expression-doc`; add runway divs; `mailOpen` moves from local `useState` to `useSignalFocusStore` (both registers share one field); no-WebGL output otherwise unchanged |

**Exit check:** `npm run test` + `npm run typecheck` green; band mounts/unmounts the placeholder; `.expression-doc` hidden under WebGL; survivor cursor vanishes at exactly 0.86 with no double-cursor.

## Stage B — 3D scene + preview

New files:

| File | Purpose |
| --- | --- |
| `src/scales/expression/signal-lines-geometry.ts` | `buildSignalLineGeometry` / `writeSignalLineGeometry` — ONE merged BufferGeometry, thin tube per line on the `writeRibbonGeometry` mold with a **gentle authored bow** (dead-straight radial lines read machined; organic-above-all rule), per-vertex `aChannel` (0–4), `aArcT`, `aTint` (per-channel terminus accent: contribution-green / LinkedIn blue / amber email — accents only, §5.1) |
| `src/scales/expression/signal-materials.ts` + `shaders/signal-line.{vert,frag}.glsl` | drei `shaderMaterial`: traveling-pulse idiom (`fract(uTime·uFlowSpeed + aChannel·0.29)` + smoothstep front), event-pulse pass (`uEventPulseChannel`/`uEventPulseT`, JS-computed), focus dim (`uFocusChannel`/`uFocusDim`/`uHoverChannel` — the arbor-strand idiom), `uWarmT`/`uWarmColor`, `uOpacity` reveal, fog pair from `getSceneFog()` |
| `src/scales/expression/SignalOriginNode.tsx` | Emissive billboarded quad at `resolveSignalOrigin(depth)`, visible `depth ≥ dissolveEnd`, adopts frozen cell size (eases to authored size with the origin ease), blink = `elapsedTime % CURSOR_BLINK_PERIOD_S < 0.5·period` (import the constant), `#98c379`×1.4 `toneMapped:false`, warm lerp via `warmBookendT` |
| `src/scales/expression/SignalLines.tsx` | Per-frame: `resolveSignalOrigin(depth)` + unconditional geometry rewrite (5 lines — the `breakthrough-particles` always-recompute precedent); ambient packets as ONE `THREE.Points` (positions = per-channel `origin + dir·progress`, time-driven phase per two-clock rule, sin(πp) opacity); uniforms from store (`focusBlend`→`uFocusDim`, channels via `channelIndexOf`) + `liveExpressionBeatParams`; `uEventPulseT` = max of the two stamps (decision 6); preview-only `onClick`/`onPointerMove` (decision 3) |
| `src/dev/expression-live-params.ts` | Subscribable override channel (pattern A): line/node look, glow, pulse speed, packet density, warm color, scanline max opacity, garnish on/off, `surfaceFlightMode: 'push-in' \| 'reverse-scroll'` (DEV experiment) |
| `src/dev/expression-dev-tools.tsx` | Leva: `'expression look'` (override), `'expression beats'` (writes `liveExpressionBeatParams` + `invalidate()`); ranges bracket defaults |
| `expression-preview.html` + `src/dev/expression-preview.tsx` | `code-preview.tsx` structure: `?depth=` / `?beat=before\|arrival\|plateau\|windDown\|signoff\|end`, `?dpr=` (default 2), `?wheel=` (clamped ≈[0.83, 1.0]), **`?handoff=1`** seeds `setCodeCursorState(...)` with a plausible frozen point pre-mount so the adoption ease + custody gates are testable in isolation; parks intro/depth stores; manual fog from the pure curves; real `<CameraController/> + <ExpressionScene/> + <PostFX/>`; `window.__preview` |

Modified: `ExpressionScene.tsx` (real children + `acquireAmbientRendering()` gated on `!reduced` — `CodeScene` shape), `app.tsx` (lazy DEV-gated `ExpressionDevTools`).

Draw calls: node 1 + merged lines 1 + packets 1 = **3** (≤5 budget; HTML costs zero).

**Exit check:** preview at each beat at dpr 2; `?handoff=1` shows the node adopting the seeded position at 0.86 and easing to authored by 0.885; scrubbing across 0.86 shows zero cursor pop; draw calls via `window.__preview`.

## Stage C — HTML layer: intro, annotations, focus grammar, mail, scanline

New files:

| File | Purpose |
| --- | --- |
| `src/scales/expression/ExpressionIntro.tsx` | `CoilIntro`/`ArborIntro` twin: `getSection('expression')` prose, `introRevealT` envelope (~0.87–0.90), `--lens-alpha` scrim, resolve-from-haze, reduced-motion opacity-only |
| `src/scales/expression/ExpressionAnnotations.tsx` | The CoilAnnotations pattern: one gsap-ticker projecting origin + 5 termini via `worldToScreen`; skip-guard on `pose.version/depth/w/h/focusBlend`; clamp + **angular-spread de-collision** (5 termini is denser than coil's 2 — a real declutter, not pairwise push); per-channel `<button>` label → `toggleFocus` (focus first; the **expanded** detail carries the real `<a target="_blank" rel="noopener">` handle — resume href stays `#`, Zara's TODO); `% mail zara ▊` origin-anchored trigger (reads `getTerminalIdentity().user`, flips store `mailOpen`); the sign-off `<p>` anchored below the projected origin (`signoffCharsTyped`); **idle garnish**: timer arms when depth ≥ `garnishMinDepth` and unchanged for `garnishIdleMs`, line types time-driven (~30 ms/char), any depth change clears it, reduced motion renders it instantly at timeout, leva-toggleable; scanline div opacity + `--expression-warmth` writes ride the same tick; Esc clears focus; store-held `hintRetired` |

Modified:

| File | Edit |
| --- | --- |
| `ExpressionContent.tsx` | Mount `ExpressionIntro` + `ExpressionAnnotations` beside the runways (the `ChromatinContent` slot); `<TerminalMail>` stays mounted here |
| `TerminalMail.tsx` | Gains optional `onSuccess?: () => void`, fired from a `useEffect` on the existing `isDone` derivation (each success transition fires once — repeated sends spark again, correctly); `ExpressionContent` passes `() => useSignalFocusStore.getState().fireSubmitSpark()`. `useTerminalMail.ts` untouched |
| `globals.css` | `.expression-annotation*` block (coil-annotation mold, green register, `--terminal-glow`-style phosphor on focused elements only); `.expression-scanline` (fixed, `--z-overlay`, repeating-linear-gradient, opacity imperative); `.expression-signoff`; `--expression-warmth` consumers via `color-mix(in srgb, var(--aod-gold) …, var(--aod-green))` |

**Exit check (live site):** intro resolves/clears; 5 labels de-collide at narrow widths; tap → line brightens, others dim (camera pivot verified after Stage D — soft dependency); Esc clears; both mail triggers open the same overlay; scanline only inside the band; Tab reaches intro → channels → mail.

## Stage D — Closing movement, `> surface_`, a11y, reduced motion

New files:

| File | Purpose |
| --- | --- |
| `src/engine/surface-flight.ts` | Module mirror: `getSurfaceFlight()`, `startSurfaceFlight()`, `setSurfaceFlightProgress(t)`, `cancelSurfaceFlight()` (decision 5) |
| `src/components/SurfaceControl.tsx` | Mounted last in `app.tsx` chrome (natural DOM order = last Tab stop); visible when `currentScale === 'expression' && depth ≥ surfaceRevealAt`; `.surface-overlay` (fixed, `--z-intro`, aria-hidden) sibling `.surface-control` button (`--z-nav`, `> surface_`, local `--skip-text`/`--skip-accent` duplication like `.skip-intro`, blinking caret on `intro-blink`); full sequence per decision 5; Esc/wheel/touch cancels to instant landing; reduced motion instant cut; **DEV reverse-flight toggle**: when `surfaceFlightMode === 'reverse-scroll'` (leva, `import.meta.env.DEV`-gated so it cannot ship), do `lenis.scrollTo(0, { duration: ~10s })` instead — no overlay, no flight track; the parked §5.5 experiment, felt once then judged |

Modified:

| File | Edit |
| --- | --- |
| `camera-controller.tsx` | (1) surface track: `s = surfaceActive ? sampleCamera(progress, INTRO_KEYFRAMES) : introActive ? … : …`; parallax reset while `surfaceActive`; (2) third held-pose focus block via `channelFocusPoseFor(resolveSignalOrigin(depth), channel)`; (3) `useSignalFocusStore` subscription owning the `focusBlend` tween (branch-focus mirror); release rule: `shouldReleaseSignalFocus(depth, focusDepth)` checked in the same block (branch precedent — controller-owned here) |
| `SignalLines.tsx` | Wind-down: `windDownT` dims `uFlowSpeed`/packet opacity/brightness toward embers; threshold watcher (`prevDepth` ref): forward-cross `lastPulseAt` → `fireFinalPulse()`, rewind below → `clearFinalPulse()`; `uWarmT` from `warmBookendT` |
| `globals.css` | `[data-motion='reduced']` + matching `@media` blocks: sign-off instant, garnish instant-at-timeout, scanline static, surface instant cut; `.surface-*` styles |

**Exit check:** wind-down dims past 0.95; sign-off scrubs forward/backspaces in reverse; final pulse fires once per forward-crossing, never re-fires on dwell; warmth bleeds into scene + HTML together by 1.0; mail submit sparks the email line regardless of scroll; `> surface_` reveals past 0.97, flight lands pop-free at the hero, cancel mid-flight never breaks the pose; garnish types after a 20 s dwell and clears on scroll; keyboard-only full pass; reduced-motion pass with all content reachable.

## Stage E — Combined tune/bake/perf (Phase 8 + Phase 7 leftovers) + log

Phase 8: tune `AUTHORED_SIGNAL_ORIGIN` + the new camera knots **together** (preview + live `CameraDevTools`), bake both in one pass; tune `SIGNAL_CHANNEL_DIRECTIONS` against the de-collision until no width overlaps; freeze blessed `liveExpressionBeatParams`/look overrides into shipped defaults; `.expression-runway--*` height feel pass (the only pacing lever).

Phase 7 fold-in (Stage E was never done): leva tune + bake of terminal beats/window look (`liveTerminalBeatParams` → `TERMINAL_BEAT_DEFAULTS`, `code-live-params` → `CODE_WINDOW_DEFAULTS`); `.code-runway--*` feel pass; **the code→expression seam tuned as one movement** (exit scrub → farewell → dissolve → surviving cursor → signal arrival → intro window; §6.6's dissolve-overlap question answered here by feel); judge the reverse-flight experiment (keep the toggle or delete it); Zara's live-site pass on both bands (scrub reversibility, keyboard, reduced motion, mobile).

`r3f-perf` baselines per beat in **both** previews, recorded in the session log `logs/2026-07-XX_phase-8-expression-signal.md`. Content slots stay lorem for Zara (§6.5: sign-off, intro prose, resume URL, garnish line default provided).

---

## Testing

Vitest (node, colocated): `expression-beats` (boundaries exact; `signoffCharsTyped` monotonic/reversible/saturating; `annotationsEnvelope` never fades; `warmBookendT` endpoints), `signal-geometry` (`resolveSignalOrigin`: authored when cursor inactive, exact cursor at ease start, exact authored at ease end; terminus distance; `channelIndexOf` bijective), `signal-pulse` (null → 0; saturates; monotonic), `expression-fog` (zero < 0.86; product-is-zero vs code across [0,1]; strictly thinning), `signal-focus` (release at ±0.012 exactly; `fireFinalPulse` idempotent; `clearFinalPulse`), extended `camera-focus` + `camera-keyframes`. Manual-only: shaders, projection/de-collision, keyboard/focus, reduced motion, surface flight, garnish timing.

## Verification

- **Preview only:** `expression-preview.html?beat=…&dpr=2` (+ `?handoff=1`), Playwright MCP + `window.__preview` draw calls; shaders at dpr 2.
- **Live site only:** scroll feel, 0.86 handoff both directions, focus pivot, mail spark, closing sequence, `> surface_` + cancel, keyboard/a11y — needs `npm run dev` (Zara's terminal or running instance).
- Commands: `npm run typecheck`, `npm run lint`, `npm run test` (subset while iterating; full before done).

## Risks

| Risk | Mitigation |
| --- | --- |
| Double cursor in the `[0.86, 0.92]` scene-overlap window | Mirror visibility gates on both sides of `dissolveEnd`; state write never stops (decision 1); verified both scrub directions |
| 5 annotation labels collide (coil only ever had 2) | Angular-spread declutter budgeted in C + fan-angle tuning in E; narrow viewports checked first |
| Frozen cursor position varies with viewport/parallax at freeze | Origin ease → authored anchor by 0.885 bounds the variance window; camera knots frame the authored point |
| Stage C taps ship before Stage D's camera pivot | Soft dependency flagged; taps still focus + dim correctly without the pivot |
| Surface flight racing real scroll | Real scroll already at 0 before the flight starts; cancel stops only the decorative track (controller falls back to the same pose) |
| Warm bookend drifts between HTML and GL | Single pure `warmBookendT` read by both sides |
| Fast scroll-through skips wind-down/final pulse | Accepted — decorative, per Phase 7's survivor-beat precedent |
| Reverse-flight toggle leaks to prod | Lives behind `import.meta.env.DEV` in dev-tools; judged and possibly deleted in Stage E |
