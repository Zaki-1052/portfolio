# Phase 5 — The Coil: threaded-bead fiber scene for the third band

> **Language convention (STRICT, same as all phases):** all code, comments,
> docs, commit messages, and session logs use ONLY neutral geometric/design
> vocabulary — "coil," "fiber," "bead," "thread," "spool," "strand," "loop,"
> "arc," "region," "locus," "cluster." No domain-specific terms anywhere.
> This is a pure 3D rendering / UI design task. The third-band scale
> identifier in the engine stays as-is (wired end-to-end).

## Context

Phases 0–4 shipped the first two 3D scenes: the sculpted shell (tissue band)
and the branching arbor (cellular band). Phase 4's scene-native rework
established the graphics-first content pattern: under `[data-webgl='active']`
the band's in-flow document content is `display:none` and visible content is
scene-native annotations pinned to projected 3D anchors. Phase 5 builds the
third scene following this exact template.

The band owns canonical depth **[0.43, 0.57)** (verified:
`SCALE_BOUNDARIES = [0, 0.14, 0.28, 0.43, 0.57, 0.71, 0.86, 1.0]`,
scale-manager.ts:28). CSS accent is rose `#d57aa5` (`--aod-rose`), fog
`#2b3038`, heading font is Inter (sans), grain low.

---

## Creative decisions (user-locked, do not relitigate)

These were decided interactively during the brainstorming session:

### 1. Visual character: Dense Cluster
The fiber is a **tightly packed, almost crystalline arrangement** where beads
crowd close together, connected by short taut threads. It reads as a
compressed, coiled mass that **UNWINDS dramatically** on interaction. Maximum
contrast between compact and open states.

### 2. Loop arcs: Flowing Ribbons
When a publication locus is focused and the region unwinds, **thick
ribbon-like streams of light** flow between connected bead pairs. Not thin
hairlines — these have presence. Particles travel along each ribbon,
suggesting data transmission. More organic and dramatic than constellation
lines.

### 3. Idle animation: Drift + Shimmer
No structured rotation or breathing swell. Individual beads have **very slight
random drift** (Brownian-like, ~0.1 unit amplitude, each independent). Linker
threads have a faint traveling shimmer. The structure feels suspended in
stillness with just enough micro-motion to read as "alive" rather than frozen.
All frozen under reduced motion.

### 4. Transition: Fog-mediated dissolve
The arbor fades behind deepening fog as the camera advances; the coil cluster
materializes out of the same haze ahead. No cinematic breakthrough — this is a
quieter "zooming deeper." The fog carries the color shift from rose-navy to
neutral blue.

```
depth 0.41: arbor visible, hold pose
depth 0.42: fog thickens, arbor dims
depth 0.43: arbor gone, haze only
depth 0.44: first beads glimmer in haze
depth 0.46: cluster resolved, fog clears
```

### 5. Approach: Start A, architect for B
- **Approach A (initial):** Instanced beads with vertex-shader morph targets.
  Each bead stores compact + unwound positions. `uUnwindBlend` uniform
  tweened by GSAP drives the lerp in the vertex shader. 4 draw calls (beads,
  linkers, loop ribbons, atmosphere). Simplest GPU model.
- **Approach B (upgrade path):** Full CPU geometry rebuild on interaction.
  The generator re-runs with modified parameters for the focus region. Maximum
  visual fidelity. The generator is architected so `unwindRegion()` is a
  first-class export, making the B upgrade a parameter change, not a rewrite.
- User preference: "embrace complexity to look better" — start A for fast
  visual iteration, but the architecture must support B if the morph doesn't
  read sophisticated enough.

---

## Verified load-bearing facts (from codebase exploration)

- **Scene swap is one line**: `SCENE_REGISTRY` in `scene-manager.tsx` — add
  `coil: CoilScene` + a `SCENE_KEYS` entry. Mount window: scene mounts
  at depth 0.37 (margin 0.06), the arbor unmounts at 0.49.
