# 2026-07-11 — Coil thread → DNA double-helix redesign

Reworked the chromatin coil's "thread" from a single smooth tube into a proper
DNA-style **double helix**: two thin backbone strands twisting around the
existing centerline (now the duplex *axis*), joined by sparse rung bars.
Addresses user feedback that the scene didn't read as biological — linkers were
too thick, wraps too thin, and nothing had helix shape.

## What was done

- **`coil-thread-path.ts`** — the centerline path is now the duplex axis. Added
  two pure, node-tested helpers:
  - `cumulativeArcLength` — continuous arc length along the merged path.
  - `computeTwistPhase` — the twist phase ψ, with the load-bearing **frame-rebase
    correction** (`psiOffset += atan2(S_end·U_entry, S_end·S_entry)` at each
    bridge→wrap junction) so the offset strands stay continuous under the unwind.
  - `ThreadPathOpts` swapped `threadRadius` → `strandRadius`, `helixRadius`,
    `twistPitch`, `linkerWidthScale`, `rungRadius`, `rungSpacing`; the three
    `rWrap` sites now use the compound envelope `W = helixRadius + strandRadius`.
- **`coil-geometry.ts`** — `buildThreadGeometry`/`writeThreadGeometry` now sweep
  two strands (`STRAND_RADIAL=6`) + sparse rungs (`RUNG_RADIAL=4`) into one merged
  geometry. Linker taper (bridge radii scale to `linkerWidthScale` mid-span, 1 at
  junctions). `aShade` moved to the per-tick write path, keyed to ψ. Rung count
  fixed at build from compact-path arc length (stored in `geo.userData`), so
  buffers stay open-state invariant. New scratch `_arc`/`_psi`.
- **`coil-params.ts`** / **`coil-dev-tools.tsx`** — new duplex params + 6 dev
  sliders (ranges all include defaults). Retuned `wrapTurns 2.6→1.75`,
  `threadAo 0.6→0.45`.
- **`CoilMesh.tsx`** — `threadOptsFor` passes the new fields with a soft guard
  `helixRadius = max(helixRadius, strandRadius*1.3)`.
- **Shaders** — added `aStrand`→`vStrand`, phase-shifting the frag core-pulse by
  `vStrand·π` so the two strands' light packets travel out of phase.
- **Tests / verify** — added `cumulativeArcLength`/`computeTwistPhase` coverage,
  incl. a junction-continuity gate on derived strand centers and an openT probe.
  Updated both `scripts/verify` opts + a derived-strand continuity probe.

## Decisions made

- **Biological visual, neutral code vocabulary** (user-confirmed): geometry is a
  real double helix; identifiers stay `strand/helix/twist/duplex/rung` (never
  DNA/nucleosome), preserving the repo's strict vocabulary convention.
- **Sparse rungs** (user-confirmed) over backbones-only or a full ladder.
- **Frame-rebase sign is `+=`, not the plan's `-=`.** Proven by a sign-flip
  experiment: `+=` → 0.001 junction residual; `-=` → 0.0505 (a visible kink at
  all 54 junctions). The `+=` derivation is documented in `computeTwistPhase`.
- Linker taper reuses the existing bridge end-taper (`capK`) as a radius scale —
  1 at both junctions guarantees a seamless hand-off to the flanking wraps.

## Verify status

- `npm run typecheck`, `npm run lint` — clean.
- `npx vitest run` — 212/212 pass (13 in `coil-thread-path.test.ts`).
- **Not yet run (hand to user):** `npx vite-node scripts/verify/unwind-tick-cost.ts`
  (cost gate < 2ms after ~1.6× vert count) and visual preview at
  `http://localhost:5173/chromatin-preview.html` (spin, region open, seed sweep).

## Follow-up tweaks (same session, post-preview feedback)

- Sparkles: `sparkleCount 150→200`, `sparkleOpacity 0.45→0.70` (coil-water-params).
- `rungSpacing 1.0→0.6` (more frequent base-pair bars).
- **Linker traceability**: new static `aLinker` attribute (0=wrap, 1=bridge) →
  `vLinker`; the frag darkens + slightly cools the linker segments so the eye
  can trace wrap→linker→wrap along the fiber (addresses "reads as discs-with-
  wires" feedback). Left drum-spacing/jitter alone (whole-composition change —
  `jitter` is the lever if wanted).
- **Thin-wire / orderly-wrap pass** (third AI: "wrapping too chaotic / wire too
  thick, reads as caging not wrapping"): `strandRadius 0.04→0.03`,
  `helixRadius 0.075→0.06` (envelope Ø 0.23→~0.18, ≈18% of disc — the real
  DNA↔octamer ratio; thinner turns leave gaps instead of a solid mass),
  `twistPitch 2.0→2.4` (gentler twist, fewer crossings), `wrapTurns 1.75→1.65`
  (exact nucleosomal turn count; frac 0.65 also routes linkers cleaner). Unwind
  cost gate measured 0.494 ms (< 2 ms). Not yet done: the deeper "DNA enters/
  exits the same side of the disc" ask (would touch wrapEntryAzimuth + bridge
  docking) — deferred unless still needed after this pass.

## Open items

- Visual bless of defaults in the isolated preview (`strandRadius`, `helixRadius`,
  `twistPitch`, `linkerWidthScale`, `rungSpacing`, retuned `wrapTurns`/`threadAo`).
- Re-run the unwind-tick-cost gate to confirm perf.

## Key files

- `src/scales/chromatin/coil-thread-path.ts`
- `src/scales/chromatin/coil-geometry.ts`
- `src/scales/chromatin/coil-params.ts`
- `src/scales/chromatin/CoilMesh.tsx`
- `src/dev/coil-dev-tools.tsx`
- `src/scales/chromatin/shaders/coil-thread.{vert,frag}.glsl`
- `src/scales/chromatin/coil-thread-path.test.ts`
- `scripts/verify/{thread-path-continuity,unwind-tick-cost}.ts`
