# 2026-07-05 — Phase 4 rework: the scene-native band (annotations, focus, handoff)

Second session of the day. During the 4.1 eye-pass the user identified the deeper
problem: the Phase-1 document layout painted over the Canvas defeats the
graphics-first vision — "everything should be graphical, including the content."
User-locked direction (via question round): fully scene-native band · luminous
annotation register (pure glowing type + hairlines, nothing boxed) · cellular is
the template, chromatin/protein adopt in Phase 5, code/expression stay typographic.

## What was done

- **Scene-native band structure** — `CellularContent.tsx` split into named runways
  (`.arbor-runway--arrival` 160vh / `--index` 150vh, WebGL-only) + a `.cellular-doc`
  block that is `display:none` under `[data-webgl='active']` and IS the untouched
  no-WebGL fallback. Both registers drive one shared focus store.
- **`ArborAnnotations.tsx`** — the visible content under WebGL: per-limb luminous
  label (real `<button>`, aria-pressed) with hairline connector pinned to the
  PROJECTED tip anchor, compact project entries (real links, serif titles, glow
  shadows) fading in on focus. Imperative positioning on a gsap ticker, skipping
  work unless the camera-pose version / depth / viewport changed. Depth envelope:
  reveal 0.33–0.36 (as the mist clears), fade 0.40–0.425 (as the next band's
  document scrolls over the settle hold).
- **Pure modules (TDD, +25 tests → 133)** — `engine/screen-project.ts`
  (world→CSS-pixel projector, three conventions asserted), `engine/camera-pose.ts`
  (final post-parallax pose mirror, scene-fog pattern), `stores/branch-focus.ts`
  (+ `shouldReleaseFocus`), `engine/camera-focus.ts` (anchor-derived poses +
  sample blend with hand-rolled slerp), `content/branch-order.ts` (single
  branch↔limb mapping, BRANCH_META moved here).
- **Camera focus pivot** — controller blends the depth sample toward the focused
  limb's pose (400ms power2.inOut tween on focusBlend; held pose exp-eases so
  A→B refocus glides), BEFORE the parallax post-multiply; scroll past
  ±0.012 depth releases (scrub always wins — verified live). Final pose written
  to the mirror every frame. ArborMesh drives uFocusBranch/uFocusBlend/
  uHoverBranch on all three materials.
- **4.3 essentials pulled forward** (band unreadable without them):
  - `cellular/arbor-fog.ts` (+6 tests) — ADDITIVE rose-mist density delta
    (peak 0.03 total at 0.335, exactly 0 outside [0.30, 0.395]) and a sustained
    rose color blend (0.65 through the index beat, gone by 0.47) composed in
    SceneAtmosphere AFTER the warm-interior push (lerp order = amber→rose
    crossfade). `fog-density.ts` and its tests untouched, as planned.
  - `tissue/breakthrough.ts`: `interiorExitFade` (+3 tests) — the shell's walls
    dim fully into fog across [0.30, 0.335] so the 0.34 unmount is invisible
    (was a full-frame gold wall popping out).
  - **Four band knots + a hold knot** in `CAMERA_KEYFRAMES` (0.335 resolve /
    0.36 broadside / 0.385 front curl / 0.41 off-axis settle / 0.43 covered
    hold) — authored against the REAL anchor extents (canopy tips y≈+6..+9,
    spread ±13; fetched live via Vite module import in the page). Zero existing
    camera tests changed, as the plan predicted.
- **DEV `?content=0` toggle** — hides the whole HTML layer (visibility, layout
  preserved) for in-context eye-passes of any band.

## Verified live (Playwright, dpr 2)

Full overture → band walkthrough: walls dissolve into rose mist, tree resolves,
annotations fade in pinned to their tips (all three anchors in-frame at the
dwell), click → pivot + limb dim + entries, scroll-away release (store confirmed
null/0), next band's document scrolls over the hold. 60 FPS, 20 calls/frame
(3 scene draws + composer), zero console errors. Gate: typecheck · lint ·
**133 tests** · build.

## Open items

- User eye-pass of the whole band + tuning session (knots via camera panel,
  fog/label timing, bark register — trunk still reads light at close range,
  RADIAL 8 facets visible near the settle).
- Entry text legibility where it crosses bright canopy (stronger shadow or a
  feathered darkening, NOT a box) — user call.
- Label viewport-margin clamp (edge labels clip mid-sweep).
- 4.3 tail: rose halo + ember handoff atmosphere bodies; freeze pass.
- Fallback double-exposure sanity pass with a screen reader (Phase 7 re-audit).

## Key file paths

`src/scales/cellular/{ArborAnnotations.tsx,CellularContent.tsx,arbor-fog.ts(.test)}` ·
`src/engine/{screen-project(.test),camera-pose,camera-focus(.test),camera-controller,
scene-atmosphere,camera-keyframes}.ts[x]` · `src/stores/branch-focus.ts(.test)` ·
`src/content/branch-order.ts` · `src/scales/tissue/{breakthrough.ts(.test),TissueScene.tsx}` ·
`src/styles/globals.css` · `docs/p4-plan-arbor-scene.md` (revision note)
