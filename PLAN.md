# Phase 3 — First 3D Scene (Tissue Scale)

## Context

Phases 0–2 are complete: toolchain, full semantic HTML content layer, and the scroll engine (Lenis + GSAP → canonical `depth` 0–1, per-scale color blending, depth indicator, reduced-motion, URL sync). `src/app.tsx` **already mounts a persistent full-viewport `<Canvas>`** (`frameloop="demand"`, `dpr={[1,2]}`, camera at z=50, clearing to `#282c34`) whose only child is a `<color>` — an empty stage.

Phase 3 fills that stage: the first real 3D scene (a folded organic shell surface for the tissue scale), a depth-driven camera, one merged post-processing pass tuned for the warm register, a WebGL error boundary + GPU-tier gate, and the cinematic **breakthrough** transition at the tissue→cellular boundary. This is the hardest phase — it establishes every 3D pattern later scales reuse.

**Stack reality:** R3F **9.6** / drei **10.7** / `@react-three/postprocessing` **3.0.4** (wraps `postprocessing` **6.39.1**, now a direct dependency — installed) / three **0.170**. Under `frameloop="demand"` the scene renders only when `invalidate()` is called, so depth changes must drive invalidation explicitly.

## Confirmed decisions

1. **Camera authoring:** `leva` is the dev-tuning path (R3F-v9-safe); a **Theatre.js spike** is added but gated behind `VITE_THEATRE_ENABLED` (off by default) and fully isolated (lazy import, own error boundary, independent camera via `makeDefault`) — `@theatre/r3f@0.7` hard peer-requires R3F v8 and is likely broken on v9. **Production ships a static baked keyframe table.**
2. **Tissue visual:** a **folded noise-shader shell** (curved shell displaced by ridged/domain-warped fbm; warm matte + gold fresnel rim; warm fog; heavy golden bloom; grain) as the core, **plus a Gray-Scott reaction-diffusion texture layer** feeding surface color/displacement detail. The shell doubles as the surface the breakthrough punches through.
3. **Breakthrough:** the **full cinematic mechanism now** (aperture dissolves open with a burning edge, camera pushes through with an FOV punch, particle burst, warm→magenta fog shift); the far side is a **minimal placeholder void** (`CellularVoidStub`) that Phase 4 replaces via a one-line registry change.

## Prerequisites

- ~~`npm install postprocessing@6.39.1`~~ **Done** (user installed with `--legacy-peer-deps`). Needed for runtime enum values (`ToneMappingMode.ACES_FILMIC`, `BlendFunction.OVERLAY`) — the R3F wrapper only re-exports them as types.

## Architecture (the load-bearing shape)

- **Single source of color truth stays the theme-bridge.** The Canvas's fixed clear color would otherwise replace Phase 2's blended warm→cool background wherever sections go transparent. Fix: `theme-bridge.ts` additionally stores its per-tick blended channel values in a module-level exported getter (`getBlendedTheme(): { bg, fogColor, accent } | null` — it already computes these, zero duplication); a new **`SceneAtmosphere`** component (mounted once inside Canvas) reads it each frame and drives `gl.setClearColor` + the **single scene-level `FogExp2`** (color/density lerped per depth; during the breakthrough window it pushes toward the magenta anchor via `fogBlendT`). Remove `<color attach="background">`. Scene fog is a singleton — **only `SceneAtmosphere` ever owns it** (built-in materials pick it up automatically; the custom shell shader mirrors it via uniforms).
- **The reveal is scoped per-scale.** Only scales with a registered scene go transparent — `[data-webgl='active'] [data-scale='tissue'], [data-webgl='active'] [data-scale='cellular'] { --section-bg: transparent; }` and the same scoping hides their `::before`/`::after` CSS atmospherics (the 3D owns atmosphere there; the solid bottom-fade gradient would otherwise paint opaque bands over the scene). **Lower sections keep their full Phase-2 CSS look untouched** until Phases 4–5 register their scenes (extend the selector list then). `ScaleSection` gets a one-line change: inline `background: 'var(--section-bg, var(--bg))'` — so `--bg` remains a real color inside sections (the scrim depends on it; overriding `--bg` itself to transparent would delete the scrim).
- **`demand` + invalidation.** `src/engine/render-loop.ts` owns *when* frames happen: (a) subscribes `depth` + `reduced` → `invalidate()`; (b) `resize` listener → `invalidate()`; (c) **`setAmbientRendering(active: boolean)`** — a ~30fps ambient invalidator piggybacked on the already-running gsap ticker (frame-skip every other tick), so the scene *breathes at rest* (slow `uTime` drift) instead of freeze-framing when scrolling stops. Gated: tissue scene mounted && !reduced (rAF throttling pauses it in background tabs for free). `CameraController`/`PostFX`/scene read `getState()` imperatively inside `useFrame` and own *what* renders.
- **Lazy-mount registry.** `scene-registry.ts`: pure `scalesToMount(depth)` + `SCENE_REGISTRY` table; `scene-manager.tsx` renders the mounted set via zustand `useShallow`. **`MOUNT_MARGIN = 0.06`** — 0.1 would mount *three* scenes near boundaries (bands are ~0.17 wide; any margin > 0.085 breaks the ≤2 budget, e.g. depth 0.25 → tissue+cellular+chromatin). Unit test sweeps depth 0→1 asserting `length ≤ 2`.
- **One merged post-fx pass**, refs-only mutation (see 3.3).
- **Two failure modes → one `webglActive` latch**: GPU-tier gate (before mount) + error boundary (sync throws) + `webglcontextlost` listener (async). Any trip → unmount Canvas, `data-webgl='fallback'`, Phase-1/2 CSS atmosphere takes over everywhere.

