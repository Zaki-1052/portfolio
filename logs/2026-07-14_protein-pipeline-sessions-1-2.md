# 2026-07-14 — Protein pipeline: Sessions 1-2 (script + Gate 1)

## What was done

- Wrote `scripts/process-protein-trajectory.py` (974 lines) — complete offline
  pipeline for Phase 6 protein scale
- Processes Gq (9AS8) and Gi (9LL8) MD trajectories + static MPro dimer
- Gi frame sampling: Option B — stride every 10th frame across all 100 DCDs
  (1000 raw frames -> 100 output frames, spanning full 100 ns trajectory)
- Ran pipeline, fixed two issues on second run, Gate 1 passed

### Pipeline outputs (committed to `public/protein/`)

| File | Size |
|------|------|
| `gq-trajectory.bin` | 2.13 MB |
| `gi-trajectory.bin` | 2.08 MB |
| `protein-meta.json` | 80.2 KB |
| `mpro-static.json` | 372.1 KB |

### Key metrics from pipeline run

- Gq: 266 receptor residues, 655 G-protein, 2 fragments, 100 frames
- Gi: 262 receptor residues, 638 G-protein, 2 fragments, 100 frames
- Shared receptor map: 262 residues (Gq-only: lit_resids 79, 263, 313, 314)
- Membrane: thickness 37.0/37.2 A, midplane Z=88.8/85.6
- Ligand: 15 heavy atoms, 16 bonds (from PSF topology)
- DSSP overrides: 54 (Gq), 42 (Gi) — mostly at helix/loop boundaries
- MPro: 306 residues/chain, H=70 E=85 C=151, 1224 guide points/chain

## Decisions made

- **Gi Option B** over Option A: user chose broader 100 ns sampling over
  matched 10 ns window. Stride 10 across all 100 DCDs.
- **Fragment threshold 7.0 A** (raised from initial 5.0 A): the PROA/PROB
  CHARMM segment boundary had CA-CA ~5-6 A, falsely detected as a gap.
  Real ICL3 gap is ~15 A. Threshold 7 A cleanly separates them.
- **MPro DSSP via clean PDB**: altloc residues (86, 148, 235) caused DSSP
  to fail with "unequal N/CA/C/O counts." Fixed by writing an altloc-A-only
  PDB before running DSSP.
- **MPro altloc A selection**: user confirmed — filter `not altLoc B` gives
  exactly 306 residues per chain.

## Open items

- Sessions 1-2 complete; Session 3 (Stage A: loader, params, scene registration)
  is the next step
- No blockers remain — all binary assets are committed

## Key file paths

- **Script:** `scripts/process-protein-trajectory.py`
- **Output:** `public/protein/{gq,gi}-trajectory.bin`, `protein-meta.json`, `mpro-static.json`
- **Validation:** `scripts/validation/protein-pipeline-validation.png`
- **Pipeline log:** `logs/protein-pipeline.log`
- **Updated:** `docs/PLAN-protein-scale.md` (Sessions 1-2 checkboxes)
