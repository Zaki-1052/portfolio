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

> **Palette revision (2026-07-07, user-directed):** this band's register is
> now the home-base BLUE — accent `#61afef` (`--aod-blue`) over desaturated
> slate beads `#434a56`, threads `#7aa5d8` — restoring the master plan's
> vision for the third band. The rose register (`#d57aa5`) moved down one
> band to the fourth. Rose color values quoted elsewhere in this document are
> superseded; the blessed values live in `coil-params.ts` and `globals.css`.
> Growth defaults also tightened (pitch 0.55→0.5, beads 96→106) in the 5.1
> sign-off pass for a denser packed read. Fog anchor `#2b3038` unchanged.

> **Approach B adopted (2026-07-07, user-directed):** the unwind is now the
> full CPU-rebuild methodology from §5's upgrade path, implemented ahead of
> stage 5.4 — `generateCoil(params, { region, openT })` re-runs the whole
> pipeline (placement with lerped open multipliers, spacing floor, transport
> frames) every animation tick, so intermediate states are genuine re-coiled
> conformations. The bead layer is now the InstancedMesh of this document's
> original spec (per-tick update = ~106 matrices, not ~22k baked vertices);
> the merged-geometry variant and ALL morph-target plumbing
> (`aCompactPos`/`aUnwoundPos`/`uUnwindBlend`) are removed. A pure
> `coil-focus` store (Option B, as recommended below), the 500 ms
> `power2.inOut` tween with release-then-focus region switching, direct
> bead-click triggers, and the focus dim all ship with the engine. Remaining
> for 5.4: loop ribbons, annotations/cards, camera focus poses, intro
> overlay, dual-register content.

> **Stage 5.3 implemented (2026-07-07):** fog module `coil-fog.ts` (density
> delta peak 0.014 at depth 0.44, window [0.42, 0.50]; tint blend toward
> `#2b3038`, max 0.5, gone by 0.58 — composed in `scene-atmosphere.tsx` after
> the arbor terms; density windows tested disjoint). Four camera knots landed
> at 0.455 / 0.48 / 0.52 / 0.565 (dive → broadside resolve → orbit
> behind/below → left-third settle with annotation room right; reduced
> anchors on 0.48 and 0.565). The arbor got a body exit fade (all four
> materials, 0.445 → 0.485, done before the 0.49 unmount) and the coil's
> linker threads an authored lights-first reveal (0.435 → 0.455) ahead of the
> bead mass (0.44 → 0.48). Transition verification now runs on the NEW
> isolated `descent-preview.html` harness (real Canvas stack + theme-stub
> bridge + depth scrub/sweep) — the live site is never loaded. Measured:
> 60 fps through the 0.40→0.60 sweep, 14 draw calls/frame at the crossfade
> overlap, reduced-motion anchor cuts pixel-stable. Remaining for 5.4
> unchanged (list above).

> **Ethereal retune (2026-07-08, user-directed — "pretty, not a prison"):**
> the 5.5 look was still too dark/mechanical. Drums lifted from near-black
> slate to luminous pale blue (`beadBaseColor #434a56 → #7fa3c8`), ambient
> floor roughly doubled in the bead/thread/knob frags, an inner-luminance
> term added (strongest on cap faces — shadowed inner disks never go
> hostile-dark), fresnel halo widened (power 3.4 → 2.8, weight 0.18 → 0.28).
> The RING DESIGNS returned as pure ornament (the real thread carries the
> structure now): fbm-wobbled concentric rings across each cap + soft bands
> around the wall, new `ringAmp 0.45` / `ringFreq 5` sliders, valleys deepen
> gently while ridges pick up the accent. Gold softened to champagne
> (`threadColor #e8b24a → #d8b878`, knobs `#c99a3f → #c2a978`) with flatter
> wrapped diffuse and wide quiet sheens replacing the hard Blinn glints
> (bead spec 48/0.35 → 26/0.22). Verified in both harnesses at dpr 2,
> compact + focused; gates green (199 tests).

