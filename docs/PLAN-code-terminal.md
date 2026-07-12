<!-- docs/PLAN-code-terminal.md — implementation plan for DESIGN-terminal-expression.md §3 (Phase 7, the code scale). Approved 2026-07-12. -->

# Phase 7 — The Code Scale (Terminal)

## Context

`docs/DESIGN-terminal-expression.md` §3 is validated and ready to build: the code band `[0.71, 0.86)` becomes a scene-native terminal — a macOS window that flies in as a 3D object, boots via a scroll-scrubbed `cd projects && ls -la`, parks as an interactive HTML listing (rows/chips/pager in the coil-focus grammar, terminal costume), then types `exit` and dissolves, leaving a surviving cursor as the seam into the expression scale. Expression (§5) is **out of scope**; only the cursor-handoff seam (§4) is designed in.

Current state (verified in source):
- `#code` section, `[data-scale='code']` tokens, `CodeContent.tsx`/`TerminalListing.tsx` (Phase-1 HTML), and `content/projects.json` plumbing all exist.
- No scene registered for `code` (`SCENE_REGISTRY`), no camera keyframes anywhere in `[0.565, 1.0]` (`camera-keyframes.ts:126-141` jumps straight to 1.0), no fog delta, and `code` is absent from all three WebGL reveal-seam selector groups (`globals.css:425-446`).
- No SDF/2D-chrome shader precedent exists — the window frame GLSL is new work. No camera-parenting precedent exists — screen-locking is a new (small) pattern.

---

## Architecture decisions (the load-bearing ones)

1. **Frame-ordering fix (one line).** `CameraController`'s `useFrame` (`camera-controller.tsx:111`) gets explicit priority `-1`. R3F stable-sorts subscribers by priority, so the camera pose is final before any default-priority `useFrame` runs. The screen-locked window then reads `state.camera` **directly** — fresh every frame, no 1-frame parallax swim. (Negative priority does not trip R3F's `priority > 0` manual-render mode; `EffectComposer` already owns rendering at priority 1.) Side benefit: retro-fixes the tolerated 1-frame lag in `atmosphere-halo.tsx`.

2. **Window pose = pure function of depth, composed in camera space.**
   - `windowPosePhase(depth)`: 0 at flight start → 1 by boot start → **holds 1 through the farewell hold** → 0 by dissolve end.
   - `windowFlightOffset(phase)` returns `{posOffsetLocal, tiltRad, scale}` with the **no-pop invariant**: all terms exactly zero at `phase = 1` (unit-tested), so flight-end and the camera-locked plateau pose are the same expression at the boundary — structurally seamless.
   - Mesh transform only; the fragment shader draws flat UV chrome and never knows about tilt.

3. **HTML compositing = layout box, not transform.** A `gsap.ticker` loop (exact `CoilAnnotations` pattern: skip-work guard on `pose.version/depth/w/h`) re-derives the locked rect from the *same pure functions* + `getCameraPose()`, projects two corners via `worldToScreen()`, and sets `container.style.{left,top,width,height}` in px. Not `transform: scale` — scaling rasterized text blurs; setting the layout box reflows real text crisp at any DPR. HTML exists **only** when `phase ≥ 0.999` (never tilted); otherwise `display:none`, or a static CSS rect under reduced motion. No `matrix3d`, no CSS3D.