## Work — mapped to PLAN §3.1–3.8

Conventions for every new file: line-1 `// <repo-relative-path>` comment; **named exports only**; `@/` alias; `interface XxxProps`; explicit return types on pure fns/hooks (not components); pure data/logic in `.ts` separate from component files (react-refresh lint); `noUncheckedIndexedAccess`-safe indexing (`arr[i]!` with documented invariant).

### 3.1 WebGL error boundary + 3.2 GPU detect + infra

- **`src/components/WebGLErrorBoundary.tsx`** (new) — class component; `getDerivedStateFromError`/`componentDidCatch` → `onError` prop; renders children unless tripped, then `null` (fallback content is the always-present HTML/CSS layer).
- **`src/engine/gpu-detect.ts`** (new) — `classifyRenderer(str): GpuTier` (pure, tested; denylist software rasterizers/old-mobile GPUs → `'fallback'`, **fail open to `'full'`** on masked/unknown strings); `detectGpuTierStandalone()` — throwaway canvas → `WEBGL_debug_renderer_info` → **release the probe context via `WEBGL_lose_context.loseContext()`** (contexts are a limited resource).
- **`src/engine/render-loop.ts`** (new) — `startRenderInvalidation(): () => void` + `setAmbientRendering(active: boolean)` as described above. Kept separate from `scroll-engine.ts` (which stays three-agnostic for node tests).
- **`src/engine/scene-registry.ts`** (new) — `MOUNT_MARGIN = 0.06`, `scalesToMount(depth): ScaleName[]` (pure, tested incl. the ≤2 sweep), `SCENE_REGISTRY: Partial<Record<ScaleName, ComponentType>>` (tissue → `TissueScene`, cellular → `CellularVoidStub`).
- **`src/engine/scene-manager.tsx`** (new) — renders the mounted set via `useShallow` (re-renders only when the *set* changes, not per tick).
- **`src/engine/scene-atmosphere.tsx`** (new) — the fog/clear-color owner described above; one `useFrame`, reuses temp `THREE.Color` objects (no per-frame allocation; `new THREE.Color(cssString)` parses the theme-bridge rgb strings with correct sRGB→linear conversion).
- **`src/engine/theme-bridge.ts`** (modify, small) — store the already-computed blended channel values in a module-level object; export `getBlendedTheme()`. No behavior change to the CSS path.
- **`src/vite-env.d.ts`** (modify) — add `ImportMetaEnv.VITE_THEATRE_ENABLED?: string` and `declare module '*.glsl?raw'`.
- **`src/app.tsx`** (modify) — `detectGpuTierStandalone()` once at boot; `webglActive` one-way latch; set `data-webgl`; wrap `<Canvas>` in `<WebGLErrorBoundary onError>`; `onCreated` `webglcontextlost` listener; Canvas `gl={{ antialias: false, powerPreference: 'high-performance' }}` (composer multisampling owns AA — default-framebuffer MSAA is wasted fill once composing) and `style={{ ..., pointerEvents: 'none' }}` (no 3D interaction this phase; Phase 4 revisits with `eventSource`); children: `<SceneAtmosphere/> <SceneManager/> <CameraController/> <PostFX/>`, dev-only `<Perf/>` + lazy `<CameraDevTools/>` + env-gated lazy `<CameraTheatreSpike/>` (all under `import.meta.env.DEV &&`, dead-code-eliminated in prod); call `startRenderInvalidation()` from the existing bootstrap effect. **Guardrail comment:** `App` keeps zero per-tick reactive state so Canvas's children reference stays stable (post-fx footgun).
- **`src/components/ScaleSection.tsx`** (modify, one line) — `background: 'var(--section-bg, var(--bg))'`.
- **`src/styles/globals.css`** (modify) — the scoped per-scale reveal rules + `.content-scrim` (radial `var(--bg)` halo behind the text column, opt-in class, no-op when WebGL inactive).