> **Stage 5.5 implemented (2026-07-07) — modeling fidelity pass:** the fake
> wound-band shading is gone; the winding is real geometry. Beveled-puck drum
> template (15-row lathe × 28 segments, analytic normals, ORGANIC surface —
> improved two-octave mottle + cap-skin tint after the user corrected the
> mis-recorded "machined" decision; no seams). Open rising coil packing
> (55 drums, 9/turn, radius 2.2, pitch 1.05, regionSize 9 — silhouette
> ≈ 5.4 × 7.4). Wound amber thread (`coil-thread-path.ts`, pure + 9 tests):
> per-drum rim wraps of EXACTLY `wrapTurns` (1.6) revolutions — only the
> entry azimuth is pinned (toward the previous drum), making the whole path
> a continuous function of node state (2π-periodicity hides the atan2 cut;
> no quantized turn count, winding pops impossible BY CONSTRUCTION — the
> planned freeze-k fallback was never needed; verified by a step-scaling
> probe in `scripts/verify/`). Free tangent-launched bridges (sag ramps in
> on long spans only, keeping compact junctions exactly C1); cord sinks
> `WRAP_SINK` (0.18ρ) into the wall (grazing tangent z-fights). One merged
> tube, static topology, per-tick rewrite; drift-matched vertex shaders
> (`aSeedA/aSeedB/aDriftMix`) keep the cord pinned to drifting drums at the
> blessed driftAmp 0.1. Cinch knobs: InstancedMesh ×110 at wrap entry/exit.
> Thread register: opaque lit cord + `threadEmissive` dial (0 = matte;
> additive variant documented in the frag header). Linker layer + groove
> params deleted. Camera: broadside knot 0.48 re-authored (stand-off + spool
> lower-right of the intro fade window); 0.455/0.52/0.565 held;
> `REGION_FOCUS_DISTANCE` 17 → 20. Measured: unwind tick 0.248 ms (was
> 0.75 ms — 55-bead generator run outweighs the added tube), 60 fps sweeps
> both directions at dpr 2, reduced-motion pixel-stable (identical PNGs),
> both regions' focus + switch + card verified in the descent harness, prod
> bundle clean. 199 tests green. Live-site bless: user.

> **Stage 5.4 implemented (2026-07-07) — PHASE 5 COMPLETE:** loop ribbons
> (one mesh, both regions' arcs, rewritten in place per unwind tick alongside
> the beads/threads; traveling-packet frag, blooming in the later half of the
> opening), scene-native publication annotations (`CoilAnnotations`, anchors
> that RIDE the unwind blend, screen-space label de-collision — two loci on
> one compact cluster can project coincident at aligned view angles, unlike
> the arbor's three spread tips), region camera focus (`regionFocusPoseFor`
> derived from `coil-anchors.ts`; the controller blend RIDES `unwindBlend` —
> geometry and camera are one gesture, no second tween), `CoilIntro`
> (0.435→0.50 window, clears before annotations at 0.465), and the
> dual-register `ChromatinContent` rework (runways 140vh/130vh,
> `.chromatin-doc` hidden under WebGL, chromatin added to the WebGL-reveal
> selector lists). Growth default `regionGap 0.33 → 0.375`: at 6 turns, 0.33
> was exactly 2.0 revolutions — both loci at the SAME azimuth (overlapping
> labels, twin unwind bearings); 0.375 puts them ~82° apart with the compact
> silhouette untouched. Compact anchors are the regions' CENTER BEADS (rim),
> not centroids (a ~0.86-turn arc's centroid collapses toward the cluster
> axis). Verified in both harnesses AND on the live site (user-cleared):
> full interaction, Esc/scroll-release, reduced-motion pixel-stable,
> 19 calls/frame at 61 fps with a region focused.

> **Phase 5.6 implemented (2026-07-10, user-directed) — underwater
> refinement + hub-dive transition** (full plan: `PLAN.md` at repo root;
> log: `logs/2026-07-10_phase-5.6-underwater-refinement.md`). Four
> user-critiqued problems fixed: (1) the arbor→coil camera swivel replaced
> by a dive THROUGH the tree's glowing hub — target locks on at 0.442, the
> hub's glow swells ×4 and widens (`uHubFill`) until it owns the frame, the
> arbor fades to fog color BEFORE the near-plane crossing (0.446→0.458 +
> `visible=false`), the fog spike peaks exactly at the crossing (0.458) with
> a transient bloom swell, and the coil reveals only past it (lights
> 0.462→0.48, body 0.468→0.5) — no frame ever holds both subjects; (2) the
> band is now an underwater deep-dusk medium — sustained fog plateau
> (+0.006), deep-teal tint `#20343a`, band CSS `--bg #232d31`, four water
> layers (silt 650 / near bokeh / bubbles / veils via the generalized
> CloudBank) all riding ONE shared current wave (`coil-current.ts`, λ≈105 u)
> that the drums/cord/knobs also carry at `beadCurrentAmp 0.05` — one body
> of water, nothing detaches; (3) the flashbang drums re-graded to mid-tone
> slate `#607e9a` with light-from-above, procedural env reflections, and
> caustic dapple; (4) the uncanny cord re-registered as a teal biolume
> two-tone (`#3f7d8a` body + `#7fe3f2` camera-facing core), real cylindrical
> shading, baked wrap AO (`aShade`), contact shadows both sides, and the
> `vT*90` corduroy shimmer replaced by 3 slow traveling pulses. The ring
> ornament's wall bands cut to a whisper. Verified previews-only at dpr 2:
> 60 fps sweeps both ways, reduced-motion byte-identical parks, 24–27
> calls/frame, focus interaction end-to-end; 208 tests green. All values
> are slider starters pending Zara's live bless.

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