4. **Farewell hold (correction to the design doc's beat table).** If the window starts receding at the exact execute depth 0.845, the `logout` / `Saving session ...completed.` output could never be seen (HTML dies with flatness). New sub-beat: pose holds flat through `[exitExecute, farewellHoldEnd≈0.850]` while the farewell prints event-driven; dissolve runs `[0.850, 0.860]`. Dev-tunable like every other beat.

5. **Cursor relay — three renderers, zero gap/overlap, all keyed off the same beat math:**
   - Shader cursor (`uCursorVisible`) during **flight only** (phase < 1);
   - CSS cursor (reuses `intro-blink` — its `1.06s steps(2)` **is** the design's 530ms on/off xterm rhythm) while HTML is live;
   - `CodeCursorSurvivor` mesh from `farewellHoldEnd` onward — freezes its world position at activation so it visually detaches as the window recedes ("left behind"), and writes a `code-cursor-state.ts` module mirror (the `camera-pose.ts`/`scene-fog.ts` pattern) that Phase 8's ExpressionScene can read later with no import cycle.

6. **Two clocks, implemented as three mechanisms, none needing new `invalidate()` discipline:**
   - Scroll-scrubbed commands: direct `useDepthStore` subscription writing text imperatively (depth updates come from Lenis/ScrollTrigger, independent of `frameloop="demand"`).
   - Event-driven output (listing print, farewell): store records the wall-clock ms of each forward threshold crossing (`bootExecutedAtMs`/`exitExecutedAtMs`, nulled on rewind); reveal is plain CSS transitions with `transition-delay` stagger — zero WebGL frames needed.
   - Tap-responses (`less cleave/README.md` completing itself): time-driven, `terminal-output.ts` pure math.

7. **No `selection` field in the store.** Rows/chips are real `<button>`/`<a>` elements — DOM focus + `:focus-visible` **is** the selection state (the design's own instruction). A parallel Zustand index would be a second, desync-able source of truth. Arrow keys = roving `.focus()` over a flat refs array; the inverse-video bar is pure CSS.

---

## Stage A — Pure logic, state, seams (everything provable in Vitest first)

New files (all pure modules colocated-tested, node env, `.ts`):

| File | Purpose |
| --- | --- |
| `src/scales/code/terminal-beats.ts` + `.test.ts` | Beat thresholds (`TerminalBeatParams`: flightStart .710, bootStart .735, bootExecute .755, exitStart .825, exitExecute .845, farewellHoldEnd .850, dissolveEnd .860, outputPrintMs 300, tapCompleteMs 220) + mutable `liveTerminalBeatParams` (the `liveCameraKeyframes` pattern); `terminalBeatFor(depth)`; `BOOT_COMMAND`/`EXIT_COMMAND`; `bootCharsTyped`/`exitCharsTyped` (monotonic, reversible, saturating); `windowPosePhase(depth)` |
| `src/scales/code/code-window-pose.ts` + `.test.ts` | `windowFlightOffset(phase)` (no-pop invariant at phase=1), `windowLockedRect(pose, fillFraction)` → half-extents at the standoff distance |
| `src/utils/quaternion.ts` + `.test.ts` | `rotateByQuat(v, q)` — forward rotation; production only has the inverse (`screen-project.ts`); round-trip tested against `lookAtQuaternion` |
| `src/scales/code/terminal-output.ts` + `.test.ts` | `outputRevealAt(lineCount, elapsedMs, totalMs)` — time-driven reveal math, `intro-typing.ts` shape |
| `src/scales/code/terminal-rows.ts` + `.test.ts` | projects.json → rows: tier-1 `scale==='code'` → dir rows (`drwxr-xr-x`, trailing `/`); tier-2 → symlink rows (`lrwxr-xr-x`, `name ->`, external href). Asserts exactly cleave/metaencode as dirs, all 5 tier-2 as symlinks |
| `src/scales/code/code-fog.ts` + `.test.ts` | Additive density delta + green tint blend, byte-for-byte the `coil-fog.ts` pattern; zero-outside-window + non-overlap product assertions vs coil/arbor |
| `src/stores/terminal-focus.ts` + `.test.ts` | `TERMINAL_FOCUS_RELEASE_DELTA = 0.012`, `shouldReleaseTerminalFocus`; store: `openProject`, `openDepth`, `hoveredRow`, `hintRetired`, `bootExecutedAtMs`, `exitExecutedAtMs` + setters (coil-focus mold) |
| `src/scales/code/CodeScene.tsx` | Placeholder `<group/>` this stage — proves mount/unmount wiring live |

Modified:

| File | Edit |
| --- | --- |
| `src/engine/camera-keyframes.ts` | New knots between 0.565 and 1.0: arrival ≈0.71, plateau center ≈0.79 (`reducedAnchor: true`), band exit 0.86 — camera essentially parked through the band (the *window* does the flying); authored with the table's commentary convention |
| `src/engine/camera-keyframes.test.ts` | Add: at least one `reducedAnchor` knot inside `[0.71, 0.86)` |
| `src/engine/scene-manager.tsx` | `code: CodeScene` in `SCENE_REGISTRY` + `SCENE_KEYS` entry |
| `src/engine/scene-atmosphere.tsx` | Compose `codeFogDensityDeltaFor`/`codeFogColorBlendT`/tint after the coil term |
| `src/engine/post-fx-curves.ts` | Comment-only fix: stale "code scale (depth 0.67)" vs real 0.71 boundary |
| `src/content/types.ts` | `Project` gains `highlights?: string[]`, `readmeSize?: string` |
| `content/projects.json` | cleave/metaencode get 2–3 lorem highlight bullets + fake readmeSize (`"2.1 kB"`) — the §6.5 content slots, Zara writes real copy after seeing them |
| `src/styles/globals.css` | (1) add `[data-scale='code']` to all three reveal-seam groups (`globals.css:425-446`); **plus** `[data-webgl='active'] [data-scale='code'] { border-top: none; }` — code's predecessor (protein) isn't scene-native, so no sibling rule covers code's own top border; (2) `[data-webgl='active'] [data-scale='code'] .code-doc { display:none; }`; (3) `.code-runway--arrival/--plateau/--exit` shells (starter heights ~110/140/70vh; DOM landmarks only — pacing is set by *total* section height, since `rawProgressToDepth` is linear within a scale) |
| `src/scales/code/CodeContent.tsx` | Wrap existing body in `.code-doc`, add `hideBadge`, add runway divs — exact `ChromatinContent.tsx` shape; no-WebGL render output unchanged |

**Exit check:** `npm run test` + `npm run typecheck` green; scrolling into the band mounts/unmounts the placeholder scene; `.code-doc` hidden under WebGL (band intentionally empty for now).

## Stage B — 3D window + environment (preview-verifiable)

New files:

| File | Purpose |
| --- | --- |
| `src/scales/code/code-window-materials.ts` + `shaders/window-chrome.{vert,frag}.glsl` | drei `shaderMaterial`; SDF rounded-rect frame in one fragment shader: matte body (`--aod-bg-deep`), darker title-bar band with subtle brushed finish, three precise traffic-light dots (true macOS red/yellow/green), thin edge highlight + soft AO faking the extrusion, emissive green edge glow (rides the existing shared Bloom threshold — **never a second EffectComposer**), shader cursor. ~13 uniforms: `uTime, uCornerRadius, uTitleBarHeight, uTitleBarColor, uBodyColor, uAccentColor, uEdgeGlowStrength, uCursorVisible, uCursorUV, uOpacity, uAspect`, fog pair from `getSceneFog()` |
| `src/scales/code/code-window-params.ts` | `CODE_WINDOW_DEFAULTS` + `applyWindowLook` (coil-params convention) |
| `src/scales/code/CodeWindowFrame.tsx` | Pose `useFrame` (default priority, reads `state.camera` directly): locked pose = `camera.position + forward·STANDOFF`, offset by `windowFlightOffset(phase)` along camera-local axes; also hosts the pager release check (one line, the "mesh owns the release rule" convention from coil) |
| `src/scales/code/code-environment.tsx` + grid/glyph shaders | Sparse green grid receding into depth (1 draw call) + faint drifting particle sprites — soft abstract marks, **not** readable glyphs (§3.10 bans Matrix rain); parallax is what sells the plateau's depth |
| `src/scales/code/code-cursor-state.ts` | `{position, visible}` module mirror — the Phase-8 handoff seam |
| `src/scales/code/CodeCursorSurvivor.tsx` | Activates at `farewellHoldEnd`, freezes world position, blinks (same 1.06s rhythm), persists past 0.86 |
| `src/dev/code-live-params.ts`, `src/dev/code-dev-tools.tsx` | Leva override channel + panel: window look, beat depths, scrub rate, output-print ms, glow/text-shadow intensity, environment variant (grid/glyphs/both), pager-vs-splitpane toggle (Stage E). **Every slider range brackets its shipped default** (leva clamps silently → dev diverges from prod) |
| `code-preview.html` + `src/dev/code-preview.tsx` | Isolated preview: `?depth=` / `?beat=flight\|boot\|plateau\|exit\|dissolve`, `?dpr=`, real PostFX, `window.__preview` for Playwright draw-call inspection — `chromatin-preview` structure |

Modified: `CodeScene.tsx` (real children + `acquireAmbientRendering()` under full motion so the cursor blinks at scroll rest), `camera-controller.tsx` (the `-1` priority, one line), `app.tsx` (lazy DEV-gated `CodeDevTools`).

Draw calls: frame 1 (+1 only if faked extrusion doesn't read physically in preview) + grid 1 + glyphs 1 + survivor cursor 1 ≈ **4** — within the §3.10 budget.

**Exit check:** preview at each beat shows correct pose/chrome at dpr 2; draw calls confirmed via `window.__preview`.

## Stage C — HTML terminal interior

New files: `TerminalWindowContent.tsx` (projection glue + content tree), `TerminalPromptLine.tsx` (scrubbed boot/exit commands + live `less ▊` prompt), `TerminalInteractiveListing.tsx` (dir `<button>` rows / symlink `<a target="_blank" rel="noopener">` rows, ≥44px tap targets), `TerminalChips.tsx` (`[cleave/] [metaencode/]`), `TerminalStatusBar.tsx` (hint → row detail → pager-owned).

Modified: `CodeContent.tsx` (mount `TerminalWindowContent` beside the runways — the `CoilIntro`/`CoilAnnotations` slot), `globals.css` (new terminal block).

Typography/register (respecting `.terminal-mail` conventions, green not blue; sharp corners everywhere *inside* the window; window shell keeps macOS rounding — the §3.3 exception):
- New token `--terminal-glow: 0 0 6px rgba(152,195,121,0.35)` — applied to the live prompt + focused row only, not every row (a listing-wide text-shadow is blur soup, not phosphor).
- `.term-row` `--text-sm`/`--font-mono`, perms in `--syntax-perm`, stars `--syntax-star`, alternating row bg; selection bar `[data-selected]` = inverse video (`background: var(--aod-green); color: var(--aod-bg-deep)`), driven by `:focus-visible` + hover. No hover-scale (anti-slop).
- `.term-status-bar` `--text-2xs`/`--text-xs`, hairline top border. Chips same inverse-video treatment.
- HTML rect aligned to the window's **inner content area** (below the title band, small inset) so square HTML corners never poke past the rounded chrome — no clip-path needed.
- Title-bar text (`zara@macbook — ~/projects`, updates on boot) is HTML positioned over the shader band — no in-shader text ever.

**Exit check (live site):** window flies in → boot command scrubs forward/backspaces in reverse → listing prints once at 0.755 (rewind clears instantly) → rows/chips hover/click → exit scrubs → farewell prints during the hold → window + HTML dissolve together; no seam or parallax swim anywhere in the plateau.

## Stage D — Pager, keyboard, a11y, reduced motion

New: `TerminalPager.tsx` (the focus card: `# Title`, one-liner, lorem highlight bullets, `[tag]` chips, `[GitHub ↗]`, `less`-style status line `cleave/README.md (END) — q to close`; `role="region"`, labelled, non-modal); `src/utils/focus-trap.ts` (extract `trapFocus` verbatim from `TerminalMail.tsx:274-289` — two consumers now justify it).

Modified:
- `TerminalMail.tsx` — import the shared trap (behavior-neutral; manual Tab-cycle check).
- `scroll-engine.ts` — `depthToScrollY(depth)` using the master ScrollTrigger's own denominator, for the §3.6 tap-to-complete accelerator (smooth Lenis `scrollTo` to the execute threshold — scroll position and session state can never disagree). DOM-touching → manual-verified, like `measureSectionBoundaries`.
- `TerminalInteractiveListing.tsx` — dir tap: command completes time-driven then `setOpenProject`; symlink tap: new tab + fading `opening <name> ↗` status line; arrow-key roving focus; Enter is native.
- `CodeWindowFrame.tsx` — release line: `openProject && shouldReleaseTerminalFocus(depth, openDepth) → close` (runs unconditionally, so a fast scroll-past + return self-heals in one frame).
- `globals.css` — `[data-motion='reduced']` overrides: window appears settled (opacity envelope only), commands fully-typed at thresholds, output instant, cursor static, pager instant; focus rings; pager CSS.

Close paths: `q`, Esc, `✕`, scroll-away (±0.012). Focus into pager on open, restored to opener on close (the TerminalMail discipline — deliberately better than the coil annotations, which drop focus to body). Hint `-- tap a project to open --` retires permanently after first open (in-memory, coil precedent).

**Exit check:** keyboard-only full pass; SR spot-check (buttons vs links, "opens in new tab"); reduced-motion pass with all content reachable; scroll-away release mid-read.

## Stage E — Polish, perf, log (+ optional split-pane)

- Tune beats/look/camera in leva against the live site; bake via the camera panel's bake-to-clipboard; freeze blessed `code-live-params`/`liveTerminalBeatParams` values into shipped defaults (coil convention).
- Total runway-height feel pass (the only real pacing lever).
- `r3f-perf` baseline per beat in the preview, recorded in the log.
- **Optional, cut freely:** `TerminalSplitPane.tsx` — tmux desktop variant behind the leva toggle (listing left, card right, 1px `--hairline`, tmux status line) so Zara can compare against the pager; never the shipped default; mobile always pager.
- Session log `logs/2026-07-XX_phase-7-code-terminal.md`.

---

## Testing

Vitest (node, colocated, mirrors `coil-fog.test.ts`/`camera-keyframes.test.ts` conventions): `terminal-beats` (boundaries exact, chars monotonic/reversible/saturating, phase 0→1→hold→0), `code-window-pose` (**no-pop invariant**), `terminal-output`, `terminal-rows`, `code-fog` (zero-outside + non-overlap products), `terminal-focus` (release at exactly ±0.012), `quaternion`, extended `camera-keyframes`. Manual-only: shaders, projection tick, keyboard/focus, reduced motion, `depthToScrollY`.

## Verification

- **Preview only** (project convention): chrome/pose/draw-calls via `code-preview.html?beat=…&dpr=2`, Playwright MCP + `window.__preview`.
- **Live site only:** scroll feel, scrub reversibility, accelerator, band-edge mount/unmount, keyboard/a11y. Needs `npm run dev` running — Zara's terminal or already-running instance.
- Commands I run: `npm run typecheck`, `npm run lint`, `npm run test` (subset while iterating; full before done).

## Risks

| Risk | Mitigation |
| --- | --- |
| Parallax swim on the locked window | `CameraController` priority `-1`; window reads `state.camera` directly |
| HTML/canvas misalignment | HTML rect re-derived from the same pure functions + pose mirror the mesh uses — single source of truth; skip-guard keys on w/h so resize self-corrects next tick |
| demand-frameloop starving time-driven output | Output print is pure CSS transitions; scrubbing rides depth-store updates; only the shader cursor needs `acquireAmbientRendering()` |
| Pager open across band-edge unmount | Release check unconditional on first post-remount frame — self-heals |
| Farewell never visible | The farewell-hold sub-beat (decision #4) |
| Fast scroll-through kills the survivor-cursor beat | Accepted — decorative handoff, per design doc framing |