- **Camera**: `CAMERA_KEYFRAMES` has 16 knots total. Last arbor knot is at
  depth 0.43 (hold). Next knot is at 1.0 (void tail). **No knots between
  0.43 and 1.0** — all coil camera knots insert into this gap.
- **Fog composition order** in `scene-atmosphere.tsx`: theme → warm override
  → interior push → arbor tint → arbor density delta. Coil fog terms compose
  AFTER the arbor terms (same pattern: import + add).
- **Fog module pattern**: `arbor-fog.ts` exports two pure functions
  (`arborFogDensityDeltaFor`, `arborFogColorBlendT`) that evaluate to exactly
  0 outside their depth window. Zero edits to `fog-density.ts` or its tests.
  Coil fog follows the identical pattern.
- **Annotation pattern**: `ArborAnnotations.tsx` — imperative positioning on
  gsap ticker, projects world anchors through the FINAL camera pose via
  `getCameraPose()` + `worldToScreen()`. Skip-work optimization via pose
  version counter. Depth envelope via smoothstep. Real buttons/links.
- **Intro overlay pattern**: `ArborIntro.tsx` — fixed click-through column,
  opacity/blur/rise driven by depth envelope on gsap ticker. "Cooled lens"
  backdrop for legibility (painted gradient, not backdrop-filter).
- **Content dual-register**: `CellularContent.tsx` — under WebGL: scroll
  runways provide timing, `.cellular-doc` is `display:none`. Without WebGL:
  runways collapse, full document version renders.
- **Material pattern**: drei `shaderMaterial()` with `noise.glsl` prepended
  via string concatenation. Manual exp2 fog in fragment. Additive blending for
  glow layers. Uniforms written imperatively in `useFrame`.
- **Focus store + camera blend**: `branch-focus.ts` store +
  `camera-focus.ts` blend poses. GSAP tween drives `focusBlend` 0↔1 over
  400ms. `shouldReleaseFocus(depth, focusDepth)` cancels on scroll-away.
- **CSS properties** already defined for `[data-scale='coil']`: accent
  `--aod-rose`, bg `--aod-bg`, fog `#2b3038`, heading font sans, grain low.
- **Existing content**: `CoilContent.tsx` is document-only (no
  scene-native register). `content/sections/coil.md` has the prose.
  `content/publications.json` has 2 publications.

---

## Design specification

### New files

#### `src/utils/coil-generator.ts` (pure, no three import, node-tested)

**`CoilGrowthParams`:**
- `seed` — deterministic PRNG (same `mulberry32` as arbor-generator)
- `beadCount: 96` — total beads
- `coilRadius: 2.8` — helix path radius
- `coilPitch: 0.55` — vertical rise per revolution (tight = dense)
- `coilTurns: 6` — full revolutions
- `beadRadius: 0.45` — oblate spheroid radius
- `beadAspect: 0.6` — squish factor (< 1 = disc-like)
- `jitter: 0.08` — per-bead positional noise (Brownian micro-drift seed)
- `linkerSag: 0.12` — thread sag between beads
- `regionSize: 15` — beads per publication region
- `regionGap: 0.33` — normalized gap between the two regions

**`CoilNode`:**
```ts
{ position: Vec3, tangent: Vec3, normal: Vec3, binormal: Vec3,
  radius: number, index: number, t: 0..1,
  region: -1 | 0 | 1, // -1 = unassigned, 0/1 = publication locus
  unwoundPosition: Vec3 } // morph target for the open state
```

**Algorithm:**
1. Solenoid path: `x = R·cos(θ), z = R·sin(θ), y = pitch·θ/(2π)` with
   seeded noise perturbation for organic irregularity
2. Place beads at equal arc-length intervals
3. Parallel-transport frames at each bead (no Frenet twist artifacts)
4. Mark two non-overlapping regions (~15 beads each) at ~1/3 and ~2/3 along
   the coil
5. Compute unwound positions: region beads spread along a wider, flatter arc
   (3× radius, 2× pitch, further spacing) — these are the morph targets