### 3.3 Post-processing (one merged pass) — also PLAN §3.6 warm-register tuning

- **`src/engine/post-fx.tsx`** (new) — `PostFX` = `memo`, zero props. One `<EffectComposer enableNormalPass={false} multisampling={4}>` with children **in this order**: `<Bloom mipmapBlur>` → `<ToneMapping mode={ToneMappingMode.ACES_FILMIC}>` → `<Noise blendFunction={BlendFunction.OVERLAY}>` → `<Vignette>` — bloom operates in HDR, tonemap, then grain/vignette in LDR (mirrors the CSS overlay-grain look; grain stays stable in highlights). Still ONE merged EffectPass. All children take **static-literal args only**; refs captured; one internal `useFrame` mutates `bloom.intensity`/`.luminanceThreshold`, `noise.blendMode.opacity`, `vignette.darkness` from `postFxCurveFor(depth)`. Prominent code comment: **never pass a depth-derived prop here** (tears down and rebuilds every pass per tick). The explicit `<ToneMapping>` child is required — mounting EffectComposer forces `gl.toneMapping = NoToneMapping` for its lifetime. Golden bloom comes from the shell's warm fresnel rim clearing `luminanceThreshold` (Bloom has no tint). **Verify early:** `ref` on `<Bloom>` resolves to the effect instance; fallback is `EffectComposerContext` pass-list lookup by type.
- **`src/engine/post-fx-curves.ts`** (new) — `postFxCurveFor(depth): PostFxCurve` (pure, tested): heaviest at tissue (`depth=0`: bloom high, grain ≈ 0.055 matching the CSS token, vignette present) → near-zero by code/expression, matching SPEC §5 + PLAN §5.6. Phase 4/5 extend this file — never a second composer.

### 3.4 Camera controller (+ leva + Theatre spike)

- **`src/engine/camera-keyframes.ts`** (new) — `CameraKeyframe` (depth, position, quaternion, fov), `CAMERA_KEYFRAMES` (starter table below), `liveCameraKeyframes` (dev working copy), `sampleCamera(depth)`, `sampleNearestKeyframe(depth)`. **Position sampling is a hand-rolled centripetal Catmull-Rom evaluated per segment with the keyframes' depth values as knots** (~15 lines of pure basis math, unit-tested) — piecewise lerp has velocity pops at every keyframe, and the aperture fly-through needs C1 continuity; `THREE.CatmullRomCurve3` is wrong here (uniform parameterization ignores our depth knots). Orientation: `slerpQuaternions` between bracketing keyframes. FOV: smoothstep lerp — include a **50→~58 FOV ramp across the breakthrough** for the speed-punch sensation. Starter anchors (placeholder, tuned in leva): `0→(0,0,50)`, `0.08→(0,1,30)`, `0.15→(0,0,8)` (aperture line-up), `0.19→(0,0,-4)` (past the shell). z=0 deliberately lands *after* the breakthrough (a literal z=0 tissue endpoint likely clips inside the shell).
- **`src/engine/camera-controller.tsx`** (new) — `CameraController(): null`; one `useFrame` reads `getState().depth`/`.reduced`, applies `sampleCamera` (or `sampleNearestKeyframe` under reduced motion — nearest-neighbor snap gives the "instant cut" for free, including across the breakthrough), sets position/quaternion/fov (+`updateProjectionMatrix` on fov change). No leva/Theatre imports.
- **`src/engine/camera-dev-tools.tsx`** (new, dev-only) — leva `useControls` writing into `liveCameraKeyframes`; **every `onChange` calls `invalidate()`** (under `demand`, edits are otherwise invisible until the next scroll); plus a leva **"bake" button** that copies the tuned table as JSON to the clipboard for pasting into `CAMERA_KEYFRAMES`. Reached only via `React.lazy` under `import.meta.env.DEV`.
- **`src/engine/camera-theatre-spike.tsx`** (new, dev + `VITE_THEATRE_ENABLED='true'`) — lazy-imports Theatre, mounts `editable.perspectiveCamera makeDefault` as an independent path with its own error boundary. Assume broken on v9; failure must be free. **Budget zero time on it working.**
- **OPTIONAL (user call, cut freely):** subtle damped pointer parallax — ≤0.4-unit camera offset composed *after* keyframe sampling (never fights the scroll path), driven off `pointermove` + the ambient ticker while settling, disabled under reduced motion.

