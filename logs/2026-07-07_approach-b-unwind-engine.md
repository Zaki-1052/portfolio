# Approach B — CPU-rebuild unwind engine + InstancedMesh bead layer

**Date:** 2026-07-07

User-directed adoption of the design doc's full-complexity path ("option B"),
implemented ahead of stage 5.4: the unwind is a per-tick CPU re-run of the
generator pipeline (not a shader morph between two baked snapshots), and the
bead layer moved to the InstancedMesh representation the doc originally
specified. All verification on the isolated preview only.

## What was done

- **`coil-generator.ts`:** `generateCoil(params, open?)` — the open state is
  produced by the SAME pipeline (placement → jitter → spacing floor → frames)
  with three multipliers lerped by `openT`; bitwise-identical compact output
  at `openT` 0, bitwise the baked unwound targets at 1, continuous between,
  frames re-transported every call (seam discs tilt toward the opening).
  `unwindRegion` (the crude radial-scale seam) removed. Tests 13 → 19; one
  invariant rewritten honestly: beads after the region may RELAX slightly
  when it opens (floor-push release — crowding relief, continuous).
- **`coil-geometry.ts`:** merged bead builder → `buildBeadTemplate` (one
  oblate template, aspect + ellipsoid normals baked, per-instance
  aSeed/aT/aRegion/aLocusW) + `writeBeadInstances` (rigid rotation + uniform
  radius scale matrices, alloc-free); `buildLinkerGeometry` refactored to
  allocate + `writeLinkerGeometry` rewrite-in-place. All morph attributes and
  the manual union bounding sphere deleted; both meshes render with
  `frustumCulled={false}` (per-tick moving geometry; comment inline).
- **Shaders:** bead vert — morph block removed, instancing is the primary
  path, drift rides after the instance transform; frag noise moved to
  template-LOCAL coords + per-bead seed phase (patterns ride with beads
  through the unwind instead of crawling). Focus dim trio
  (`uFocusRegion`/`uFocusDim`/`uFocusDimStrength`) on beads AND threads —
  everything outside the unwound region recedes, riding the tween.
- **`stores/coil-focus.ts` (+6 tests):** pure store mirroring branch-focus
  (blend tween-owned, `shouldReleaseCoilFocus` scroll-release rule).
- **`CoilMesh.tsx`:** unwind engine — GSAP 500 ms `power2.inOut` tween on the
  store blend; per-frame write guard (idle frames do zero CPU work);
  release-then-focus sequencing on region switch; scroll-away release;
  direct bead click/hover triggers (instanceId → region); reduced motion
  snaps instantly.
- **Dev harness:** 'coil unwind' leva folder (region buttons through the real
  tween path + blend scrub); preview `?region=0|1&open=0..1` seeds the store
  before mount for deterministic screenshots.
- **`focusDimStrength`** look param (0.55) in coil-params + panel.

## Verification (isolated preview, dpr 2)

- Compact regression vs the blessed blue set: character preserved; 2 draw
  calls (InstancedMesh ×106 + linker mesh); geometries flat at 3 across seed
  rebuilds and open/close cycles.
- Open-state series `?region={0,1}&open={0.25,0.5,0.75,1}`: the region's
  ~full turn swings out as a wide bright loop, discs re-orient along the
  path, threads stay attached and tauten, the compact mass dims — the
  maximum-contrast unwind the doc locked.
- Real trusted click on a locus bead (Playwright mouse; synthetic events
  don't carry offsetX and never reach the raycaster): hover cursor, tween
  0→1 in ~520 ms on the inOut curve, bead matrices land on the 3× arc;
  toggle-click closes back bit-exact. Region switch: blend 1 → release dip →
  1 on the new region.
- **Bug found & fixed:** flipping reduced motion and changing focus in the
  same instant landed on a stale-closure subscription whose tween the effect
  cleanup then killed, freezing the blend. Fix: read the motion store inside
  the callback; the subscription mounts once (deps []). Race re-run: snaps
  clean.
- Perf: full Approach-B tick (generate + matrices + linker rewrite) =
  **0.75 ms**, tween-only; no allocation growth.
- Gates green: typecheck, lint, 176 tests, build; bundle contains no dev
  chunks and no dead morph identifiers.

## Open items

- 5.3 (fog module, camera knots/transition) then 5.4 (loop ribbons,
  annotations, camera focus poses, intro, dual-register content) — 5.4 now
  wires UI onto this engine; on the live site the HTML layer may cover the
  canvas, so annotations become the primary click path there.
- Review screenshots (`coil-b-*.png`, `coil-blue-*.png`, `coil-baseline-*.png`,
  repo root) deletable after review.

## Key file paths

- `src/utils/coil-generator.ts` (+ test) · `src/stores/coil-focus.ts` (+ test)
- `src/scales/chromatin/{coil-geometry,coil-params,coil-materials,CoilMesh}.ts[x]`
- `src/scales/chromatin/shaders/coil-{bead,linker}.{vert,frag}.glsl`
- `src/dev/coil-dev-tools.tsx` · `src/dev/chromatin-preview.tsx`
- `docs/p5-plan-coil-scene.md` (addendum)
