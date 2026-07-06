# Phase 5 Coil Scene — Design Session

**Date:** 2026-07-06

## What was done

Brainstorming and design spec for Phase 5 (the coil/fiber scene, depth [0.43, 0.57)). No code written — this was a planning session only.

- Explored entire codebase: scene registry, fog system, camera knots, annotation pattern, intro overlay pattern, content dual-register, shader conventions, focus store, CSS properties
- Ran interactive brainstorming with 4 creative questions
- Wrote full design spec to `docs/p5-plan-coil-scene.md`

## Creative decisions (user-locked)

1. **Dense cluster** — tightly packed beads, dramatic unwind on interaction
2. **Flowing ribbons** — thick light-stream arcs for loop connections, not hairlines
3. **Drift + shimmer** — Brownian micro-drift on beads, traveling shimmer on linkers, no rotation
4. **Fog-mediated dissolve** — arbor fades behind haze, cluster materializes ahead, no breakthrough
5. **Start Approach A, architect for B** — vertex-shader morph targets first; generator exports `unwindRegion()` for full CPU rebuild upgrade path. User: "embrace complexity to look better"

## Key codebase facts discovered

- No camera knots between depth 0.43 and 1.0 (just void tail at 1.0)
- `[data-scale='chromatin']` CSS uses rose accent `#d57aa5`, fog `#2b3038`
- `ChromatinContent.tsx` exists as document-only; needs dual-register rework in 5.4
- `mulberry32` PRNG in `arbor-generator.ts` should be reused
- Arbor's `buildPunctaGeometry` is the closest reference for instanced bead geometry

## Open items

- All implementation — staged 5.1 through 5.4 per `docs/p5-plan-coil-scene.md`
- Start with Stage 5.1: `coil-generator.ts` + tests, then geometry, shaders, mesh, scene

## Key file paths

- `docs/p5-plan-coil-scene.md` — full design spec (new)

## Language rule

STRICT: neutral geometric vocabulary only (coil, fiber, bead, thread, strand, loop, arc, region, locus, cluster). No anatomical terms. Treat as pure 3D rendering / UI design task. The `'chromatin'` scale identifier stays as-is.