6. Generate loop-arc pairs: for each region, 4–6 pairs of distant beads
   whose arcs will visualize the connections

**Exports:**
- `generateCoil(params): CoilNode[]`
- `unwindRegion(nodes, regionIndex, openRadius, openPitch): CoilNode[]` —
  returns copy with region beads repositioned (Approach B path)
- `regionBeadIndices(nodes, regionIndex): number[]`
- `regionAnchor(nodes, regionIndex): Vec3` — center of region (card anchor)
- `loopArcPairs(nodes, regionIndex): [number, number][]` — bead index pairs
- `COIL_GROWTH_DEFAULTS`

**Tests (`coil-generator.test.ts`):**
- Determinism (same seed → deep-equal)
- Bead count matches params
- Monotonic t (0→1)
- Two distinct regions each with correct bead count
- Unwound positions are further apart than compact
- Valid transport frames (tangent·normal ≈ 0)
- Loop-arc pairs connect beads from the same region

---

#### `src/scales/coil/coil-params.ts`

Mirrors `arbor-params.ts`: `CoilLookParams` (colors, emission, fog, glow
widths) + `COIL_ORIGIN: Vec3` (starter `[0, -26, -40]` — puts the cluster in
the existing flight corridor, positioned for rule-of-thirds) + presets
(`tight`/`open`/`loose`) + `COIL_DEFAULTS` + `applyCoilLook(material, params)`.

Palette:
- **Bead base**: warm dark tone ~`#3a2d3a` (carries the rose register)
- **Bead rim/fresnel**: rose `#d57aa5` (`--aod-rose`)
- **Linker threads**: faint blue-rose emissive `#8b6a9e`
- **Loop ribbons**: bright rose-blue blend `#c478dd` with traveling pulse
- **Fog anchor**: `#2b3038` (from CSS)
- **Atmosphere motes**: sparse, cool-rose tinted, fainter than arbor's

---

#### `src/scales/coil/coil-geometry.ts` (three-touching, not tested)

Same precedent as `arbor-geometry.ts`:

- `buildBeadGeometry(nodes)` — `InstancedMesh` with oblate spheroid base
  geometry (IcosahedronGeometry detail 3, scaled by `beadAspect` on Y).
  Per-instance attributes: `aCompactPos`, `aUnwoundPos`, `aTangent`,
  `aNormal`, `aT`, `aRegion`, `aSeed` (for drift phase). Instance matrices
  set from compact positions + transport-frame orientation.

- `buildLinkerGeometry(nodes)` — merged TubeGeometry segments connecting
  adjacent beads. 4 radial segments, radius ~0.04. Attribute: `aT` for
  shimmer phase. Slight catenary sag between beads (`linkerSag`).

- `buildLoopRibbonGeometry(nodes, regionIndex)` — for each arc pair: a
  curved tube (quadratic Bezier with control point lifted above midpoint)
  with width ~0.08. Attributes: `aArcT` (0→1 along arc), `aRegion`.
  Rendered with additive blending, particle-flow effect in fragment shader.

- `buildDriftMoteGeometry()` — sparse points cloud for atmosphere (reuses
  DriftField pattern).

---

#### Shaders: `src/scales/coil/shaders/`

**`coil-bead.vert.glsl`:**
- Instance attributes for compact + unwound positions
- `uUnwindBlend` (0→1) drives lerp between compact and unwound
- `uFocusRegion` (-1, 0, 1) — which region is focused
- Brownian drift: `sin(uTime * 0.3 + aSeed * 6.28) * uDriftAmp` on each axis
- Transport-frame orientation from aTangent + aNormal
- Pass varyings: vT, vRegion, vViewDist, vNormal, vWorldPos

**`coil-bead.frag.glsl`:**
- Hemisphere ambient + wrapped key light (same technique as arbor trunk)
- Fresnel rim in rose
- Subtle surface grooves: procedural parallel lines on the bead surface
  (fbm-based, suggesting wrapped thread — purely decorative, not
  domain-specific)
