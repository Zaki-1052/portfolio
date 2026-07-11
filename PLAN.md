# Phase 5.6 — Underwater Refinement Pass (coil band)

## Context

Phase 5 (stages 5.1–5.5) shipped the coil band's structure: a rising helix of 55 wound
drums with cord, knobs, ribbons, annotations, and the unwind interaction. The look,
however, was vibecoded to a state Zara has now critiqued from four directions, all
confirmed by Playwright screenshots of both preview harnesses:

1. **Transition swivels** — between depth 0.44–0.47 the camera dives *past* the tree
   while the look-target swings from the tree hub to the coil; tree (frame top) and
   coil ghost (bottom-left) share the frame and neither owns it.
2. **No medium** — the twinkle motes read as starfield; Zara wants underwater /
   cytoplasmic suspension.
3. **Flashbang drums** — the ethereal retune lifted beads to pastel `#7fa3c8` with a
   doubled ambient floor; they render as flat full-value stickers against near-black.
4. **Uncanny thread** — beige `#d8b878` cord at full value with flat shading: fondant
   look, corduroy moiré where stacked wraps nearly touch (`sin(vT*90)` shimmer), and
   beige outlines flattening every silhouette.

**User decisions (AskUserQuestion, locked):** teal bioluminescent thread (`#6fc7d8`
family) · deep-dusk water mood (dark blue-green, light from above) · full glow-fill
hub-dive transition · ALL water-life elements (near bokeh, fine silt, caustic dapple,
drifting wisps) **plus bubbles**, with emphasis on coherent "waviness" so it actually
reads as water.

All numeric/hex values below are **starters, not locks** — each lands on a leva slider
(range containing its default, per repo convention) and is re-blessed by eye in the
previews before freezing into defaults.

**Language rule (STRICT):** neutral geometric vocabulary only in all code, comments,
docs, logs (coil, drum, thread, hub, silt, veil, bubble, current). Existing engine
identifiers (`chromatin` key, paths) stay.

## Step 0 — plan into the repo

Write this plan as `PLAN.md` at the repo root (Zara audits markdown in her editor;
sidecar plan files are invisible to that). Keep it updated as stages complete.

## Staging

