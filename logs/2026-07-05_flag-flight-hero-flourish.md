# 2026-07-05 — Flag-flight hero flourish

## What was done

Added a one-shot "flag flight" flourish to the tissue hero: a small trans-pride-flag
card flies in from the screen's bottom-right, arcs across, and dives into/behind
the form with real depth, then re-arms for the next arrival. Built tunable so the
launch frame, endpoint, size, and cloth-ripple can be chosen live in leva and baked.

**New files**

- `public/flag.svg` — the flag artwork, served at `/flag.svg` (copied from the
  untracked repo-root `flag.svg`).
- `src/scales/tissue/flag-flight.ts` — pure, node-testable (no `three`): `FlagFlightConfig`,
  two baked presets (`FLAG_FLIGHT_TOPDOWN` @ depth 0.15, `FLAG_FLIGHT_ESTABLISH` @ 0.02),
  `FLAG_FLIGHT_DEFAULT`, trigger predicates (`crossedLaunch`, `leftRearmZone`), `flightEase`,
  `flightOpacity`, and `sampleFlightPath` (Catmull-Rom over `Vec3`).
- `src/scales/tissue/flag-flight.test.ts` — 14 tests (path endpoints, ease/opacity bounds,
  trigger/re-arm).
- `src/scales/tissue/flag-flight-material.ts` — drei `shaderMaterial` (`uMap, uOpacity, uTime,
  uWaveAmp, uWaveFreq, uFogColor, uFogDensity`); inline vert (segmented plane + sine cloth wave)
  + frag (sRGB→linear decode, hand-rolled exp2 fog matching `tissue-shell.frag.glsl`, alpha discard).
- `src/scales/tissue/flag-flight-mesh.tsx` — the R3F component + SVG→CanvasTexture helper. Owns
  the trigger/re-arm state machine, camera-unprojected frozen world path, billboard+velocity bank,
  opacity envelope, and self-invalidating flight loop.
- `src/scales/tissue/flag-flight-live-params.ts` — dev override + one-shot replay channel.
- `src/dev/flag-flight-dev-tools.tsx` — leva `flag flight` folder: preset toggle, launch/path/size/
  bank/wave sliders, Replay button.

**Edited**

- `src/scales/tissue/TissueScene.tsx` — mounts `{!reduced && <FlagFlight />}` beside the burst.
- `src/app.tsx` — lazy + DEV mount of `FlagFlightDevTools`.

## Decisions made

- **One-shot, time-driven** (~1.2s on its own clock), not scroll-scrubbed — never freezes mid-air;
  re-arms after leaving the hero neighborhood. Matches the LoadingSequence/focus-pivot exceptions.
- **3D plane in the scene** (not DOM) so it gets genuine perspective depth, depth-buffer occlusion
  behind the shell, and fog.
- **Linear color output** (decode sRGB texels in-shader) to match the shell's EffectComposer pipeline.
- **Distinct file stems** (`flag-flight.ts` pure vs. `flag-flight-mesh.tsx` component) to avoid the
  `.ts`/`.tsx` resolution collision — mirrors `breakthrough.ts` / `breakthrough-particles.tsx`.

## Baked (2026-07-05 eye-pass)

Winner: **establishing reveal** (`FLAG_FLIGHT_ESTABLISH`, now `FLAG_FLIGHT_DEFAULT`) — the flag reads
as the opening beat at the start of the approach, before the pfp-carried hero. Tuned values:
`duration 1.5`, `size 3`, `waveAmp 0.3` (ripple on), `waveFreq 6`, and a new `peakOpacity 0.8`
(slightly translucent card). Added `peakOpacity` to `FlagFlightConfig` (applied in the component,
exposed on the panel).

## Open items

- **Occlusion verify:** "behind the brain" relies on the shell writing depth. Expected to work
  (shell is `transparent`-default-false); if it doesn't occlude, add a distance/silhouette opacity
  fade to `flag-flight-mesh.tsx`.
- Root-level `flag.svg` duplicate should be removed (`rm flag.svg`).

## Verification

`npm run typecheck` ✓  ·  `npm run lint` ✓  ·  `npx vitest run` → 151/151 ✓
Visual review pending in `npm run dev`.