### 3.5 Tissue scene (shell + material + shaders + reaction-diffusion)

- **`src/scales/tissue/TissueScene.tsx`** (new) — composes: shell mesh (high-detail `IcosahedronGeometry` + custom material — folding happens in the vertex shader), the RD-warmup hook, the breakthrough sub-tree. **No fog element** (SceneAtmosphere owns scene fog; the shell mirrors it via uniforms). Owns `uOpacity` driven by `scaleProgressFor(depth,'tissue')` (1.0 arrival → ~0.2 content phase). Toggles `setAmbientRendering(true/false)` on mount/unmount (gated on `!reduced`) so slow `uTime` drift keeps the surface alive at rest; `uTime` frozen under reduced motion.
- **`src/scales/tissue/tissue-shell-material.ts`** (new) — drei `shaderMaterial` + `extend`; uniforms: `uTime, uOpacity, uBaseColor, uFresnelColor, uFresnelPower, uFogColor, uFogDensity, uRDTexture, uRDBlend, uDissolve, uDissolveCenter, uDissolveRadius, uDissolveEdgeColor`. Lighting is a **fixed uniform key-light** and fog is **manual uniforms** (a `shaderMaterial` doesn't auto-receive scene lights/fog; hand-set is predictable for stylized NPR). Color uniforms constructed via `new THREE.Color(hex)` so sRGB→linear matches the CSS palette. R3F v9 JSX augmentation via `ThreeElements`/`ThreeElement<T>`.
- **`src/shaders/noise.glsl`** (new) — shared simplex3D + fbm + domain-warp; `?raw`-imported into the shell vertex shader and the RD seed.
- **`src/scales/tissue/reaction-diffusion.ts`** (new) — `createReactionDiffusion(gl, size, params)` on `three/examples/jsm/misc/GPUComputationRenderer.js` + `useReactionDiffusionWarmup()` policy hook. **Warm-up-then-freeze:** a self-invalidating `useFrame` runs `.compute()` ~8–16×/frame for ~300–600 total steps at 256², then stops (freeze = stop computing; the RT texture is GPU-resident, no bake/readback). **Result cached module-level across remounts** (warm once per session, ~0.5 MB GPU — scrolling back up never shows the pattern re-forming); dispose only on context loss. `setDataType(HalfFloatType)` where float-render targets are unsupported (iOS-class). Reduced motion → smaller fixed budget. Visual-verify only (needs a real renderer; not unit-tested).
- **`src/shaders/reaction-diffusion.glsl`** (new) — Gray-Scott step fragment shader, `?raw`.
- **`src/scales/tissue/TissueContent.tsx`** (modify, small) — wrap the text column in `className="content-scrim"`.

### 3.7 Breakthrough (+ stubbed destination)

- **`src/scales/tissue/breakthrough.ts`** (new) — `BREAKTHROUGH_START=0.15`, `BREAKTHROUGH_END=0.19`, `breakthroughProgress(depth)`, `dissolveAmountFor(depth, reduced)` (smoothstep, or hard 0/1 step under reduced motion), `fogBlendT(depth)` (consumed by SceneAtmosphere for the warm→magenta fog push). Pure, tested. Straddles the canonical 0.17 boundary as a distinct cinematic beat.
- **Dissolve burning edge:** in the shell fragment shader, fragments whose dissolve-noise value sits within a band of the threshold get an emissive `uDissolveEdgeColor` rim (warm→magenta) — nearly free, the classic touch that sells the aperture opening.
- **`src/scales/tissue/breakthrough-particles.tsx`** (new) — `THREE.Points`, ~200–400 particles (1 draw call). **Positions are a pure deterministic function of `breakthroughProgress`** (seeded directions/speeds baked into buffer attributes at mount; per-frame position = `center + dir_i · speed_i · progress`, alpha from progress) — scroll scrubs both directions, so a stateful `pos += vel` sim would break on reverse. Additive, `depthWrite:false`. **Not mounted under reduced motion.**
- **`src/scales/cellular/CellularVoidStub.tsx`** (new) — near-empty: one dim light, nothing else (fog comes from SceneAtmosphere). Registered as `SCENE_REGISTRY.cellular`; Phase 4 = build `CellularScene`, swap the registry line, delete this. Participates in the real lazy-mount lifecycle now.
- Camera push-through is **just rows in `CAMERA_KEYFRAMES`** — the sampler carries it through.

### 3.6 / 3.8 Shared utils, tuning, perf baseline

- **`src/utils/math.ts`** (new) — `lerp`, `clamp`, `remap`, `smoothstep` (dependency-free). Tested.
- **r3f-perf** — `<Perf/>` in-Canvas, dev-only. Record baseline (draw calls < 100 target, triangles, FPS, GPU memory) once shell + particles + post-fx exist; compare to Phase 2's ~1.38 MB / 399 KB-gzip empty-Canvas note.

## Reduced motion (SPEC §8 / DESIGN §6)

Canvas stays mounted, scene **static**: camera snaps to nearest keyframe (instant cuts), `uTime` frozen, ambient ticker off, breakthrough dissolve steps hard 0/1, particles unmounted, RD uses the small fixed warm-up then freezes, animated grain (Noise) disabled with post-fx intensities frozen static. Bloom/tone-mapping stay (style, not motion). `render-loop.ts` still invalidates on depth change so instant cuts render.

## Tests (pure logic, vitest node env, `toBeCloseTo`, relative imports)

`gpu-detect.test.ts`, `scene-registry.test.ts` (incl. depth-sweep asserting ≤2 mounted), `camera-keyframes.test.ts` (anchors exact, C0 continuity, Catmull-Rom vs lerp midpoint sanity, nearest-keyframe), `post-fx-curves.test.ts` (monotone decrease, tissue grain ≈ 0.055 at 0), `breakthrough.test.ts` (window clamps, reduced-motion step), `math.test.ts` — plus the existing 18 keep passing. 3D scene / RD / shaders are manual-visual only.

## Risks (load-bearing)

1. **Theatre.js v9 mismatch is real** (`^8.13.6` vs `9.6.1`) — isolation makes failure free; budget no time on it.
2. **RD warm-up jank** on tier-cutoff devices — keep 256², re-measure with r3f-perf.
3. **Contrast over a live scene** — scrim opacity must be checked against the brightest rendered moment (fresnel rim behind text); mandatory manual step.
4. **Post-fx footgun is a standing trap for Phase 4/5** — refs-only mutation documented in-code.
5. **WebKit/Safari:** masked renderer strings (fail-open covers), HalfFloat RT color quirks, fixed-Canvas rubber-banding — spot-check once visible; full pass Phase 7.
6. **GPU false-negative has no "try anyway" escape hatch** (acceptable for Phase 3).
7. **Context-loss recovery out of scope** — once tripped, fallback for the session.
8. **Ambient ticker battery cost** — ~30fps redraw while tissue is on-screen and idle; acceptable for a hero scene, and it stops off-scale/reduced/hidden. Re-check in the Phase 7 perf pass.

## Verification

**Automated (I run — allowed):**
```
npm run typecheck   # tsc -b --noEmit
npm run lint        # eslint .
npm test -- --run   # vitest — 6 new suites + existing 18
npm run build       # tsc -b && vite build — inspect dist/ size vs Phase 2 baseline
```
**Manual (you run `npm run dev`, + leva + r3f-perf):**
- Cold load: shell visible, warm/golden, bloom present, grain subtle, no console WebGL errors.
- **Stop scrolling on the hero: the surface still breathes** (slow drift, ~30fps ambient) — and freezes when reduced motion is on.
- Scroll 0 → ~0.17: shell dims into content phase (text legible over the scrim — check contrast at the brightest moment), aperture dissolves with a glowing edge, camera pushes through with the FOV punch, particle burst, fog warm→magenta, lands in the void. **Then scrub backward** — the whole sequence reverses cleanly (deterministic particles/dissolve).
- Background gradient: scroll the whole page — the warm→cool blend still works everywhere (SceneAtmosphere tracks the theme-bridge; lower sections keep their Phase-2 CSS look).
- Toggle motion mid-scroll: camera snaps between keyframes, no particles, dissolve steps, no grain flicker, no ambient drift.
- r3f-perf: draw calls < 100 with everything active.
- Resize with no scroll: a frame is produced.
- leva: drag a value → renders immediately (invalidate on change); "bake" button copies the table; panel absent in a prod build.
- `VITE_THEATRE_ENABLED=true` in `.env.local`: Studio opens and either works or **fails silently** (hard crash unacceptable).
- Force `gpuTier='fallback'` (temp hardcode): no Canvas, Phase-1/2 CSS everywhere, no errors.
- Simulate context loss (DevTools Rendering / `WEBGL_lose_context`): fallback engages cleanly, no black screen.

On completion: write `logs/2026-07-02_phase-3-tissue-3d.md` per the project logging convention.