> **STATUS (2026-07-10): ALL FOUR STAGES IMPLEMENTED & VERIFIED** (previews
> only, dpr 2 — 60 fps sweeps both directions, reduced-motion byte-identical
> parks, 24–27 draw calls/frame, focus interaction end-to-end, 208 tests
> green). Remaining: Zara's live-site scroll-through bless; judge the
> 0.452→0.462 luminance trough (glow → deep haze) at real scroll speed
> (`HUB_SWELL_*` / `FOG_COIL_*` / `BLOOM_SWELL_*` are the dials) and the
> thread-core presence at distance (`threadEmissive`). Deviations from the
> starters below, made by eye during implementation: `threadEmissive
> 0.55 → 1.0`, `knobColor #3d6a74 → #45737f`, core lobe pow 2 → 1.5, intro
> fade ⇒ 0.498→0.52 / annotations reveal ⇒ 0.505→0.53 (text-layer overlap
> fix), ring ornament's WALL bands cut to 0.3× (the melted-stripe read came
> from wall banding + slit-gap wraps, not only the vT·90 shimmer).
> Session log: `logs/2026-07-10_phase-5.6-underwater-refinement.md`.
>
> **Feedback round (2026-07-10, 7 user notes) — implemented:** top-entry
> hub dive (crest over the canopy, plunge through the crown's glowing
> front-top quadrant) + a `uHubFill²` glow spill (×0.75) that ignites the
> whole tree at the fill peak; twinkle sparkle layer restored (150 pts, new
> defaulted `uTwinkle` mote-shader pulse); main view re-posed to the coil's
> shoulder gazing gently down (0.52/0.565 knots raised ~7 u; intro
> 0.462→0.478 / 0.49→0.51; annotations 0.5→0.525); thread face-on fix
> (RADIAL 8, radius 0.07, body #4c8d9b near-wall value, core floor 0.65);
> card backdrop deepened + meta text brightened; focus pose lifted
> (LIFT 6 / DIST 19) with the silt shell widened so atmosphere stays in
> frame at focus poses. Re-verified: 60 fps sweeps, 208 tests, build clean.

| Stage | Scope | Harness | Status |
|---|---|---|---|
| 5.6a | Deep-dusk re-grade: bead/thread/knob shaders, env reflections, caustics, thread AO/contact, pulse (moiré fix) | chromatin-preview | ✅ |
| 5.6b | Water life: silt retune, bokeh, bubbles, veils, coherent current | chromatin-preview | ✅ |
| 5.6c | Hub-dive transition: camera knots, hub-glow swell, fog retime+sustain, bloom swell, reveal/intro retimes, band CSS grade | descent-preview | ✅ |
| 5.6d | Full verification, perf, reduced motion, gates, log + doc addendum | both + live site | ✅ (live bless: Zara) |

Order: grade first (everything downstream is judged against the settled grade), water
second (opacities balance against the grade), transition last (fill beat judged against
final fog/grade).

## Stage 5.6a — deep-dusk re-grade

**`shaders/coil-bead.frag.glsl`:**
- Ambient floor back down + teal lean: `mix(vec3(0.2,0.23,0.32), vec3(0.4,0.45,0.56), hemi)`
  → `mix(vec3(0.10,0.13,0.15), vec3(0.36,0.44,0.50), hemi) * uDuskLift`; sharpen vertical
  read `hemi = pow(0.5 + 0.5*N.y, 1.4)`; key light overhead `normalize(vec3(0.15,0.9,0.35))`,
  `keyCol = vec3(0.85,0.95,1.0) * 0.7`.
- Inner luminance halved (`0.05+0.06*vCapMask` → `0.02+0.03*vCapMask`); fresnel rim stays.
- NEW procedural env reflection (no PBR/PMREM — hand-lit family kept):
  `env = mix(uEnvDeepColor, uEnvPaleColor, smoothstep(-0.6, 0.7, reflect(-V,N).y))`,
  added `* uEnvStrength * (0.15 + 0.85*fresnel)`.
- NEW caustic dapple on up-facing surfaces: 2-octave fbm (noise.glsl already prepended)
  over `vWorldPos.xz * uCausticScale` animated by `uTime*0.12`, `pow(…,4)` sharpened,
  masked by `N.y²`, `* uCausticAmp`. Frozen under reduced motion (uTime already 0).
- NEW wall contact shading: darken drum wall inside the wrap band via `vCapMask` +
  `abs(vLocalPos.z)` vs `uWrapBandZ` (derived CPU-side from beadAspect) `* uWrapShadow`.
  Band-level only — no per-turn stripes (would re-introduce moiré).

**Thread → teal biolume (`coil-thread.frag/vert.glsl`, `coil-geometry.ts`):**
- Two-tone: body `threadColor #d8b878 → #3f7d8a` (dark slate-teal), NEW
  `threadCoreColor #7fe3f2` camera-facing emissive core
  (`pow(max(dot(N,V),0),2) * uThreadEmissive`), so the cord is never a full-value line.
- Real cylindrical shading: `diff = mix(0.35,1.0,wrap*wrap)` → `mix(0.15,1.0,wrap*wrap)`;
  moving spec line `pow(max(dot(N,H),0), 32.0) * 0.3`.
- Moiré kill: replace `sin(vT*90.0 - uTime*uShimmerSpeed)` (coil-thread.frag.glsl:59)
  with a slow traveling pulse: `pow(0.5+0.5*sin(vT*6.2831*uPulseCount - uTime*uShimmerSpeed), 6)`;
  `threadPulseCount 3`, `shimmerSpeed 1.6 → 0.6`.
- NEW static vertex attr `aShade` baked in `buildThreadGeometry` (coil-geometry.ts:259):
  wall-contact occlusion (≤0.45) + turn-adjacency AO (≤0.35, active when pitch < 3 cord
  radii); bridges taper to 0. Static per topology — zero unwind-tick cost
  (writeThreadGeometry rewrites only positions/normals). Frag: `color *= 1.0 - uThreadAo*vShade`.
- Knobs `#c2a978 → #3d6a74` dim teal glints, same rig. Ribbons `#9fd0f5` unchanged.

**`coil-params.ts` default changes + additions** (mappers `applyCoilBeadLook`/`applyCoilThreadLook` extended):
`beadBaseColor #7fa3c8→#607e9a` · `threadColor→#3f7d8a` · `threadEmissive 0.35→0.55` ·
`shimmerSpeed 1.6→0.6` · `knobColor→#3d6a74` · NEW `duskLift 1.0` · `envStrength 0.35` ·
`envDeepColor #16323a` · `envPaleColor #8fd0da` · `causticAmp 0.18` · `causticScale 0.45` ·
`wrapShadow 0.35` · `threadCoreColor #7fe3f2` · `threadAo 0.6` · `threadPulseCount 3`.

**`coil-dev-tools.tsx` new sliders** (default · range): duskLift 1.0 · 0.5–1.6;
envStrength 0.35 · 0–1; causticAmp 0.18 · 0–0.6; causticScale 0.45 · 0.1–1.5;
wrapShadow 0.35 · 0–1; threadAo 0.6 · 0–1; threadPulseCount 3 · 1–8 step 1; color
pickers envDeep/envPale/threadCore.

**`chromatin-preview.tsx`:** re-pin preview fog to the coming grade
(`#20343a` / 0.02) so the re-grade is judged in-medium.

## Stage 5.6b — water life + coherent current

**NEW pure `coil-current.ts` (+ node test):** one traveling plane wave shared by every
layer — `currentOffset(pos, time, {dirDeg 40, amp 0.35, freq 0.22, k 0.06})` → xz sway;
wavelength ≈ 105 u so phase is coherent scene-wide. 5-line GLSL twin with uniforms
`uCurrentDir/Amp/Freq/K` in each consuming vert. Tests: |offset| ≤ amp, period 2π/freq,
zero at amp 0, coherence contract.

**NEW `coil-atmosphere.tsx`** (mirrors arbor-atmosphere naming) — owns 4 layers;
`ChromatinScene.tsx` retires inline `COIL_DRIFT` and mounts this:
1. **Silt** (retune of existing DriftField): count 340→650, size [0.12,0.20], peak
   opacity 0.32, rise 0.05→0.015 (buoyant, not twinkle-rise), riseRange 6, wobble 0.7,
   desaturated palette `['#6fa3c4','#7fb4d8','#6fc7d8','#7c93b8']`, window rise
   0.455→0.475 (first "water" signal inside the fill beat).
2. **Near bokeh**: second DriftField; extend `tissue/atmosphere-motes.*` with defaulted
   uniforms `uMaxPx` (replaces hard px clamp 7; default 7) and `uRimGlow` (lens-profile
   rim; default 0) so existing fields stay byte-identical. Config: count 60, center
   [2,-25,-38], rOuter 26, size [0.9,1.6], fadeFar [10,18] (only near-lens discs show →
   parallax), maxPx 64, rimGlow 0.45, opacity 0.35.
3. **Bubbles**: NEW points layer + `shaders/coil-bubbles.{vert,frag}.glsl` (one draw
   call; wrapped-rise conveyor precedent from motes). Rise 0.5 u/s over 18 u span,
   per-seed wobble ±0.35 + current term; bright-rimmed sprite (rim smoothstep + faint
   0.12 fill + offset spec dot), additive; count 28, size [0.10,0.22], px clamp [2,24],
   `#bfeaf4`, opacity 0.6, window 0.46→0.585.
4. **Veils (wisps)**: generalize `tissue/atmosphere-clouds.tsx` into config-driven
   `CloudBank` (behavior-identical for tissue). Coil config: 6 quads behind the coil
   (center [0,-26,-52], scale 18–34), color `#2e5560` opacity 0.16, NORMAL blending
   (veiling, not glow), drift ×0.5 + current phase.
5. **Coherent sway**: current uniforms in silt/bokeh/bubble/veil verts AND a subtle bead
   term `uBeadCurrentAmp 0.05` — thread/knob verts carry the identical expression, so
   detachment is bounded ≈1e-4 u at the 105 u wavelength (comment beside the existing
   drift-match warning).

**Dev panel** `coil water` folder: siltCount 650 · 100–1200; siltOpacity 0.32 · 0–1;
bokehCount 60 · 0–150; bokehOpacity 0.35 · 0–1; bokehMaxPx 64 · 7–128; wispOpacity
0.16 · 0–0.5; wispColor; bubbleCount 28 · 0–80; bubbleRise 0.5 · 0–1.5; bubbleOpacity
0.6 · 0–1; currentAmp 0.35 · 0–1; currentFreq 0.22 · 0–1; currentDirDeg 40 · 0–360;
beadCurrentAmp 0.05 · 0–0.2.

**Reduced motion:** silt/bokeh/bubbles not mounted (existing `!reduced` gate in
ChromatinScene); veils mounted but time-frozen (AtmosphereClouds precedent);
beadCurrentAmp → 0 alongside driftAmp. All pixel-stable.

## Stage 5.6c — hub-dive transition + band grade

**Decision: camera passes THROUGH the hub** (stop-at-surface = dead beat + hidden
teleport). Crossing is masked by three coordinated layers: arbor exit fade completes
BEFORE crossing (verified: `arbor-trunk.frag.glsl:108` mixes toward `uFogColor`, so a
faded trunk clips as fog-on-fog — invisible), hub-glow + bloom swell own the frame, fog
spike peaks exactly at the crossing.

**Camera knots (`camera-keyframes.ts`)** — hub ≈ [2,-10.6,-28] r≈2; delete the 0.455
dive knot; 0.48/0.52/0.565 unchanged; starters (tuned via bake-to-clipboard workflow,
FULL page reload after each source edit — HMR leaves a stale keyframe clone):

| depth | position | target | fov | beat |
|---|---|---|---|---|
| 0.43 keep | [-11.5,-4,5] | [1,-5,-24] | 49 | hold |
| 0.442 NEW | [-6.1,-6.6,-8.2] | [2,-10.6,-28] | 49 | lock-on, push begins |
| 0.454 NEW | [0.33,-9.78,-23.9] | [4.2,-11.7,-33.5] | 49 | 4.5 u out — glow fills frame; target pushed through center (no degenerate ray) |
| 0.464 NEW | [3.3,-11.2,-31.2] | [1.5,-17,-38] | 48.5 | out the far side, aim easing to coil |
| 0.48 keep | [11,-19.5,-21] | [-6.5,-24.5,-40.5] | 48 | broadside emergence (reduced anchor) |

Shell crossing ≈ 0.458–0.461; pure glow/haze beat ≈ 0.452→0.468. FOV holds (~49) —
glow-fill was chosen over zoom-compress; no lens breathing inside the glow. New knots
NOT reducedAnchor → reduced track still cuts 0.41→0.48→0.565; keyframe invariant tests
pass unmodified (strictly increasing ✓, anchors ≥5 ✓).

**Glow-fill choreography:**
- Hub-glow swell (`ArborMesh.tsx` new envelope + `arbor-trunk.frag.glsl` `uHubFill`):
  strength ×1→×4.0 over 0.435→0.452, glow-face widening `mix(0.25,0.7,uHubFill)`
  replacing the 0.25 floor at :94; disabled under reduced motion.
- Arbor exit fade retime 0.445→0.485 ⇒ **0.446→0.458**; then set arbor group
  `visible=false` (kills fog-colored occluders + saves draw calls until 0.49 unmount).
- Fog spike retime (`coil-fog.ts`): RISE 0.42→0.43, PEAK 0.44→**0.458**, CLEAR 0.5→0.52,
  peak delta 0.014→**0.020**; NEW sustained term +0.006 plateau
  `smoothstep(0.44,0.47)·(1−smoothstep(0.55,0.585))` (the underwater medium); tint
  `#2b3038 → #20343a`, max 0.5→0.55.
- Transient bloom swell: NEW pure `coilBloomSwellFor(depth)` in `post-fx-curves.ts`
  (zero outside [0.446,0.472], peak +0.5 intensity / −0.15 threshold at 0.458),
  composed in `post-fx.tsx`.
- Coil reveals pushed later (`CoilMesh.tsx`): LIGHTS 0.435→0.455 ⇒ **0.462→0.48**;
  BODY 0.44→0.48 ⇒ **0.468→0.50** — no early ghosting, no co-subject frame ever.
- `CoilIntro` reveal ⇒ 0.465→0.487, fade ⇒ 0.505→0.528; `CoilAnnotations` reveal ⇒
  0.49→0.515.
- Band CSS grade (`globals.css`): chromatin `--bg #282c34 → #232d31`, `--fog-color
  #2b3038 → #233238`; cellular `--bg-next → #232d31` (seam); re-check the two chromatin
  text tokens for AA contrast.

**Test impact:** `coil-fog.test.ts` rewritten for new windows/plateau (only existing
test file edited; arbor-disjointness product test passes unchanged);
`post-fx-curves.test.ts` gains coilBloomSwellFor cases; `coil-current.test.ts` new;
keyframe tests untouched.

## Stage 5.6d — verification & sign-off

1. Sweeps `/descent-preview.html?dpr=2&from=0.40&to=0.62&dur=12` both directions —
   60 fps; deterministic rewind pixel-diff.
2. Playwright stepped stills via `window.__setDepth`: 0.43/0.442/0.45/0.456/0.459/
   0.462/0.466/0.47/0.48/0.50/0.53/0.565 — no tree+coil co-subject frame, no clip
   artifact, no early ghost.
3. Reduced motion `?reduced=1`: anchors 0.41→0.48→0.565, pixel-stable parks (static
   caustics/veils, no silt/bokeh/bubbles, hub swell off).
4. Perf: +3 draw calls (bokeh, veils, bubbles) ⇒ est. 22–24 peak, offset by arbor
   `visible=false`; fill-rate is the real risk — mitigation ladder: bokeh 60→36,
   veils 6→4, silt 650→450. Unwind tick re-measured (budget 2 ms, was 0.248 ms).
5. Gates each stage: `npm run typecheck && npm run lint && npm test -- --run && npm run build`
   (prod bundle keeps dev/preview chunks out).
6. Live-site scroll-through bless: **Zara** (per 5.4/5.5 precedent).
7. Session log `logs/2026-07-10_phase-5.6-underwater-refinement.md` + dated addendum in
   `docs/p5-plan-coil-scene.md`; update PLAN.md checkboxes as stages land.

## Key risks

- **Near-plane clip at pass-through** → fade completes at 0.458 before crossing
  (fog-on-fog), bloom+fog peak at crossing; fallback: shift crossing +0.004 deeper.
- **Bloom wash vs ACES at fill** → ACES shoulder soft-clips; tune against real PostFX;
  threshold dip ≤0.15.
- **Moiré persisting** → the vT·90 stripe source is deleted; residual = ring ornament
  vs stacked wraps — verify grazing angles; `ringAmp` is the dial.
- **Additive layers banding over darker fog** → grain pass dithers; keep opacities low;
  check dpr 1.
- **Hermite whip on the 0.464→0.48 exit** → tune live; add a shaping knot at 0.472 if
  needed (non-anchor).
- **Bokeh/silt over annotation legibility** → annotations are DOM above canvas; dip the
  bokeh window across 0.49–0.545 if stills read busy.

## File inventory

**New:** `src/scales/chromatin/coil-atmosphere.tsx` · `coil-current.ts(+test)` ·
`shaders/coil-bubbles.{vert,frag}.glsl` · `PLAN.md` · session log.

**Modified:** `coil-params.ts` · `coil-materials.ts` · `coil-geometry.ts` ·
`CoilMesh.tsx` · `ChromatinScene.tsx` · `CoilIntro.tsx` · `CoilAnnotations.tsx` ·
`coil-fog.ts(+test)` · `shaders/coil-bead.{vert,frag}.glsl` ·
`shaders/coil-thread.{vert,frag}.glsl` · `shaders/coil-knob.frag.glsl` ·
`src/scales/tissue/atmosphere-motes.tsx(+shaders)` ·
`src/scales/tissue/atmosphere-clouds.tsx` (→ CloudBank) ·
`src/scales/cellular/ArborMesh.tsx` · `src/scales/cellular/shaders/arbor-trunk.frag.glsl` ·
`src/engine/camera-keyframes.ts` · `src/engine/post-fx-curves.ts(+test)` ·
`src/engine/post-fx.tsx` · `src/dev/coil-dev-tools.tsx` · `src/dev/chromatin-preview.tsx` ·
`src/styles/globals.css` · `docs/p5-plan-coil-scene.md`.
