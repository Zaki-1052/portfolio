# 2026-07-14 — MPro dimer PDB export (Phase 6 prerequisite)

## What was done

- Exported the MPro biological dimer from the Maestro-prepared monomer
  (`mpro-analysis/vmd/mpro_ens_prepared.pdb`, chain B, 306 residues + 7YY ligand)
- The Maestro PDB had CRYST1 (P 21 21 21) but no BIOMT records, so PyMOL's
  `Generate Biological Assembly` was not available
- Fetched PDB 6Y2E biological assembly (`fetch 6Y2E, type=pdb1`) which loaded
  as two MODEL states (both chain A) — the correct C2 dimer
- Split the 6Y2E states, superposed `ens_mono` onto state 1 (chain A), created
  a copy superposed onto state 2 (chain B)
- Relabeled chains to A and B, saved as a single two-chain PDB
- Verified: reloaded file, `get_chains` reports `['A', 'B']`, 4772 atoms per
  chain, heart shape confirmed visually

## Decisions made

- Used PDB 6Y2E as the reference for the dimer symmetry operation (identified
  from `utils/alignment.py` which uses `SARS-CoV-2_6Y2E/1-306` as the
  reference sequence)
- Both chains include the 7YY ligand (54 HETATM atoms each) — the pipeline
  will select what it needs
- All-atom structure preserved (including hydrogens from Maestro prep)

## Open items

- PLAN prerequisite checkbox marked done
- Session 1 (pipeline script) is the next step — no blockers remain

## Key file paths

- **Output:** `mpro-analysis/vmd/mpro_dimer.pdb` (chains A+B, ~9.5K atoms total)
- **Updated:** `docs/PLAN-protein-scale.md` (prerequisite checkbox)