- Focus dim: non-focused region beads dim when a region is active
- Manual exp2 fog toward uFogColor

**`coil-linker.vert.glsl`:**
- Standard tube vertex with slight time-driven wave
- Shimmer varying from aT + uTime

**`coil-linker.frag.glsl`:**
- Faint emissive base color
- Traveling shimmer: `sin(aT * 40.0 + uTime * 2.0)` brightness pulse
- Fog extinction (additive layer)
- Focus dim for non-active regions

**`coil-ribbon.vert.glsl`:**
- Arc tube vertex
- Particle-flow effect: `fract(aArcT - uTime * uFlowSpeed)` for the
  traveling brightness

**`coil-ribbon.frag.glsl`:**
- Bright additive glow with traveling pulse
- Soft disc falloff across tube width
- Fog extinction
- Only visible when corresponding region is focused (`uFocusRegion`)

---

#### `src/scales/coil/CoilMesh.tsx`

Assembles 4 draw calls from generator output + live params. Per-frame uniform
writes mirror `ArborMesh.tsx` pattern:
- depth → reveal opacity (smoothstep 0.44→0.48)
- fog mirror from `getSceneFog()`
- time → drift/shimmer uniforms (frozen at 0 under reduced motion)
- focus store → `uFocusRegion`, `uUnwindBlend`
- GSAP tween for `uUnwindBlend` (0↔1 over 500ms, `power2.inOut`)

Loop ribbon meshes: two instances (one per region), visibility toggled by
focus state.

---

#### `src/scales/coil/CoilScene.tsx`

Top-level scene component (sibling pattern to `CellularScene.tsx`):
- Mounts `<CoilMesh/>` at `COIL_ORIGIN`
- Mounts atmosphere drift motes (conditionally, full-motion only)
- Calls `acquireAmbientRendering()` for idle drift
- Reduced-motion check: drift frozen, shimmer frozen

---

#### `src/scales/coil/coil-fog.ts` (pure) + test

Same pattern as `arbor-fog.ts`. Two pure functions:

- `coilFogDensityDeltaFor(depth)` — peak delta ~0.014 at depth 0.44, rises
  from 0.42, clears by 0.48. Evaluates to exactly 0 outside [0.42, 0.50].
  This creates the haze the cluster materializes from.

- `coilFogColorBlendT(depth)` — max ~0.5 blend toward cool-blue fog
  `#2b3038`, sustained through the band, gone by 0.58. Exactly 0 outside
  [0.42, 0.58].

Tests (6+): zero before/after window, monotonic rise/fall, peak value,
symmetry with the cellular fog window (no overlap).

---

#### `src/scales/coil/coil-anchors.ts` (pure) + test

`REGION_ANCHORS: [Vec3, Vec3]` computed from `generateCoil(COIL_GROWTH_DEFAULTS)`
+ `regionAnchor` + `COIL_ORIGIN`. Single source of truth for annotation
positions and focus camera poses.

Tests: 2 distinct anchors, plausible bounding box, deterministic.

---

#### `src/scales/coil/CoilAnnotations.tsx`

Same architectural pattern as `ArborAnnotations.tsx`:
- Imperative positioning on gsap ticker via `getCameraPose()` + `worldToScreen()`
- Depth envelope: reveal 0.465→0.50, fade 0.545→0.565
- Two publication annotation groups (one per region locus)
- Each group: dot + hairline connector + label button + expandable card
- Focus: `toggleFocus(region)` drives `useCoilFocusStore` (or extend the
  existing `useBranchFocusStore` if the interface fits)
- Esc key closes focused region
- Publication data from `content/publications.json`
- Cards show: status badge, title, description, venue
- Scroll-release hint on first focus (same pattern)
- Viewport clamping (150px margin)
- Side logic: focused region always left, others use hysteresis

---

#### `src/scales/coil/CoilIntro.tsx`

