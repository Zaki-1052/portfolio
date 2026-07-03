# Phase 3: First 3D Scene (Tissue Shell + Breakthrough)

**Date:** 2026-07-02

## What was done

Filled the previously-empty persistent `<Canvas>` with the first real 3D scene: a
folded cortex shell (vertex-displaced icosahedron + custom shader) with a
reaction-diffusion surface texture, a depth-driven camera, one merged
post-processing pass, GPU-tier gating + WebGL error boundary, and the cinematic
breakthrough transition into a stubbed cellular void. Scroll depth drives
everything; nothing renders on idle except an optional ~30fps breathing loop.

- **Pure foundations (unit-tested, node env):** `src/utils/math.ts`,
  `src/engine/gpu-detect.ts` (renderer denylist, fails open), `scene-registry.ts`
  (`scalesToMount`, ≤2 invariant), `camera-keyframes.ts` (non-uniform cubic
  Hermite position + slerp + fov, `sampleCamera`/`sampleNearestKeyframe`),
  `src/scales/tissue/breakthrough.ts`, `src/engine/post-fx-curves.ts`. 40 new tests.
- **Engine 3D layer:** `render-loop.ts` (demand invalidation + ambient ticker),
  `theme-bridge.ts` gains `getBlendedTheme()`, `scene-atmosphere.tsx` (sole owner
  of clear color + FogExp2, tracks the theme-bridge colors, warm→magenta fog push),
  `camera-controller.tsx`, `post-fx.tsx` (memo, refs-only mutation), `scene-manager.tsx`,
  `WebGLErrorBoundary.tsx`.
- **Tissue scene:** `TissueScene.tsx`, `tissue-shell-material.ts` (drei
  shaderMaterial + v9 JSX augmentation), `shaders/noise.glsl` (Ashima simplex +
  fbm/ridged/warp), `shaders/tissue-shell.{vert,frag}.glsl`, `reaction-diffusion.ts`
  (GPUComputationRenderer warm-up→freeze, session cache, HalfFloat), `breakthrough-particles.tsx`
  (deterministic), `CellularVoidStub.tsx`.
- **Dev tools (lazy, DEV-gated):** `camera-dev-tools.tsx` (leva keyframe tuning +
  bake), `camera-theatre-spike.tsx` (Theatre core+studio, no @theatre/r3f).
- **Wiring:** `app.tsx` (GPU gate, `webglActive` latch, `data-webgl`, context-loss
  listener, Canvas children), `ScaleSection.tsx` (`--section-bg`), `TissueContent.tsx`
  (`content-scrim`), `globals.css` (scoped reveal + scrim), `vite-env.d.ts`.

## Decisions made

- **Reveal is scoped per-scale** (`data-webgl='active'` only transparent-izes
  tissue + cellular, which have scenes). Lower sections keep Phase-2 CSS until
  Phases 4/5 register scenes and extend the selector list.
- **Color truth stays in the theme-bridge** — SceneAtmosphere reads its blended
  values so the Canvas clear/fog match the CSS gradient (no duplicated table).
- **RD warms then freezes** (stop calling `.compute()`; RT texture is
  GPU-resident), cached at module scope so it never re-forms on scroll-back.
- **Theatre spike uses core+studio only** (avoids @theatre/r3f's R3F-v8-coupled
  `editable`); priority-1 useFrame overrides CameraController when enabled; fully
  isolated (lazy + try/catch + own error boundary). Production drops the chunk.
- **Dev tools conditional-lazy** so prod emits no leva/Theatre/perf chunks at all.
- Camera keyframes retuned to a radius-12 shell (z 26→3 through the aperture).

## Open items

- **Runtime/visual unverified** — shaders compile only in-browser; needs
  `npm run dev` + eyeballing (see checklist below). Camera keyframes, bloom/fog/
  grain intensities, dissolve params, and scrim opacity are all leva-tunable
  starters, not final.
- **Icosahedron detail 6** (~82k tris, ~16 snoise/vertex) — confirm against the
  r3f-perf HUD; dial down if the vertex cost bites.
- **Bundle** 1.47MB / 424KB gzip (three+R3F+drei+postprocessing) — per-scale code
  splitting deferred to Phase 7.
- Cellular→chromatin seam (transparent→opaque) is a Phase 5 crossfade concern.

## Verified

- `npm run typecheck` (tsc -b) — clean
- `npm run lint` — clean
- `npm test -- --run` — 58 passed (40 new + 18 existing)
- `npm run build` — passes; dev-tool chunks excluded from production

## Key file paths

- New engine: `src/engine/{gpu-detect,render-loop,scene-registry,scene-manager,
  scene-atmosphere,camera-keyframes,camera-controller,camera-dev-tools,
  camera-theatre-spike,post-fx,post-fx-curves}.*`
- New scene: `src/scales/tissue/{TissueScene,tissue-shell-material,reaction-diffusion,
  breakthrough,breakthrough-particles}.*`, `src/scales/tissue/shaders/*`,
  `src/shaders/{noise,reaction-diffusion}.glsl`, `src/scales/cellular/CellularVoidStub.tsx`
- New util/component: `src/utils/math.ts`, `src/components/WebGLErrorBoundary.tsx`
- Modified: `src/app.tsx`, `src/engine/theme-bridge.ts`, `src/components/ScaleSection.tsx`,
  `src/scales/tissue/TissueContent.tsx`, `src/styles/globals.css`, `src/vite-env.d.ts`