### Stage 5.5 — Modeling fidelity pass (drums + wound thread)

> **Detailed design landed 2026-07-07 (this session)** — the review, the
> locked decisions, and the full architecture below. Implementation staged
> 5.5a → 5.5d.

**Why:** the blessed 5.1–5.4 look leans too far into evocative abstraction to
read as a *wound spool of drums*. The drums render as lumpy textured ovals in
a packed wall, and the thread is a near-invisible ghost line. The current
bead frag even FAKES the wrap by banding "wrapped-thread grooves" across each
bead's surface (`coil-bead.frag.glsl:44-51`) + adds fbm mottle — a shading
trick standing in for real wound geometry. 5.5 replaces the fake with the
real thing and cleans up the drums.

**The four fixes (review, in priority order):**

1. **Make the wound thread real and explicit** (highest leverage). Today it's
   a thin center-to-center sag tube fading between drums. Replace with a
   thicker, brighter, contrasting tube that visibly **wraps ~1.5–2 turns
   around each drum's rim** before bridging to the next — the single feature
   that turns "pile of discs" into "wound spool." The wrap is generated from
   the live per-bead transport frames, so it follows the unwind naturally.
2. **Clean, uniform drums** (second highest). Replace the squished UV sphere +
   fbm mottle with a high-res **beveled cylinder/puck**: flat cap faces, a
   crisp rim highlight, and subtle **radial wedge seams** (8-fold) for
   machined-detail credibility. Kill the mottle — the previous "read as
   material, not injection-molded" intent is explicitly reversed here.
   **[SUPERSEDED 2026-07-07 by the corrected locked decision below: drums
   stay ORGANIC. The puck geometry + rim highlight stand; the wedge seams
   are OUT and an improved mottle is IN.]**
3. **Cinch knobs** — a small contrasting knob (clasp) at each drum's
   thread entry/exit point, the physical anchor detail.
4. **Legible packing** — commit to one clear architecture instead of the
   chaotic wall (see decision below).

**Locked decisions (user, 2026-07-07):**