Same pattern as `ArborIntro.tsx`:
- Fixed click-through column
- Depth envelope: reveal 0.435→0.46, fade 0.475→0.50
- Reads prose from `content/sections/coil.md`
- "Cooled lens" backdrop for legibility
- Blur/rise resolve-from-haze animation (frozen under reduced motion)
- Clears before CoilAnnotations arrives

---

#### Focus store

**Option A:** Extend `useBranchFocusStore` to handle both arbor branches and
coil regions (add a `focusType: 'branch' | 'region'` discriminator).

**Option B (recommended):** New `src/stores/coil-focus.ts` — same shape as
`branch-focus.ts` but typed for `regionIndex: 0 | 1 | null`. Keeps the two
stores independent (no cross-band state leaking). Same `focusBlend`,
`focusDepth`, `shouldReleaseFocus` pattern.

---

#### Camera focus poses

**`src/engine/camera-focus.ts`** — add `REGION_FOCUS_POSES` (2 entries,
one per publication region). Each ~8–10 units off the region anchor, target =
anchor, fov ~42–46. Reuses `blendCameraSample()`.

---

### Modified files

- **`scene-manager.tsx`** — registry: `coil: CoilScene` + `SCENE_KEYS`
  entry (`'coil'`).
- **`camera-keyframes.ts`** — insert 4 knots between depth 0.43 and 0.57:

| depth | beat |
|---|---|
| 0.455 | exit-glide from arbor hold; first beads glimmer in haze |
| 0.48  | cluster resolved, broadside orbital — "fiber visible" |
| 0.52  | sweep continues, annotation depth window |
| 0.565 | settled off-axis hold, dimmed backdrop (= near SCALE_BOUNDARIES[4]) |

  Starter positions tuned via camera-dev-tools leva panel.

- **`scene-atmosphere.tsx`** — after the arbor fog block: import + compose
  `coilFogDensityDeltaFor` and `coilFogColorBlendT`.
- **`CoilContent.tsx`** — rework to dual-register pattern:
  - WebGL active: two scroll runways (arrival ~140vh, index ~130vh),
    `CoilIntro` + `CoilAnnotations` overlays, `.coil-doc` is
    `display:none`
  - No WebGL: runways collapse, full document version renders
  - `hideBadge` on ScaleSection
- **`globals.css`** — `.coil-runway--arrival`, `.coil-runway--index`
  in the scroll runways block. `.coil-doc` display:none rule under
  `[data-webgl='active']`.
- **`app.tsx`** — lazy DEV-gated `CoilDevTools` mount (if dev panel is built).
- **`camera-controller.tsx`** — if using a separate coil-focus store: add the
  focus blend for coil regions (same pattern as branch focus).

### Dev tooling (optional, stage 5.2)

- `coil-live-params.ts` — null-by-default override channel
- `coil-dev-tools.tsx` — leva panel with growth + look sliders
- `coil-preview.html` + `coil-preview.tsx` — isolated preview
  (same pattern as cellular-preview)

---

## Staging plan

### Stage 5.1 — Generator + coil mesh

Build: `coil-generator.ts` + tests, `coil-params.ts`, `coil-geometry.ts`,
`coil-bead` shaders, `coil-linker` shaders, `CoilMesh.tsx`, `CoilScene.tsx`.
Wire into scene registry. No interaction, no annotations, no fog module yet.

**5.1 checkpoint:** Isolated preview — the dense cluster renders at the
correct depth with oblate beads, linker threads, Brownian drift, and the
rose-tinted shading. Draw calls = 2–3 (beads + linkers + optional motes).
Suite green.

### Stage 5.2 — Look-dev + tuning harness

Build: `coil-live-params.ts`, `coil-dev-tools.tsx`, `coil-preview.html`.
Tune: bead surface grooves, linker shimmer, drift amplitude, color balance.

**5.2 checkpoint:** Preview + live-site scrub at dpr 2. Bless a look → freeze
into `COIL_DEFAULTS`.

### Stage 5.3 — Fog, camera, transition, atmosphere

