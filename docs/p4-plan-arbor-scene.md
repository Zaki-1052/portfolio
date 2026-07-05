# Phase 4 — The Arbor: branching-tree scene for the second band

> **Language convention (hard requirement, same as Phase 3.5):** all code, comments, docs, commit messages, and session logs use only neutral geometric/botanical/design vocabulary — "arbor," "tree," "trunk," "limb," "strand," "tip," "canopy." No anatomical terms anywhere. The old roadmap's `Dendrite*` file names are NOT used; the existing `'cellular'` scale identifier stays (wired end-to-end). `'branch'` keeps its existing meaning: the three HTML click-groups in `content/projects.json` / `CellularContent.tsx`.

## Context

Phases 3–3.9 shipped the complete first scene: the sculpted shell, overture, orbit descent, plunge-through, lit interior, and the fog/atmosphere system — all user-blessed. At the second band boundary the registry currently swaps in `CellularVoidStub` (one rose ambient light). Phase 4 replaces it with the site's interactive project index: a branching tree in the `cellular` band, canonical depth **[0.28, 0.43)** (verified: `SCALE_BOUNDARIES = [0, 0.14, 0.28, 0.43, 0.57, 0.71, 0.86, 1.0]`, scale-manager.ts:28).

**User-locked vision (do not relitigate):**
- **Hybrid look** — volumetric sculpted trunk + three major limbs (shell's craft register: surface relief, fresnel rim, manual exp2 fog) dissolving into fine emissive strands and glowing tip points. Emissive gradient runs root→tip.
- **Reveal** — the tree resolves out of rose-tinted fog, continuous with the interior swell (peaks 0.28, settles 0.31). Preserve the smoldering handoff the user likes ("lava-like with drifting spots") — same ember/drift technique, handed from amber to rose with no gap.
- **Generous runway** — extra scroll room after the hero handoff before the content phase (named runway spacer); the tree stays as a dimmed backdrop behind content afterward.
- **Full phase, staged 4.1→4.4** with user eye-pass checkpoints between stages.
- Register: rose `#d57aa5` (`--aod-rose`), band bg `#2a292e`, fog `#312b30` (already in globals.css under `[data-scale='cellular']`). Moderate bloom (< band one), cooler fog.

**Step 0 (first implementation act):** copy this plan into the repo as `docs/p4-plan-arbor-scene.md` (project convention — plans are audited in-editor).

## Verified load-bearing facts

- **Scene swap is one line**: `SCENE_REGISTRY` in `src/engine/scene-manager.tsx` (`cellular: CellularVoidStub` → new scene) + a `SCENE_KEYS` entry. Mount window: new scene mounts at depth 0.22 (margin 0.06), the shell unmounts at 0.34 — a 0.22–0.34 overlap covers the handoff.
- **Camera**: `CAMERA_KEYFRAMES` has NO knots inside the band — one Hermite segment from the 0.31 interior-glide knot (`pos [0,-1,-6] → target [0,-4,-15]`) to the 1.0 tail (`pos [0,-46,-14]`). Free-flight position at 0.43 ≈ `(0,-8.6,-7.4)`.
- **Tangent caveat (corrected from design pass)**: `tangent(i)` reads knots i−1 and i+1 (camera-keyframes.ts:247). Inserting a knot after 0.31 changes the 0.31 knot's forward neighbor, so the **0.231→0.31 interior-glide segment's end-tangent shifts** (old ≈[0,−62,−12] → with a 0.335 knot at [3,−6,−16]: ≈[29,−77,−106]). Endpoints stay fixed and the beat is deep in fog, but it MUST be eye-passed in 4.3 and the first inserted knot tuned so the glide stays calm. Segments ending ≤ 0.231 are provably unaffected.
- **Parallax**: rotation-only post-multiply inside the controller's `useFrame` (camera-controller.tsx:84-87). Any DOM projection of world anchors must use the FINAL post-parallax pose or cards drift ~2° off their anchors → pose-mirror module (below).
- **Fog**: `SceneAtmosphere` is the sole owner of clear color + the one fogExp2; `fog-density.ts` + its tests are blessed band-one artifacts — extend via an additive delta module, never edit them. Custom materials do manual exp2 reading the `scene-fog.ts` mirror.
- **Fog needs a body**: void space renders flat clear color; atmosphere is geometry (halo/clouds/motes/embers/shafts patterns in `src/scales/tissue/atmosphere-*.tsx`, 1 draw call each, `DriftField` shared shader).
- **Rules**: demand frameloop (`invalidate()` on every visible change; `setAmbientRendering` for idle drift); fragment texture taps in uniform control flow; deterministic scrub (all depth-driven values are pure functions of depth); reduced motion = anchors/frozen uTime/unmounted decorative layers; dpr-2 review discipline; leva panels lazy DEV-only with explicit `<Leva/>`; blessed values hand-frozen into constants modules.
- **Tests**: colocated `*.test.ts` (never .tsx), vitest node env, pure modules only. 94 passing. **Zero existing test edits needed** (verified: camera tests are index-agnostic past index 5; anchor count asserts ≥5; fog-density tests only cover the untouched `fogDensityFor`).
- **HTML layer exists**: `CellularContent.tsx` — three `.branch` buttons (`epigenetics/structural/software` keys) with `aria-pressed`/`data-dim` filtering a `ProjectCard` list (2 tier-1 projects per group, lorem one-liners — keep placeholder). This remains the canonical accessible path; SPEC: the 3D interaction is optional enhancement.
- `.content-scrim` glass is budget-capped and spent — floating cards reuse the `.project-card` opaque treatment.
- Cellular section already goes `--section-bg: transparent` under `[data-webgl='active']`.

---

## Stage 4.1 — Generator + tree mesh

### New files

**`src/utils/arbor-generator.ts`** (pure, no three import, node-tested)
- `ArborGrowthParams`: seed, trunkSegments(5), trunkLength(6), trunkRadius(1.1), limbSegments(9), limbLength(14), limbRadius(0.6), limbSpreadDeg(42), limbCurl(0.35), fineLevels(6), fineSplits(2), fineSpreadDeg(28), fineLengthTaper(0.72), fineRadiusTaper(0.68), fineCurl(0.5), **sideSproutRate(~0.35)**, strandRadiusFloor(0.015).
- `ArborNode { position: Vec3, radius, parent (-1 root), limb: -1|0|1|2, level, region: 'trunk'|'limb'|'strand', t: 0..1 }`.
- Algorithm: seeded `mulberry32` PRNG (deterministic per seed). Trunk grows +Y with easing taper → splits into exactly 3 limb spines at *unequal* azimuths (asymmetry ethos), each a curled polyline → fine recursion (`fineSplits` children, spread/taper/curl per generation, stop at `strandRadiusFloor` or `fineLevels`). **Fine strands sprout both from spine tips AND probabilistically from intermediate spine nodes (`sideSproutRate`)** — pure tip-recursion reads as pom-poms on sticks; side sprouts give a believable canopy. `t` = cumulative path length / global max (second pass). ~400–600 nodes at defaults.
- `limbTipNode(nodes, limb)` — highest-t node per limb (card anchors + sanity).
- `ARBOR_GROWTH_DEFAULTS` export.

**`src/utils/arbor-generator.test.ts`** — connectivity (valid parents, no cycles), monotonic radius taper per edge, t∈[0,1] with deepest ≈1, determinism (same seed ⇒ deep-equal), node-count budget guard, three limbs all populated.

**`src/scales/cellular/arbor-params.ts`** — mirrors `shell-params.ts`: `ArborLookParams` (colors/relief/fresnel/emissive/glow widths) + `ARBOR_ORIGIN: Vec3` (starter **[2, -14, -28]** — puts the canopy in the existing flight corridor, off-center for rule-of-thirds) + presets (`sparse`/`dense`/`gnarled`) + `ARBOR_DEFAULTS` + `applyArborLook(material, params)`.

**`src/scales/cellular/arbor-anchors.ts`** (pure) — `BRANCH_ANCHORS: Record<0|1|2, Vec3>` computed once from `generateArbor(ARBOR_GROWTH_DEFAULTS)` + `limbTipNode` + `ARBOR_ORIGIN`. Single source of truth for card anchors and focus poses. (Derives from frozen defaults — if growth params are re-tuned after 4.4, re-check anchors.) + `arbor-anchors.test.ts` (3 distinct anchors, plausible bounding box, deterministic).

**`src/scales/cellular/arbor-geometry.ts`** (three-touching, not unit-tested — same precedent as `buildCloudGeometry`):
- `buildTrunkGeometry(nodes)` — hand-rolled tapered-tube sweep (NOT `THREE.TubeGeometry` — constant radius only) with parallel-transport frames (no Frenet twist), 8 radial segments/ring; trunk + 3 limb spines merged into one set of typed arrays. Attributes: `position`, `normal`, `aT`, `aRadius`, `aLimb`.
- `buildStrandGeometry(nodes)` — **camera-facing ribbon quads** (2 tris/edge, width from `aRadius`, billboard axis computed in the vertex shader via built-in `cameraPosition`) — real taper + good bloom read; WebGL lines clamp to 1px and can't taper. Documented fallback: `LineSegments` if ribbons prove fiddly in 4.2.
- `buildTipGeometry(nodes)` — one `Points` buffer over leaf nodes (soft additive sprites, `atmosphere-motes` technique).

**Materials** — `src/scales/cellular/arbor-trunk-material.ts` (`ArborTrunkMaterial`, drei shaderMaterial, composes shared `noise.glsl` like the shell) and `arbor-glow-material.ts` (`ArborStrandMaterial` + `ArborTipMaterial`, shared `arbor-glow.frag.glsl`, separate vert stages). Shaders under `src/scales/cellular/shaders/`: `arbor-trunk.{vert,frag}.glsl`, `arbor-strand.vert.glsl`, `arbor-tip.vert.glsl`, `arbor-glow.frag.glsl`.

Trunk uniforms: `uTime, uOpacity, uBaseColor, uTipColor, uFresnelColor, uFresnelPower, uEmissiveStrength (t²-scaled), uReliefAmp, uReliefFreq (fbm vertex relief), uFogColor, uFogDensity (exp2 identical to shell frag), uFocusBranch (-1|0|1|2), uFocusBlend, uHoverBranch`.
Strand/tip: `uTime, uOpacity, uColor, uFogColor, uFogDensity, uFocusBranch, uFocusBlend, uHoverBranch` (+ point-size scale on tips). All fragment logic in uniform control flow (no textures needed at all in v1 — rule satisfied trivially).

**`src/scales/cellular/ArborMesh.tsx`** — assembles the 3 meshes from generator output + live params; per-frame uniform writes mirror `TissueScene`'s pattern (depth → reveal/dim/fog mirror/focus uniforms).

**`src/scales/cellular/CellularScene.tsx`** — top-level scene (sibling naming convention): mounts `<ArborMesh/>` (+ 4.3 atmosphere), calls `setAmbientRendering(!reduced)` on mount/unmount (idle drift), group at `ARBOR_ORIGIN`.

### Modified
- `src/engine/scene-manager.tsx` — registry swap + `SCENE_KEYS` entry (`'arbor'`).
- **Removed:** `src/scales/cellular/CellularVoidStub.tsx` (its docstring says Phase 4 replaces it).

### 4.1 checkpoint (eye-pass)
Isolated preview only, dpr 2, several seeds: trunk+limbs read volumetric, periphery reads as believable filigree, no twist artifacts. Draw calls = exactly 3 (r3f-perf). Suite green (`typecheck · lint · vitest · build`).

---

## Stage 4.2 — Look-dev + live-tuning harness

### New files
- `src/scales/cellular/arbor-live-params.ts` — null-by-default override channel (shape of `shell-live-params.ts`); also carries 4.3's fog knobs (one folder, one channel, like `atmosphere-live-params`).
- `src/dev/arbor-dev-tools.tsx` — `useArborControls` + panel, mirrors `shell-dev-tools.tsx`: presets, growth+look sliders (growth-param changes regenerate geometry), writes override + `invalidate()`.
- `cellular-preview.html` (repo root) + `src/dev/cellular-preview.tsx` — mirrors tissue preview exactly: own createRoot/Canvas, URL params `seed/rx/ry/spin/z/fov/dpr(default 2)/preset`, real `<PostFX/>`. Dev-server-only automatically (single-entry prod build — verified no `rollupOptions.input`).

### Modified
- `CellularScene.tsx` — `getSceneFog()` wiring, live-override check per frame, content-phase dim curve (from 4.3's `arbor-reveal.ts`).
- `src/app.tsx` — lazy DEV-gated `ArborDevTools` mount beside the other three panels.

Look-dev items: rose gradient balance (solid `uBaseColor` warm-dark bark tone → `uTipColor` luminous rose), relief amplitude, strand width/glow, optional **gentle uTime sway** on strands/tips (vertex-stage, scrub-independent, frozen at 0 under reduced motion) — decide by eye whether the canopy breathes.

### 4.2 checkpoint (eye-pass)
Preview + live-site scrub at dpr 2. Bless a look → freeze into `ARBOR_DEFAULTS` (same discipline as `SHELL_DEFAULTS`; values stay "Claude defaults" until the user's explicit sign-off). Don't gold-plate against band-one's still-moving fog/look values.

---

## Stage 4.3 — Arrival choreography (camera, fog, atmosphere, runway)

### Camera knots — insert 4 between 0.31 and 1.0 (both untouched; everything ≤0.231 provably unaffected)

| depth | position | target | roll | fov | anchor | beat |
|---|---|---|---|---|---|---|
| 0.335 | [3,-6,-16] | [2,-9,-28] | -0.01 | 60 | — | exit-glide; silhouette first resolves in rose mist |
| 0.365 | [9,-8,-19] | [2,-10,-27] | -0.02 | 55 | ✓ | orbital sweep, broadside — "tree resolved" |
| 0.395 | [5,-5,-9] | [2,-9,-24] | 0.015 | 51 | — | sweep curls toward the front |
| 0.43 | [-4,-7,-5] | [1,-10,-24] | 0 | 48 | ✓ | settled off-axis rule-of-thirds; dimmed backdrop hold (= SCALE_BOUNDARIES[3]) |

Starter values — tuned via the existing camera-dev-tools leva panel (auto-grows folders from the table; bake-to-clipboard; no code change). Reduced anchors go 5→7 (test asserts ≥5). **Mandatory 4.3 check: scrub 0.231→0.31 both directions — the interior glide's end-tangent shifts with the 0.335 insertion; tune knot placement until the glide stays calm.**

### Fog — additive delta module (never edit `fog-density.ts`)
**`src/scales/cellular/arbor-fog.ts`** (pure) + test: `FOG_ARBOR_PEAK 0.335 · CLEAR 0.395 · FLOOR 0.41–0.43 · RESTORE 0.46 · DENSITY_PEAK 0.03 · FLOOR 0.010`; `arborFogDensityDeltaFor(depth)` (rise→clear→floor→restore, smoothstep pairs, C1) and `arborFogColorBlendT(depth)` (toward a rose fog anchor). Both evaluate to exactly 0 at depth ≤0.31 and ≥0.46 — band one and chromatin-onward provably byte-identical; zero edits to `fog-density.test.ts`.

**`src/scales/cellular/arbor-reveal.ts`** (pure) + test: `arborRevealFor(depth)` (0→1 fade-in, smoothstep 0.31→0.395, feeds `uOpacity`) and `arborContentDimFor(depth)` (mirrors the shell's content-phase dim via `scaleProgressFor(depth,'cellular')`). No dissolve shader in v1 — the fog does the "emerging from mist" work.

### Atmosphere (the smoldering continuity)
- `src/scales/tissue/atmosphere-motes.tsx` — export the private `DriftField`/`DriftConfig` (visibility widening only).
- **`src/scales/cellular/arbor-atmosphere.tsx`** — `ArborHalo` (reuses halo material/shaders, parked behind `ARBOR_ORIGIN`, rose-tinted, fades in with `arborFogColorBlendT`) + `ArborEmbers` (new rose `DriftConfig` around the canopy, envelope timed so it picks up exactly as the amber interior embers drain by 0.31 — same technique, same register, amber→rose handoff with both scenes mounted 0.22–0.34).
- `src/engine/scene-atmosphere.tsx` — after the interior-push block: `density += arborFogDensityDeltaFor(depth)`, `fogColor.lerp(ARBOR_ROSE_FOG, arborFogColorBlendT(depth))`, overridable via the arbor live-params channel. SceneAtmosphere stays the sole fog owner.

### Runway
- `globals.css` — `.runway-arbor-arrival { height: 130vh }` in the Scroll runways block (TUNED AGAINST CAMERA TIMING comment).
- `CellularContent.tsx` — spacer inserted before the `.branches` grid.

### 4.3 checkpoint (eye-pass)
Full scroll-through both directions at dpr 2 (deterministic scrub — every new driver is a pure function of depth); the interior-glide tangent check; reduced-motion cut pass over the 2 new anchors; r3f-perf at the 0.28–0.34 overlap (~8 shell + ~5 arbor ≈ 13, measure don't assume); 60fps through the orbital sweep.

---

## Stage 4.4 — Click-to-focus + floating cards + HTML sync

### Interaction plumbing — **DOM-projected hotspots, canvas stays `pointerEvents:'none'`** (firm)
WebGL raycasting was rejected: the section's DOM box intercepts clicks above the z:-1 canvas regardless of the canvas's own pointer-events, and carving `pointer-events:none` holes through the content layer is fragile. DOM hotspots give real click targets, keyboard/AT sanity, and work without the canvas.

- **`src/engine/camera-pose.ts`** (new, tiny) — module mirror (pattern of `scene-fog.ts`): `CameraController` writes the FINAL post-parallax/post-focus pose `{position, quaternion, fov}` each rendered frame; the card projector reads it. Kills both the parallax drift problem and any duplicated blend logic.
- **`src/engine/screen-project.ts`** (pure) + test — `worldToScreen(point, pose, aspect): {x, y, scale, visible}` (quaternion-conjugate rotate into camera space + perspective divide; `visible:false` behind camera). Tests: dead-ahead → center; behind → invisible; wider fov → closer to center.
- **`src/content/branch-order.ts`** (pure) — `BRANCH_ORDER: BranchKey[]` extracted from `CellularContent.tsx` (single source for limb-index ↔ branch-key).

### Focus store + camera blend
- **`src/stores/branch-focus.ts`** + test — `{focusedBranch, hoveredBranch, focusBlend, focusDepth}` + actions; `BRANCH_FOCUS_RELEASE_DELTA = 0.012`; pure `shouldReleaseFocus(depth, focusDepth)`.
- **`src/engine/camera-focus.ts`** (pure) + test — `BRANCH_FOCUS_POSES` (authored ~8–10 units off each `BRANCH_ANCHORS` entry, target = anchor, fov ~42–46; tuned live via a small "focus poses" folder appended to camera-dev-tools), `blendCameraSample(base, focus, t)` (position/fov lerp, hand-rolled quaternion slerp in the codebase's pure style).
- **`camera-controller.tsx`** — after the depth sample: `if focusedBranch → s = blendCameraSample(s, focusPoseFor(branch), focusBlend)` **before** the parallax post-multiply; gsap tween drives `focusBlend` 0↔1 over 400ms `power2.inOut` with `invalidate()` per tick (instant set under reduced motion); per-frame release check `shouldReleaseFocus` (scroll-away cancels focus — scrub sanctity).

### Cards
- **`src/scales/cellular/ArborCards.tsx`** — mounted from `CellularContent.tsx` into a fixed overlay at `--z-overlay`; three pre-focus markers + per-branch floating card cluster positioned via `worldToScreen(BRANCH_ANCHORS[i], getCameraPose(), aspect)`; imperative subscribe+ref-write idiom (DepthIndicator's pattern) on depth store + focus store + a pointermove-coalesced update — no React re-render on the hot path. Cards reuse `.project-card` opaque treatment (sharp corners, small, fade with focusBlend).
- **Accessibility (firm):** the floating layer is a visual echo — markers/cards get `aria-hidden` + `tabIndex={-1}`/`inert`; the canonical accessible path stays the in-flow `.branch` buttons + `ProjectCard` list (which now drive the same store). Overlay hidden entirely when `[data-webgl='active']` is absent (no-WebGL fallback = today's plain HTML, zero new JS state).
- **Hover affordance:** DOM marker `onMouseEnter` → `hoveredBranch` → `uHoverBranch` fresnel/emissive brighten (no raycast anywhere).
- **HTML sync:** `CellularContent.tsx` lifts its local `focus` state to the store — buttons and 3D stay in lockstep; non-focused limbs dim via `uFocusBranch/uFocusBlend`.

### 4.4 checkpoint (eye-pass)
Click each branch (button AND marker) → 400ms pivot, limb dim, cards fade in at anchors (parallax-locked, no drift); scroll-away releases; keyboard tab order = 3 real buttons + in-flow cards only; reduced motion = instant pivot, HTML fully functional; no-WebGL fallback unchanged.

---

## Full file inventory

**New:** `src/utils/arbor-generator.ts(+test)` · `src/scales/cellular/{arbor-params, arbor-live-params, arbor-anchors(+test), arbor-geometry, arbor-trunk-material, arbor-glow-material, arbor-fog(+test), arbor-reveal(+test), arbor-atmosphere, ArborMesh, CellularScene, ArborCards}.ts[x]` · `src/scales/cellular/shaders/arbor-{trunk.vert,trunk.frag,strand.vert,tip.vert,glow.frag}.glsl` · `src/engine/{camera-pose, camera-focus(+test), screen-project(+test)}.ts` · `src/stores/branch-focus.ts(+test)` · `src/content/branch-order.ts` · `src/dev/{arbor-dev-tools, cellular-preview}.tsx` · `cellular-preview.html` · `docs/p4-plan-arbor-scene.md`

**Modified:** `scene-manager.tsx` (registry+keys) · `camera-keyframes.ts` (4 knots + comment) · `camera-controller.tsx` (focus blend, pose mirror write, release check) · `scene-atmosphere.tsx` (fog delta + rose blend) · `atmosphere-motes.tsx` (export DriftField) · `CellularContent.tsx` (store lift, runway spacer, ArborCards mount) · `app.tsx` (dev panel) · `globals.css` (runway class, overlay rules, neutralize one stale comment above `.branches`)

**Removed:** `CellularVoidStub.tsx`

## Tests
7 new test files (generator, anchors, fog, reveal, camera-focus, screen-project, branch-focus store) — all pure, node-env, colocated. Zero edits to existing tests (verified against each assertion). Gate at every stage end: `npm run typecheck && npm run lint && npm test -- --run && npm run build`.

## Risks
1. Limbs reading thin/twisted → parallel-transport frames, 8+ radial segments, multi-angle dpr-2 pass at 4.1.
2. 0.231→0.31 glide reshaped by the 0.335 knot (real, verified) → mandatory scrub check + knot tuning in 4.3.
3. Ribbon billboards fiddly / seam z-fighting → documented `LineSegments` fallback; `polygonOffset` at trunk↔strand seam (stalk-mesh precedent).
4. Focus tween vs live scroll → depth-delta release rule makes them mutually exclusive; 400ms is short.
5. Card drift under parallax → solved structurally by the `camera-pose.ts` mirror.
6. Draw-call creep at the overlap → ~13 total, measure with r3f-perf, budget <100.
7. Fog-owner discipline → arbor-fog exports pure deltas only; SceneAtmosphere remains sole owner.

## Verification (end of phase)
1. Suite green + prod build excludes dev-tool/preview chunks.
2. dpr-2 scroll-through both directions: shell interior → rose mist → tree resolves → orbital sweep → off-axis settle → dimmed backdrop under content; amber→rose ember handoff with no visible gap.
3. Deterministic scrub: exact rewind everywhere.
4. Reduced motion: anchor cuts, frozen uTime, HTML-only interaction fully functional.
5. Focus interaction end-to-end (both entry points), release-on-scroll, a11y tab order, no-WebGL fallback.
6. 60fps at dpr 2 through the band; draw calls measured at the overlap.
7. Session log to `logs/2026-07-05_phase-4-arbor-scene.md` (per project convention); blessed values frozen with explicit user sign-off lines.