- **Packing → open rising coil.** Fewer drums per turn (~8–10), smaller
  radius with a visible hollow core, so it reads as a spiral staircase of
  wound drums. This OVERRIDES the earlier "dense cluster" lock (creative
  decision #1) — recognizability wins over density. Dependency: the camera
  knots (0.455/0.48/0.52/0.565, framed to the current cluster size) and the
  anchor bounds will need a retune in the descent harness once the new
  silhouette exists.
- **Wound thread → warm amber/gold** (~#e8b24a) against the cool slate-blue
  drums: maximum contrast, and a warm callback inside the cool band. The rest
  of the register (blue accent, fog, drum body) stays blessed.
- **Drums → ORGANIC**, not machined: the prior session misrecorded this as
  "clean/machined — the user agreed" but the user's intent was always organic
  above all else. The lumpy-oval look is still the problem to solve, but the
  fix is a better organic surface read (improved mottle, rim highlight from
  the bevel, real wound thread providing the structure) — not a machined
  industrial aesthetic.

**In scope (all in `src/scales/chromatin/`, unwind engine untouched):** the
bead template + bead shaders (drum shape/shading, kill mottle), the
linker→wound-thread geometry + a new thread material/shaders, optional cinch
knobs, packing params (`COIL_GROWTH_DEFAULTS`), dev-panel sliders, and a
camera-knot/anchor retune. Preserve: the Approach-B unwind, focus store,
annotations, fog, dual-register content.

**User look choices = starter defaults, NOT locks (2026-07-07):** lit thread
with subtle glow, amber knobs, full 6-turn column — chosen from descriptions,
explicitly provisional. Each ships as a live dev-panel parameter
(`threadEmissive` [0, 1.5] where 0 = fully matte, `knobColor` picker,
`coilTurns` slider) and gets re-blessed by eye in the preview.

### 5.5 detailed design

**Architecture:**

1. New pure module `coil-thread-path.ts` (no three imports, node-tested like
   the generator) holds all wrap+bridge math; emits into caller-owned
   Float32Arrays — zero allocation on the tween path.
2. Puck template: hand-built lathe grid (same rows×(cols+1) idiom as the old
   UV sphere), 15 profile rows (cap center/mid/edge → bevel arc ×3 → wall
   top/mid/bottom → mirrored) × 28 radial segments ≈ 435 verts, analytic
   normals (caps flat, wall radial, bevel quarter-arc). Half-thickness baked
   in template space (local Z = fiber tangent, like the old squish) so
   instance matrices stay rigid and `writeBeadInstances` is untouched.
   Surface stays ORGANIC (user correction, 2026-07-07): an improved
   two-octave fbm value mottle (seed-phased, slider-controlled) + a faint
   cap-skin tint via a per-vertex `aCapMask` — the clean silhouette carries
   the form, the mottle only breathes the surface. No seams or sector lines.
3. Thread: ONE merged tube (all wraps + bridges), static topology sized from
   bead count alone, per-tick position/normal rewrite like the old linker
   writer. Wrap ring frames are analytic (exact, twist-free); bridge frames
   parallel-transport from the wrap-exit frame — surface continuous through
   junctions.
4. Thread register: opaque lit cord with an emissive dial (`uThreadEmissive`
   feeds bloom); the additive-glow alternative is contained to the frag
   output block + material flags (documented in the shader header).
5. Knobs: one `InstancedMesh`, 2 per drum at wrap entry/exit, low-poly dome,
   per-tick matrix rewrite. +1 draw call.
6. Drift registration (found in design review): drum Brownian drift is
   shader-side but thread/knobs are CPU geometry — a tight wrap would detach
   from a drifting drum. Thread/knob verts duplicate the bead drift formula
   via seed attributes (`aSeedA`/`aSeedB`/`aDriftMix`; bridges blend endpoint
   drifts, and junction rings sit at blend 0/1 so seals hold at any
   amplitude). `driftAmp` stays at the blessed 0.1 (organic register).

**Wrap-path math** (per node `i`: center `C`, frame `(N, B, T)`, drum radius
`r`, aspect `a`, thread radius `ρ`, wrap turns `W` = 1.75, winding sense
`σ = +1` fixed; constants `WRAP_SAMPLES 28`, `BRIDGE_SAMPLES 6`,
`THREAD_RADIAL 6`, `WRAP_Z_FRACTION 0.55`, `BRIDGE_TENSION 0.35`):

- Entry/exit azimuths: project the chord to the neighbor off `T`
  (`p = toNext − (toNext·T)T`, guard `|p| < 1e-4 → p = N`), then
  `φ_out = atan2(p·B, p·N)`; same with `toPrev` for `φ_in`. End drums extend
  by `σ·2πW`.
- Winding count: `Δφ_raw = mod(σ·(φ_out − φ_in), 2π)`;
  `k = max(1, round(W − Δφ_raw/2π))`; `Δφ = Δφ_raw + 2πk` — continuous as
  `Δφ_raw` wraps between ticks; actual turns land in `[W−0.5, W+0.5]`.
- Wrap sampling (u = 0..1): `φ(u) = φ_in + σ·Δφ·u`;
  `z(u) = ±z_w`, `z_w = WRAP_Z_FRACTION·r·a`; point
  `P = C + (r+ρ)·e_r(φ) + z·T` with `e_r(φ) = cosφ·N + sinφ·B`. Analytic
  tangent `T_w = σ·(r+ρ)·Δφ·(−sinφ·N + cosφ·B) + 2·z_w·T`; ring basis
  `side = e_r`, `up = cross(T_w, side)` — exact, no ref-guard, no twist.
- Bridge: cubic Bézier from wrap exit A to next wrap entry D (C0 exact,
  duplicated junction rings); controls `A + t_A·L·BRIDGE_TENSION` /
  `D − t_D·L·BRIDGE_TENSION`, both dropped by `linkerSag·L` in y; frames
  parallel-transported from the wrap-exit frame.
- Unwind: all inputs recompute from live nodes each tick; topology never
  changes; buffers never reallocate.

**Per-tick budget** (55 drums): ~11.2k thread verts (pos+normal) plus 55
drum and 110 knob matrices; estimated 1.0–1.4 ms vs 0.75 ms today (generateCoil
halves at 55 beads). Gate < 2 ms; degradation ladder `WRAP_SAMPLES` 28→22,
`THREAD_RADIAL` 6→5. Draw calls: beads + thread + ribbons + knobs (+ motes)
→ mid-band 10 → 11.

**Packing retune — `COIL_GROWTH_DEFAULTS` starters (all live sliders):**

| Param | Old | New | Why |
|---|---|---|---|
| beadCount | 106 | 55 | 54 gaps / 6 turns = 9 drums per turn |
| coilRadius | 2.8 | 2.2 | visible hollow core (Ø ~3.4) |
| coilPitch | 0.5 | 1.05 | staircase rise; turn clearance over drum Ø 1.0 |
| coilTurns | 6 | 6 | full column starter |
| beadRadius | 0.45 | 0.5 | chunky drum proportion |
| beadAspect | 0.6 | 0.62 | drum thickness ~0.62 world units |
| jitter | 0.08 | 0.08 | unchanged — organic irregularity, floor stays inactive |
| linkerSag | 0.12 | 0.1 | now the bridge sag |
| regionSize | 15 | 9 | one turn per locus; ≥5 (loopArcPairs), ≤ count/3 |
| regionGap | 0.375 | 0.375 | 2.22 turns between centers → ~80° azimuth split |

Sanity: naturalSpacing ≈ 1.54 → spacing floor (1.05) inactive at defaults;
rim-to-rim gap ≈ 0.54 leaves bridge room; silhouette ≈ 5.4 wide × ~7.4 tall
(vs 6.5 × 3) — hence the 5.5c camera retune.

**Params/dev panel:** remove `grooveAmp`/`grooveFreq` (+ `aGroove` plumbing)
and the linker quartet (`linkerColor/Opacity/Width/WaveAmp`) +
`CoilLinkerUniforms`. Add (default · leva range, every range containing its
default): `mottleAmp 0.35 · [0,1]`, `beadSpecStrength 0.35 · [0,1]`,
`beadSpecPower 48 · [8,128]`, `beadBevel 0.14 · [0.05,0.3]` (growth folder —
rebuilds template), `threadColor '#e8b24a'`, `threadRadius 0.055 ·
[0.02,0.15]`, `threadEmissive 0.35 · [0,1.5]`, `wrapTurns 1.6 · [1,2.5]`
(fractional part ≈ 0.6 aims each exit at the next drum — short tidy
bridges), `knobColor '#c99a3f'`, `knobSize 0.11 · [0.02,0.25]`. Keep bead
colors/fresnel, `locusGlow`, `focusDimStrength`, `driftAmp` (0.1 unchanged),
`shimmerSpeed` (repurposed: thread emissive pulse), all ribbon params.
Presets keep their `tight/open/loose` keys (preview `?preset=` URLs intact),
values re-derived.

**Tests:** NEW `coil-thread-path.test.ts` (C0 junctions exact; winding turns
in range; wrap points at distance `r+ρ` from the drum axis; ring normals ⊥
tangent; z-span within the wall; openT continuity 0.5 vs 0.501 and 0 vs 1e-4
— catches winding pops; determinism). `coil-generator.test.ts` — no
assertion changes intended (parameterized, floor inactive at new defaults).
`coil-anchors.test.ts` — expected to pass (compact pair ≈ 3.6 > 3 tightest);
nudge `regionGap` before relaxing any bound. `camera-focus.test.ts` — holds
while `REGION_FOCUS_DISTANCE` ∈ ~[12.5, 23]. Keyframe + fog tests untouched.

**Sub-stages:** 5.5a pucks + packing (chromatin-preview dpr 2, gate) →
5.5b wound thread + knobs (thread-path tests, unwind continuity via real
trusted clicks + stepped `?open=` screenshots, tick < 2 ms, gate) →
5.5c camera/anchors/annotations retune (descent-preview bake workflow, FULL
reload after keyframe edits, 60 fps sweep) → 5.5d gates + bless + dated
addendum + session log.

**Risks:** winding-count pop at the `round()` half-integer threshold
(continuity test + stepped screenshots; fallback: freeze per-drum `k` from
the compact conformation); wrap↔bridge ring-phase seam (bridge sample 0 can
copy the wrap ring verbatim); tick budget (measured in 5.5b before polish);
drift detachment (drift-matched verts, required); `UNWOUND_*` multipliers
tuned for the old packing (verify `?open=1` framing; keep radius mult ≥ 2
for the spread test); bloom washing the amber cord (tune `threadEmissive`
against the preview's real PostFX); click targets (regionSize 15 → 9 but
drums grow — exercise real clicks).

**5.5 checkpoint:** the resting fiber reads unmistakably as a wound coil of
clean drums with a bright wrapping thread; unwind still opens a region with
the thread following; blessed blue register + fog intact; gates green;
verified in `chromatin-preview` + `descent-preview` + the live site.

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