Build: `coil-fog.ts` + tests, camera knots, atmosphere drift motes. Wire fog
into `scene-atmosphere.tsx`. Build reveal curves in `CoilMesh.tsx`.

**5.3 checkpoint:** Full scroll-through: arbor hold → fog thickens → arbor
fades → cluster materializes from haze → orbital sweep → settled hold.
Interior-glide check: the arbor→coil depth window scrubs cleanly both
directions. 60fps through the transition overlap.

### Stage 5.4 — Unwind interaction + annotations

Build: `coil-focus.ts` store, `coil-anchors.ts`, camera focus poses, loop
ribbon geometry + shaders, `CoilAnnotations.tsx`, `CoilIntro.tsx`.
Rework `CoilContent.tsx` to dual-register. Wire `uUnwindBlend` +
`uFocusRegion` in `CoilMesh.tsx`.

**5.4 checkpoint:** Click each publication locus → 500ms unwind, region opens,
loop ribbons flow, card anchors to the opened region. Scroll-away releases.
Keyboard (Esc, Tab). Reduced motion = instant, HTML fully functional.
No-WebGL fallback unchanged.

---

## Full file inventory

**New:** `src/utils/coil-generator.ts(+test)` ·
`src/scales/coil/{coil-params, coil-live-params, coil-anchors(+test),
coil-geometry, CoilMesh, CoilScene, CoilAnnotations, CoilIntro,
coil-fog(+test)}.ts[x]` ·
`src/scales/coil/shaders/coil-{bead.vert, bead.frag, linker.vert,
linker.frag, ribbon.vert, ribbon.frag}.glsl` ·
`src/stores/coil-focus.ts(+test)` ·
`src/dev/{coil-dev-tools, coil-preview}.tsx` ·
`coil-preview.html` ·
`docs/p5-plan-coil-scene.md`

**Modified:** `scene-manager.tsx` (registry + keys) ·
`camera-keyframes.ts` (4 knots) ·
`camera-controller.tsx` (coil focus blend) ·
`camera-focus.ts` (region focus poses) ·
`scene-atmosphere.tsx` (coil fog delta + color blend) ·
`CoilContent.tsx` (dual-register rework) ·
`app.tsx` (dev panel) ·
`globals.css` (runway classes, display:none rule)

---

## Tests

5+ new test files (generator, anchors, fog, coil-focus store, camera-focus
additions). Zero edits to existing tests. Gate at every stage end:
`npm run typecheck && npm run lint && npm test -- --run && npm run build`.

## Risks

1. Dense cluster beads z-fighting at tight packing → polygon offset on
   linkers, bead spacing floor enforced in generator.
2. Unwind morph reading as "beads slide apart" not "structure opens" → the
   Approach B upgrade path (full geometry rebuild) is architectured in from
   day one.
3. Loop ribbon tubes rendering too thick / too thin at varying camera
   distances → width driven by `uPixelScale / dist` (same attenuation as
   arbor tips).
4. Fog overlap with arbor fog window → both modules evaluate to exactly 0
   outside their depth windows; tested.
5. Focus tween vs live scroll → depth-delta release rule (same as arbor).
6. Draw-call creep at the overlap → ~7 total at peak (arbor + coil),
   measure with r3f-perf.

## Verification (end of phase)

1. Suite green + prod build excludes dev-tool/preview chunks.
2. dpr-2 scroll-through both directions: arbor hold → fog → cluster
   materializes → orbital sweep → settled hold → dimmed backdrop.
3. Deterministic scrub: exact rewind everywhere.
4. Reduced motion: anchor cuts, frozen drift/shimmer, HTML-only interaction.
5. Focus interaction end-to-end: unwind, loop ribbons, annotation cards,
   release-on-scroll, a11y tab order, no-WebGL fallback.
6. 60fps at dpr 2 through the band; draw calls measured at the overlap.
7. Session log to `logs/YYYY-MM-DD_phase-5-coil-scene.md`.
