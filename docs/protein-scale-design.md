# Phase 6: Protein Scale — Design Specification

> Authoritative design document for the protein-scale band of the Scale Descent portfolio.
> Written 2026-07-11. Supersedes Phase 6 in PLAN-portfolio.md where the two diverge.
> Stands alone — a future session needs only this document plus the codebase.

---

## 1. What this is and why it matters

The protein scale is the fifth 3D band in the portfolio's scroll-driven descent. The visitor has passed through the brain crown (tissue), the arbor (cellular), and the chromatin coil. Now they reach a real molecular structure — the 5-HT2A serotonin receptor bound to psilocin, embedded in a membrane, coupled to a G-protein — rendered from actual PDB coordinates and animated by actual MD simulation data.

This is the first band in the portfolio built from **real experimental/computational data** rather than procedural generation. The structure is PDB 9AS8 (Gq-coupled) and 9LL8 (Gi-coupled), from Zara's own work in the Amaro Lab at UCSD. The trajectory is a 10 ns OpenMM MD simulation. Two Tier-1 portfolio projects anchor to the scene: the 5-HT2A MD study itself, and an MPro allosteric pathway analysis (rendered as a separate static structure — the iconic heart-shaped MPro dimer).

**The architectural thesis:** the existing codebase has a proven pattern — pure generator → geometry builders → ShaderMaterial → Mesh component. The protein scale follows this exactly, with one inversion: the "generator" is an **offline Python pipeline** that processes real molecular data and emits a compact binary, rather than a seeded PRNG that computes at runtime. Everything downstream (sweep geometry, materials, frame interpolation, annotations, transitions) reuses the established idiom.

---

## 2. Data inventory

All paths below are relative to the user's machine. This section is the authoritative reference for what exists, where, and what it contains.

### 2.1 The 9AS8 system (Gq-coupled 5-HT2A)

**Location:** `/Users/zakiralibhai/Documents/VS_Code/amarolab`

#### Structure

| File | Contents |
|------|----------|
| `setup/9AS8_complex.pdb` | The hero structure. 14,482 atoms. OpenMM-generated (REMARK 1). |
| `setup/9AS8.pdb` | Original PDB deposit (includes scFv16 chain E, removed from complex). |
| `setup/psilocin.pdb` | Psilocin ligand (RCSB ID 91Q), neutral form. |
| `setup/psilocin_cgenff.pdb` | CGenFF-parametrized psilocin for CHARMM. |

#### Chain map of `9AS8_complex.pdb`

| Chain | Residues | Local resnum | Identity | Notes |
|-------|----------|-------------|----------|-------|
| A | 266 | 1–266 | **5-HT2A receptor** (7TM GPCR) | UniProt P28223. Lit resid offset −78 (local 1 = lit 79). |
| B | 246 | 1–246 | **Mini-Gαq chimera** | Engineered truncated construct, not native ~350-aa Gαq. |
| C | 338 | 1–338 | **Gβ1** (GNB1) | UniProt P62873. |
| D | 71 | 1–71 | **Gγ2** (GNG2) | UniProt P59768. |
| L | 1 res, 32 atoms | resname LIG | **Psilocin, protonated (+1)** | Dimethylamine protonation, pKa ~8.5–9. C₁₂H₁₇N₂O⁺. |

#### Backbone gap

Chain A has **one internal backbone break**: between local residues 185 and 186 (lit residues 263 and 313). This is the ICL3 deletion — 49 disordered residues that were not modeled. The Cα–Cα distance across the break is **15.22 Å** (normal peptide bond: ~3.8 Å). All other gaps in all chains were rebuilt by PDBFixer and are continuous.

**Consequence for rendering:** Chain A must be rendered as **two ribbon fragments** (residues 1–185 and 186–266). The spline must not cross the gap. Chains B, C, D are each one continuous fragment.

#### CHARMM segid mapping

The DCD trajectories use CHARMM segment IDs, not PDB chain letters:

| Subunit | Segids | Residue count |
|---------|--------|---------------|
| Receptor (chain A) | PROA + PROB + PROC | 109 + 76 + 81 = 266 |
| Gαq (chain B) | PROD + PROE + PROF | 29 + 82 + 135 = 246 |
| Gβ1 (chain C) | PROG + PROH | 289 + 49 = 338 |
| Gγ2 (chain D) | PROI + PROJ | 36 + 35 = 71 |
| Psilocin | HETA | resname LIG |
| Membrane lipids | MEMB + GLPA | — |
| Water | TIP3 | — |
| Ions | IONS | — |

#### Trajectories

| File pattern | System | Frames/file | Total frames | Atoms/frame | Timestep |
|-------------|--------|-------------|-------------|-------------|----------|
| `openmm/step7_1.dcd` … `step7_10.dcd` | Gq | 10 | **100** | **280,277** (full solvated system) | 0.1 ns |
| `openmm/step6.{1,2,3}_equilibration.dcd` | Gq equil | 25 each | 75 | 280,277 | varies |

- Production: `dt = 0.004 ps`, `nstdcd = 25000` → 100 ps = 0.1 ns between saved frames.
- **10 files × 10 frames = 100 frames = 10 ns total.**
- DCDs contain the **full 280k-atom solvated system** (water + ions + membrane + protein). Protein-only extraction required.
- Topology: `openmm/step5_input.psf` (CHARMM format, NATOM = 280,277). Paired with `openmm/step5_input.pdb` for initial coordinates.
- **No stripped/protein-only trajectory exists.** All extraction happens in the pipeline.

#### Already-computed analysis products (reusable)

| File | Contents | Use in renderer |
|------|----------|-----------------|
| `analysis/phase3_rmsf/rmsf_data.csv` | Per-residue RMSF. Cols: `resid, lit_resid, resname, segid, region, rmsf`. 266 rows. | Per-residue flexibility → ribbon width/color modulation. |
| `analysis/phase3_rmsf/receptor_rmsf_bfactor.pdb` | RMSF baked into B-factor column. | Validation reference. |
| `analysis/phase8_hbonds/hbond_occupancy.csv` | 18 binding-pocket residues with H-bond stats to psilocin. | Identify highlight residues near ligand. |
| `analysis/phase9_aromatics/aromatic_summary.csv` | Aromatic cage residues: W336, F339, F340, F234, F243, Y370 (lit resids). | Accent coloring in binding pocket. |
| `analysis/phase2_rmsd/rmsd_data.csv` | Time series: receptor RMSD, G-protein RMSD. 100 frames. | Validation / possible HUD element. |
| `analysis/phase4_psilocin/psilocin_data.csv` | Ligand stability per frame: salt-bridge distance, ligand RMSD. | Validation. |

**Not available:** No DSSP assignment. No frame clustering (unnecessary — 100 frames is already manageable). No representative-frame selection beyond `phase7_summary` snapshots.

### 2.2 The 9LL8 system (Gi-coupled 5-HT2A)

**Location:** `/Users/zakiralibhai/Documents/VS_Code/amarolab/new-Gi`

#### Structure

| File | Contents |
|------|----------|
| `9LL8_complex.pdb` | 14,174 atoms. Same receptor, different G-protein. |
| `9LL8.pdb` | Original PDB deposit. |

#### Chain map of `9LL8_complex.pdb`

| Chain | Residues | Identity | Notes |
|-------|----------|----------|-------|
| A | 340 | **Gαi1** | Full-length (not mini-G), UniProt P63096. |
| B | 71 | **Gγ2** (GNG2) | Same protein as 9AS8 chain D. |
| C | 227 | **Gβ1** (truncated construct) | Fewer residues than 9AS8's 338 — different construct boundaries. |
| D | 262 | **5-HT2A receptor** | Same protein, 4 fewer residues than Gq (different terminal truncation). |
| L | 1 res, 32 atoms | **Psilocin** | Same ligand. |

#### Trajectories

| File pattern | Frames/file | Total frames | Atoms/frame |
|-------------|-------------|-------------|-------------|
| `charmm-gui-8313215931/openmm/step7_1.dcd` … `step7_10.dcd` | 10 | **100** | **270,555** |

Same 0.1 ns spacing, 10 ns total. Topology: `charmm-gui-8313215931/openmm/step5_input.psf`.

#### Gi RMSF

`new-Gi/analysis/phase3_rmsf/rmsf_data.csv` — 262 rows, same schema. Cols: `resid, lit_resid, resname, segid, region, rmsf`. Segids: PROE + PROF (183 + 79 = 262 receptor residues). Lit resids: 80–393.

#### The Gq-vs-Gi scientific finding

Both systems simulate psilocin-bound 5-HT2A in an identical 16-species brain-PM membrane (Ingólfsson composition), differing only in the coupled G-protein.

- **Ligand binding is G-protein-independent:** the D155 salt bridge to psilocin is intact 100/100 frames in both systems (~2.86 Å). The extracellular ligand pose doesn't care which G-protein is coupled.
- **The intracellular face does care:** Gi coupling loosens ICL3c, H8, ICL1, ECL1 (higher RMSF) while stiffening ICL2. The Gq heterotrimer drifts more from its start (5.30 vs 2.96 Å max RMSD) and never plateaus within 10 ns.
- **This is the interaction:** toggling Gq↔Gi and watching the receptor's intracellular face breathe differently IS the scientific result, rendered as a direct visual experience.

### 2.3 The receptor Gq/Gi correspondence

Both systems contain the **same receptor protein** (5-HT2A, P28223) with slightly different construct boundaries:

| System | Receptor residues | Lit resid range | RMSF segids |
|--------|-----------------|-----------------|-------------|
| Gq (9AS8) | 266 | 79–393 | PROA + PROB + PROC |
| Gi (9LL8) | 262 | 80–393 | PROE + PROF |

The **shared receptor subset** is determined by matching on `lit_resid` from the two RMSF CSVs. Gq has one extra N-terminal residue (lit 79) plus ~3 more elsewhere (likely terminal or near the ICL3 gap boundary). The pipeline identifies the shared set automatically; unmatched residues at the termini fade to zero opacity during toggle morphs.

### 2.4 MPro (static companion)

**Location:** `/Users/zakiralibhai/Documents/GitHub/mpro-analysis`

#### Structure

Only one coordinate file on disk: `vmd/mpro_ens_prepared.pdb` — **306 residues, chain B only, monomer.** Written by Maestro. One HETATM ligand: `7YY` (54 atoms, nirmatrelvir-like compound).

**The biological dimer** (the heart shape) must be generated. The user will export it from PyMOL as a dimer PDB. This is a prerequisite (see §13).

#### Domain map (from `utils/selections.py`)

| Domain | Residues | Color in ChimeraX |
|--------|----------|--------------------|
| N-term | 1–16 | Blue |
| Domain I | 17–109 | Chartreuse |
| Domain II | 110–175 | Orange |
| IDL | 176–200 | Orange-red |
| Domain III | 201–289 | Purple |
| C-term | 290–306 | Blue |
| Catalytic dyad | C145, H41 | Goldenrod accent |

#### Key residues

- **Catalytic dyad:** C145 (nucleophilic cysteine), H41 (general base). The active site cleft sits at the interface between the two monomers — the notch of the heart.
- **CNA allosteric hubs** (from prose-recorded analysis): residues 420, 348, 482, 217, 350 (apo state); 205, 165, 575, 420, 132 (nirmatrelvir-bound). Residue 420 is a cross-state hub. (These are dimer-numbering; monomer-B offset +306 for chain-B residues.)
- **Active-site loops:** 20–26, 40–55, 135–145, 164–174, 185–195 (from VMD scripts).

#### What is NOT on disk

No trajectory, no WISP allosteric-path output, no clustering, no RMSF arrays. All analysis inputs point to remote GPFS. The single static PDB + domain definitions + the user's PyMOL-exported dimer are the full input.

### 2.5 User's established visual language

From VMD render scripts and actual renders in the repo:

- **Protein:** NewCartoon representation. Cyan/teal (ColorID 10, matches portfolio's `#56b6c2`). Material AOChalky.
- **G-protein:** NewCartoon, orange (ColorID 3). Dimmer than receptor.
- **Psilocin:** Licorice, yellow (ColorID 4). Always its own rep, never folded into the cartoon.
- **Membrane:** QuickSurf translucent slab. Material Transparent, opacity 0.15. Gray (ColorID 2). The signature "cloudy bilayer" look.
- **Lighting:** White background, shadows on, ambient occlusion (aoambient 0.90, aodirect 0.40), linear depth cueing.
- **Render resolution:** 2400×1920 via TachyonInternal.

Reference renders to compare against: `charmm-gui/Figure_5HT2A_psilocin_membrane_full.png`, `demo/translucent.png`, `demo/protein.png`.

---

## 3. Architecture overview

Three layers. The boundary between them is a file format (§5).

```
┌─────────────────────────────────────────────────┐
│  Layer 1: Offline Python Pipeline               │
│  (biochemcore conda env, MDAnalysis 2.10)       │
│  Runs on Zara's machine. Produces binary files. │
│  This is the "generator."                       │
├──────────────────────┬──────────────────────────┤
│                      │                          │
│  gq-trajectory.bin   │  protein-meta.json       │
│  gi-trajectory.bin   │  mpro-static.json        │
│  (public/protein/)   │  (public/protein/)       │
│                      │                          │
├──────────────────────┴──────────────────────────┤
│  Layer 2: TS Loader + Renderer                  │
│  (src/scales/protein/, src/utils/)              │
│  Fetches binaries, sweeps ribbon geometry,      │
│  drives scroll-animation + Gq/Gi toggle.        │
├─────────────────────────────────────────────────┤
│  Layer 3: Scene Composition                     │
│  ProteinScene, ProteinMesh, ProteinAnnotations, │
│  ProteinIntro, membrane disc, MPro static mesh, │
│  atmosphere, transition envelopes.              │
│  All follow established chromatin/arbor patterns.│
└─────────────────────────────────────────────────┘
```

### 3.1 Design principles

**Fat pipeline, thin renderer.** Every piece of molecular biology — secondary structure assignment, carbonyl-flip correction, ribbon-guide smoothing, frame alignment, chain mapping — happens offline in Python, where MDAnalysis and mature tools exist. The TypeScript side does geometry sweeps and frame interpolation. It does not parse PDB files, run DSSP, or compute ribbon normals. It is not a molecular viewer.

**Validate before rendering.** After the pipeline runs, Zara overlays the output on VMD renders and confirms it matches. No TypeScript is written until the guide geometry is validated. This is the primary risk-mitigation step.

**Follow the coil's idiom exactly.** The protein loader returns a data structure shaped like `generateCoil()`'s output. The geometry builder sweeps a cross-section along guide points, exactly as `coil-geometry.ts` sweeps the thread. The Mesh component owns a guarded per-frame geometry rebuild driven by scroll position, exactly as `CoilMesh` owns the unwind engine. The ShaderMaterial carries per-residue attributes (chain, SS, RMSF, focus-region) in instance/vertex buffers, exactly as the coil bead material carries `aRegion`. The annotations project world-space anchors to screen coordinates on a gsap ticker, exactly as `CoilAnnotations` does.

---

## 4. Offline pipeline specification

### 4.1 Environment

- **Conda env:** `biochemcore` (Python 3.11, MDAnalysis 2.10.0)
- **DSSP:** MDAnalysis 2.10's pure-Python DSSP implementation (`MDAnalysis.analysis.dssp.DSSP`). No external `mkdssp` binary required.
- **Script location:** `scripts/process-protein-trajectory.py` (new file, ~300–400 lines)
- **Invocation:** Zara runs this manually. It is never called by Vite or any build step.

### 4.2 Processing steps

For each system (Gq and Gi):

1. **Load topology + trajectory.** `MDAnalysis.Universe(psf, [dcd1, dcd2, ..., dcd10])`. This gives 100 frames of the full solvated system.

2. **Select atoms.**
   - Backbone: `protein and (name CA or name C or name O)` — Cα for positions, C and O for carbonyl direction (ribbon normal).
   - Ligand: `resname LIG and not name H*` — heavy atoms only (~15 atoms for psilocin).
   - Membrane phosphates: `name P and resname POPC POPE POPS ...` — for bilayer midplane/thickness measurement.

3. **Align every frame** to the reference (frame 0, receptor Cα only). Use `MDAnalysis.analysis.align.AlignTraj` with `select='segid PROA PROB PROC and name CA'` (Gq) or equivalent Gi segids. This removes rigid-body drift/rotation from the trajectory, centering the receptor.

4. **Run DSSP on frame 0 only.** The `DSSP` class in MDAnalysis 2.10 assigns H/E/C per residue. Run on the full protein (all chains), freeze the result as a per-residue string. This assignment is used for all 100 frames.

5. **Validate DSSP against known topology.** Cross-check the receptor's SS assignment against the `region` column in `rmsf_data.csv`:
   - TM1–TM7 → should be `H` (helix)
   - ICL1–3, ECL1–3 → should be `C` (coil)
   - H8 → should be `H`
   - Gβ1 WD40 blades → should contain `E` (sheet) runs
   
   If MDAnalysis DSSP disagrees for a known TM helix, override from the region labels. Log all overrides.

6. **Compute reference ribbon normals on frame 0.** Per residue:
   - **Ribbon normal:** Derived from the Cα→O vector (the carbonyl direction perpendicular to the backbone). Smoothed with a 3-residue running average. **Carbonyl-flip correction:** walk the residue list; wherever `dot(normal[i], normal[i-1]) < 0`, flip `normal[i]`. This prevents the 180° ribbon twist artifact at helix-sheet boundaries.
   - These reference normals are shipped in the metadata (one vec3 per residue). The TS renderer reprojects them per frame (see §5.2).
   
   The pipeline ships **Cα + carbonyl-O positions per residue per frame** (not pre-computed guide points). The Catmull-Rom sub-sampling, tangent computation, and per-frame normal derivation happen in TypeScript — these are deterministic math operations, not molecular biology. The reference normals from this step serve as the flip-correction baseline: the TS side computes a frame's Cα→O normal, then flips any that disagree with the reference. This guarantees flip consistency without re-running the full flip-correction walk every frame. See §5.2 for the binary format and §5.3 for the fallback (shipping pre-computed guides if runtime sub-sampling proves problematic).

7. **Carbonyl-flip validation.** Render the frame-0 ribbon guide in matplotlib 3D, colored by SS type. Overlay Cα positions. Visually confirm: helices show a smooth flat ribbon (no 180° twists), sheets show an oriented flat ribbon (no flips mid-strand), coils show a thin tube. Compare against the VMD NewCartoon render of the same frame.

8. **Extract membrane geometry.** From the phosphate positions in frame 0:
   - `midplaneY`: mean Y (or Z, depending on alignment convention) of all phosphorus atoms.
   - `thickness`: distance between upper-leaflet and lower-leaflet phosphate means.
   - `radius`: max lateral extent of phosphates from the membrane center, × 1.2 for visual padding.

9. **Extract per-residue metadata.** From the RMSF CSV and the DSSP:
   - `litResids`: literature residue numbers (for Gq/Gi matching).
   - `rmsf`: per-residue RMSF values (receptor only — the G-protein RMSF is not pre-computed but could be added later).
   - `regions`: TM/loop labels from the RMSF CSV.
   - `bindingPocketResids`: lit resids of psilocin-contacting residues from `phase8_hbonds`.
   - `aromaticCageResids`: [234, 243, 336, 339, 340, 370] (lit resids from `phase9_aromatics`).

10. **Build the shared receptor map.** Load both systems' RMSF CSVs. Match on `lit_resid` to find the intersection. Record the index mappings: for each shared lit_resid, the index into the Gq receptor guide and the index into the Gi receptor guide. This enables vertex-by-vertex morphing during the toggle.

11. **Process ligand per frame.** Extract heavy-atom positions for psilocin (resname LIG). Also extract bond connectivity from the PDB CONECT records (for ball-and-stick rendering).

12. **Pack and write** the binary files (format in §5).

### 4.3 MPro processing

Separate, simpler path. Input: the user's PyMOL-exported dimer PDB.

1. Load the dimer PDB. Identify the two chains (A and B, or however PyMOL exports them).
2. Run DSSP on the dimer.
3. Compute **one** static ribbon guide (same algorithm as above, but only frame 0 — no trajectory).
4. Attach domain labels from `utils/selections.py` domain ranges.
5. Mark the catalytic dyad residues (C145, H41 per chain) and allosteric hub residues.
6. Write `mpro-static.json` (no binary needed — single frame, small enough for JSON).

---

## 5. Binary format specification

### 5.1 `protein-meta.json`

```jsonc
{
  "format": "protein-scale-v1",

  "systems": {
    "gq": {
      "file": "gq-trajectory.bin",
      "frameCount": 100,
      "timestepNs": 0.1,
      "totalTimeNs": 10.0
    },
    "gi": {
      "file": "gi-trajectory.bin",
      "frameCount": 100,
      "timestepNs": 0.1,
      "totalTimeNs": 10.0
    }
  },

  "receptor": {
    // Two systems share the same receptor protein but different
    // construct boundaries. Each system's receptor data is described
    // separately; the sharedMap enables morphing between them.
    "gq": {
      "residueCount": 266,
      "guidePointsPerResidue": 4,
      "totalGuidePoints": 1064, // 266 × 4
      "fragments": [
        { "startResidue": 0, "endResidue": 184, "count": 185 },
        { "startResidue": 185, "endResidue": 265, "count": 81 }
      ],
      "ss": "HHHHHH...",           // 266 chars, one per residue: H/E/C
      "rmsf": [1.12, 0.98, ...],   // 266 floats
      "litResids": [79, 80, ...],  // 266 ints
      "regions": ["TM1", ...],     // 266 strings
      "bindingPocketLitResids": [155, 160, 234, 242, 243, 336, 339, 340, 343, 370],
      "aromaticCageLitResids": [234, 243, 336, 339, 340, 370],
      "referenceNormals": [0.1, 0.9, 0.2, ...]  // 266 × 3 floats: flip-corrected ribbon normals from frame 0
    },
    "gi": {
      "residueCount": 262,
      "guidePointsPerResidue": 4,
      "totalGuidePoints": 1048,
      "fragments": [
        // Will be determined by pipeline — may differ from Gq
        // due to different ICL3 boundary residues
      ],
      "ss": "HHHHHH...",
      "rmsf": [1.09, 0.98, ...],
      "litResids": [80, 81, ...],
      "regions": ["TM1", ...],
      "bindingPocketLitResids": [155, 160, 234, 242, 243, 336, 339, 340, 343, 370],
      "aromaticCageLitResids": [234, 243, 336, 339, 340, 370],
      "referenceNormals": [...]  // 262 × 3 floats
    },
    "sharedMap": {
      "count": 260, // approximate — pipeline computes exact
      "gqResidueIndices": [1, 2, 3, ...], // residue indices into gq receptor data
      "giResidueIndices": [0, 1, 2, ...]  // corresponding residue indices into gi receptor data
    }
  },

  "gprotein": {
    "gq": {
      "chains": [
        { "name": "Galpha-q", "residueCount": 246, "ss": "..." },
        { "name": "Gbeta1",   "residueCount": 338, "ss": "..." },
        { "name": "Ggamma2",  "residueCount": 71,  "ss": "..." }
      ],
      "totalResidues": 655
    },
    "gi": {
      "chains": [
        { "name": "Galpha-i1", "residueCount": 340, "ss": "..." },
        { "name": "Gbeta1",    "residueCount": 227, "ss": "..." },
        { "name": "Ggamma2",   "residueCount": 71,  "ss": "..." }
      ],
      "totalResidues": 638
    }
  },

  "ligand": {
    "heavyAtomCount": 15,
    "bonds": [[0,1], [1,2], ...]  // index pairs for ball-and-stick
  },

  // ⚠️ `midplaneY` HOLDS A Z VALUE. Verified 2026-07-15 against the shipped
  // assets: the pipeline resolved §4.2's "mean Y (or Z, depending on alignment
  // convention)" hedge in favour of Z — correctly, since the bilayer normal is
  // +Z — but kept this schema's field name. The receptor's own Z centroid
  // (89.52) sits on the value (88.78) while the G-protein hangs below it to
  // Z = −6.44, and `thickness` measures a real bilayer across the same axis.
  // Assigning it to a `.y` is always wrong; ProteinMesh stands the complex
  // upright with a −90° X rotation at the mount instead. The key stays as-is
  // because it is the shipped contract with the committed binaries. Real
  // values below, not the placeholders this schema was drafted with.
  "membrane": {
    "gq": { "midplaneY": 88.78, "thickness": 37.02, "radius": 101.24 },
    "gi": { "midplaneY": 85.58, "thickness": 37.20, "radius": 99.27 }
  }
}
```

### 5.2 Binary trajectory files (`gq-trajectory.bin`, `gi-trajectory.bin`)

Little-endian Float32 arrays. No header in the binary — all structural metadata lives in `protein-meta.json`. The binary is a flat sequence of frames. Ships **per-residue Cα + carbonyl-O positions** (not pre-computed ribbon guides). The TS loader computes Catmull-Rom splines, tangents, and ribbon normals at runtime from these positions — deterministic math, not molecular biology.

```
For each frame f in [0, frameCount):
  ┌─ Receptor residues ─────────────────────────────┐
  │ For each residue r in [0, receptor.residueCount):         │
  │   float32 ca_x, ca_y, ca_z   // Cα position (Å)          │
  │   float32 o_x,  o_y,  o_z    // carbonyl O position (Å)  │
  │ = receptor.residueCount × 6 × 4 bytes                     │
  ├─ G-protein residues ────────────────────────────┤
  │ Same layout, gprotein.totalResidues × 6 × 4 bytes         │
  ├─ Ligand positions ──────────────────────────────┤
  │ For each heavy atom [0, ligand.heavyAtomCount):            │
  │   float32 x, y, z            // position (Å)              │
  │ = ligand.heavyAtomCount × 3 × 4 bytes                     │
  └─────────────────────────────────────────────────┘
```

**Estimated sizes:**

| Component | Residues | Floats/res | Bytes/frame | 100 frames |
|-----------|---------|-----------|-------------|------------|
| Gq receptor | 266 | 6 | 6,384 | 638 KB |
| Gq G-protein | 655 | 6 | 15,720 | 1.57 MB |
| Gq ligand | 15 | 3 | 180 | 18 KB |
| **Gq total** | — | — | **22,284** | **~2.2 MB** |
| Gi receptor | 262 | 6 | 6,288 | 629 KB |
| Gi G-protein | 638 | 6 | 15,312 | 1.53 MB |
| Gi ligand | 15 | 3 | 180 | 18 KB |
| **Gi total** | — | — | **21,780** | **~2.2 MB** |

**Grand total: ~4.4 MB raw, ~2–2.5 MB over the wire with gzip.**

The flip-corrected reference normals (one vec3 per residue, computed on frame 0) are in `protein-meta.json`. At runtime, the TS loader derives each frame's ribbon normal from the Cα→O direction and flips any that disagree with the reference. This guarantees consistent orientation without re-running the full flip-correction walk every frame.

### 5.3 Alternative: ship pre-computed ribbon guides

If runtime normal derivation proves problematic (e.g., the reference-normal flip check doesn't track well across large conformational changes), fall back to shipping full pre-computed guides: 4 sub-sample points per residue, each with position + tangent + normal = 9 floats per guide point. This increases payload to ~12–13 MB per system (~25 MB total), viable with lazy loading and gzip (~10–13 MB transferred). The TS geometry builder then sweeps cross-sections directly with no spline computation.

### 5.4 `mpro-static.json`

```jsonc
{
  "format": "mpro-static-v1",
  "chains": [
    {
      "name": "A",
      "residueCount": 306,
      "guidePointsPerResidue": 4,
      "totalGuidePoints": 1224,
      "ss": "CCCCCC...", // 306 chars
      "domains": ["nterm", "nterm", ..., "domain1", ...], // 306 strings
      "guide": [
        // Flat array: 1224 × 9 floats (position, tangent, normal)
        // Inlined in JSON as a regular array — single frame, ~44 KB
      ]
    },
    {
      "name": "B",
      // ... same structure, second chain of the dimer
    }
  ],
  "catalyticDyad": {
    "A": { "C145": 145, "H41": 41 },
    "B": { "C145": 145, "H41": 41 }
  },
  "activeLoops": [[20,26], [40,55], [135,145], [164,174], [185,195]],
  "ligand": {
    "chain": "A",
    "resname": "7YY",
    "heavyAtomCount": 54,
    "positions": [/* x,y,z per heavy atom */],
    "bonds": [/* index pairs */]
  }
}
```

---

## 6. TS renderer specification

### 6.1 File layout

```
src/scales/protein/
  ProteinScene.tsx          # Scene root (≈ ChromatinScene.tsx)
  ProteinMesh.tsx           # Ribbon meshes + animation engine (≈ CoilMesh.tsx)
  MProMesh.tsx              # Static MPro dimer ribbon (simpler, no animation)
  ProteinAnnotations.tsx    # HTML overlay (≈ CoilAnnotations.tsx)
  ProteinIntro.tsx          # Resolve-from-haze overlay (≈ CoilIntro.tsx)
  ProteinContent.tsx        # Scale content wrapper (≈ ChromatinContent.tsx)
  protein-geometry.ts       # Guide → swept ribbon BufferGeometry (≈ coil-geometry.ts)
  protein-params.ts         # Visual parameters, defaults, look appliers
  protein-materials.ts      # ShaderMaterial subclasses
  protein-atmosphere.tsx    # Drift motes, fog particles (≈ coil-atmosphere.tsx)
  protein-fog.ts            # Band-specific fog curve (≈ coil-fog.ts)
  protein-anchors.ts        # Annotation anchor positions (≈ coil-anchors.ts)
  shaders/
    protein-ribbon.vert.glsl
    protein-ribbon.frag.glsl
    protein-membrane.vert.glsl
    protein-membrane.frag.glsl

src/utils/
  protein-loader.ts         # Fetch + decode binary → typed guide data
```

### 6.2 Geometry: the ribbon sweep (`protein-geometry.ts`)

This is the core new code. It takes per-residue Cα+O positions, computes a Catmull-Rom spline (4 sub-samples per residue), derives tangents and ribbon normals (using the reference normals from `protein-meta.json` for flip consistency), and sweeps an SS-dependent cross-section along the resulting guide to produce a BufferGeometry.

**Cross-section profiles:**

> ⚠️ **Superseded 2026-07-15 (Stage B.1).** The per-SS radial-segment counts
> below (8 / 4 / 6) cannot work: rings of differing vertex counts can't be
> strip-connected to each other, can't morph across an SS boundary, and would
> break the fixed topology the animation write depends on. Shipped instead:
> **one `RIBBON_RADIAL_SEGMENTS = 8` for every SS type**, with only the
> cross-section SHAPE varying, expressed as a superellipse `(a, b, n)` — half
> width, half height, squareness — so a morph is a lerp of three scalars.
> Helix `(0.6, 0.1, 2)`, sheet body `(0.3, 0.075, 4)` → peak `(0.9, 0.075, 4)`
> → tip `(0, 0, 4)`, coil `(0.15, 0.15, 2)`. Two further corrections: E-runs
> shorter than 3 residues render as coil (the ramp is undefined for them, and
> Gβ1 has 15 such runs), and a `PROFILE_FLOOR = 0.02` guards the analytic
> normal's `1/a`, `1/b` at the arrow tip — applied to the normal only, never to
> the position, whose zero width is the intended point. See `protein-params.ts`.

| SS type | Shape | Width | Height | Radial segments | Notes |
|---------|-------|-------|--------|-----------------|-------|
| H (helix) | Flat ellipse | 1.2 | 0.2 | 8 | Wide ribbon. The natural twist of the carbonyl-derived normal produces the helical ribbon winding. |
| E (sheet) | Flat rectangle → arrow taper | 0.6 → 1.8 → 0 | 0.15 | 4 (rectangular) | Width ramps from 0.6 at strand start to 1.8 at 2 residues before strand end, then tapers linearly to 0 at the final residue of the strand (the arrowhead). Strand boundaries = runs of consecutive `E` in the SS string. |
| C (coil) | Round tube | radius 0.15 | — | 6 | Thin round tube connecting helices/sheets. |

**SS transitions:** at the boundary between SS types (e.g., H→C), the cross-section morphs over 2 guide points (half a residue) from one profile to the other. This prevents hard edges at helix termini.

**Per guide point, the geometry builder:**
1. Constructs a local frame: tangent (forward), normal (ribbon "up"), binormal (tangent × normal).
2. Places the cross-section vertices in this frame.
3. Connects to the previous guide point's vertices with triangle strips.
4. Writes per-vertex attributes: `aResidueIndex` (int, for RMSF/chain lookup), `aSSType` (float, 0/1/2 for H/E/C), `aChainIndex` (float, for focus-dimming), `aShade` (float, 0–1 for ambient occlusion baked from the cross-section profile).

**Output:** One merged `BufferGeometry` per chain fragment. For the Gq system:
- Receptor fragment 1 (residues 0–184): 1 geometry
- Receptor fragment 2 (residues 185–265): 1 geometry
- Gαq: 1 geometry
- Gβ1: 1 geometry
- Gγ2: 1 geometry
- **Total: 5 geometries = 5 draw calls** for the protein body

All geometries use `DynamicDrawUsage` on their position/normal attributes because the trajectory animation rewrites them every scroll tick.

### 6.3 Animation engine (`ProteinMesh.tsx`)

Follows the `CoilMesh` unwind-engine pattern exactly.

**Scroll-driven frame interpolation:**
- `scaleProgress` (0–1 through the protein band) maps linearly to a float frame index: `frameIndex = scaleProgress * (frameCount - 1)`.
- The two bracketing frames (`floor(frameIndex)` and `ceil(frameIndex)`) are lerped: for each residue, `ca = lerp(caA, caB, frac)`, `o = lerp(oA, oB, frac)`. The lerped Cα+O positions are fed to the geometry builder's **write** function, which recomputes the Catmull-Rom spline, derives normals, and updates the BufferGeometry's vertex positions and normals in place. `geometry.attributes.position.needsUpdate = true`. Topology is fixed — same vertex count every frame.
- **Write guard:** if the frame index hasn't changed since the last write (same floor, same frac to 3 decimal places), skip. Same pattern as `CoilMesh.syncGeometry`.

**Ambient breathing (shader-driven):**
- A small sinusoidal vertex displacement in the normal direction, driven by `uTime` and modulated by per-residue RMSF. High-RMSF residues (loops) breathe more; low-RMSF (TM helices) breathe less.
- Amplitude: ~0.05 Å × RMSF_normalized. Frequency: ~0.3 Hz. This keeps the protein alive when the user pauses scrolling.
- Frozen to zero under reduced motion.

**Gq/Gi toggle:**
- A boolean state: `activeSystem: 'gq' | 'gi'`.
- On toggle, a GSAP tween drives a `toggleBlend` from 0 to 1 (or 1 to 0) over ~600ms.
- **Receptor:** The shared-receptor subset morphs vertex-by-vertex using the `sharedMap` indices. Unmatched terminal residues fade their opacity from 1→0 (outgoing system) and 0→1 (incoming system). The RMSF coloring transitions simultaneously.
- **G-protein:** Crossfade. The outgoing G-protein's opacity fades to 0 while the incoming fades from 0 to 1. No vertex morph (different proteins, different topology). Both sets of G-protein geometries exist in the scene; visibility is controlled by opacity.
- **Membrane:** Crossfade (midplane/thickness may differ slightly).
- **Ligand:** Morphs (same molecule, same atom count in both systems).

**Reduced motion:** Static at middle frame (frame 50). No interpolation, no breathing, no toggle animation (toggle snaps instantly).

### 6.4 Materials (`protein-materials.ts`)

Custom `ShaderMaterial` subclasses following the coil/arbor pattern. Uniforms written imperatively in `useFrame`, no React re-renders.

**ProteinRibbonMaterial:**
- `uTime: float` — elapsed time for ambient breathing
- `uDepth: float` — global scroll depth (for reveal envelope)
- `uFogColor: vec3`, `uFogDensity: float` — scene fog
- `uOpacity: float` — reveal/transition envelope
- `uCyanKey: vec3` — key light color (#56b6c2)
- `uFocusRegion: int` — which annotation region is focused (-1 = none)
- `uFocusDim: float` — focus dim intensity (0–1)
- `uActiveSystem: float` — 0 = Gq, 1 = Gi (for RMSF-driven coloring transition)
- `uToggleBlend: float` — Gq/Gi crossfade progress

**Vertex attributes** (per-vertex, set by geometry builder):
- `aResidueIndex: float` — residue index within the chain (for RMSF lookup)
- `aSSType: float` — 0/1/2 for H/E/C (for subtle per-SS shading variation)
- `aChainIndex: float` — chain identity (receptor vs G-protein sub-chains)
- `aShade: float` — baked AO from cross-section (bright on the outside, darker on inner faces)

**Data textures** (set once, not per frame):
- RMSF array as a DataTexture — the shader samples it by `aResidueIndex` to modulate ribbon color warmth/brightness and breathing amplitude.
- Binding-pocket mask as a DataTexture — the shader brightens pocket residues when the 5ht2a annotation is focused.

**ProteinMembraneMaterial:**
- Standard translucent grey material with vertex-displacement noise for the ripple.
- `uTime`, `uOpacity`, `uFogColor`, `uFogDensity`.
- Alpha ~0.12–0.18, matching the VMD `Transparent` material at opacity 0.15.

### 6.5 Loader (`protein-loader.ts`)

```typescript
interface ProteinTrajectory {
  // Per-frame guide data (decoded from binary)
  frames: Float32Array;     // flat: frame × residue × 6 floats (Cα xyz, O xyz)
  frameCount: number;

  // Metadata (from JSON)
  receptor: ReceptorMeta;
  gprotein: GProteinMeta;
  ligand: LigandMeta;
  membrane: MembraneMeta;
}

interface ProteinData {
  gq: ProteinTrajectory;
  gi: ProteinTrajectory;
  sharedMap: SharedReceptorMap;
  mpro: MProStatic;
}
```

The loader is called when depth approaches the protein band (preload zone). It fetches `protein-meta.json`, then `gq-trajectory.bin` and `gi-trajectory.bin` in parallel. Decodes the binary into typed Float32Arrays. Returns a `ProteinData` object consumed by `ProteinMesh`.

---

## 7. Scene composition

### 7.1 Spatial layout

The 9AS8 complex is the **centerpiece**, positioned at the scene origin. The receptor's 7TM bundle is oriented roughly vertically (the membrane plane is horizontal), matching the VMD renders.

The MPro dimer sits **offset** from the main complex — positioned to be visible in the peripheral field but not competing with the receptor. Suggested: to the lower-right of the receptor, at ~60% scale, slightly further from the camera. The exact position is tuned during implementation (a `MPRO_ORIGIN` constant, like `COIL_ORIGIN`).

The membrane disc is centered on the receptor's transmembrane region, oriented horizontally.

### 7.2 Draw call budget

| Element | Draw calls | Notes |
|---------|-----------|-------|
| Receptor fragment 1 | 1 | Residues 0–184 |
| Receptor fragment 2 | 1 | Residues 185–265 |
| Gα (active system) | 1 | Gαq or Gαi1 |
| Gβ1 (active system) | 1 | |
| Gγ2 (active system) | 1 | |
| Gα (inactive, fading) | 0–1 | Only during toggle transition |
| Gβ1 (inactive, fading) | 0–1 | Only during toggle transition |
| Gγ2 (inactive, fading) | 0–1 | Only during toggle transition |
| Psilocin (ligand) | 1 | Small ball-and-stick or glow sphere |
| Membrane disc | 1 | Translucent, alpha blended |
| MPro dimer | 2 | One per chain (static) |
| Atmosphere (motes) | 1–2 | Instanced points |
| **Steady state** | **~11** | Under the 12-call target |
| **During toggle** | **~14** | Briefly over budget; acceptable for a transient |

### 7.3 Component tree

```tsx
<ProteinScene>
  {/* 3D layer (inside R3F Canvas) */}
  <ProteinMesh />          {/* receptor + G-protein + ligand ribbons */}
  <ProteinMembrane />      {/* translucent disc */}
  <MProMesh />             {/* static MPro dimer */}
  <ProteinAtmosphere />    {/* cyan drift motes */}

  {/* HTML overlay layer (outside Canvas, positioned absolutely) */}
  <ProteinAnnotations />   {/* two annotation cards */}
  <ProteinIntro />         {/* resolve-from-haze text overlay */}
  <ProteinToggle />        {/* Gq/Gi system selector */}
</ProteinScene>
```

---

## 8. Annotations

Two Tier-1 projects anchor to the scene.

### 8.1 5ht2a-md

- **Title:** "Post-synaptic CNS membrane protein MD" (or shorter: from `publications.json`)
- **Anchor:** World-space position near the psilocin binding pocket on the receptor (extracellular face, between TM3/5/6/7).
- **Focus behavior:** Camera pivots toward the binding pocket. Binding-pocket residues and aromatic cage brighten (shader `uFocusRegion`). Non-pocket residues dim. The Gq/Gi toggle becomes prominent in the annotation card.
- **Card content:** Title, one-liner, tags, links (GitHub). Same pattern as `CoilAnnotations`.

### 8.2 mpro-analysis

- **Title:** "MPro allosteric pathway analysis"
- **Anchor:** World-space position at the MPro dimer's active-site cleft (the notch of the heart, between the two monomers).
- **Focus behavior:** Camera swings to face the MPro dimer. The catalytic dyad (C145/H41) and active-site loops brighten. The 9AS8 complex dims.
- **Card content:** Title, one-liner, tags, links. Note: no GitHub link for the repo may be public — check with user.

### 8.3 Annotation UX

Identical to `CoilAnnotations`: HTML `<div>` overlay, gsap-ticker-driven projection from 3D anchor to screen coordinates, dot + hairline + label, click-to-focus with card expansion, Esc to close, scroll-away releases focus. De-collision logic for the two labels. Reveal/fade envelope tied to the protein band's depth range.

---

## 9. Shading and atmosphere

### 9.1 Lighting

- **Key light:** Cyan (#56b6c2), directional, positioned to emphasize the helical ridges of the TM bundle.
- **Hemisphere ambient:** Cool blue (#1a2a3a) from below, lighter cyan (#3a5a6a) from above.
- **Character:** Sharper and colder than the coil band. Less bloom, less grain. A step toward the digital clarity of the code scale.

### 9.2 Protein surface shading

- **Base color:** Monochrome cyan. The receptor and G-protein are distinguished by brightness, not hue — receptor is full brightness, G-protein is ~60% (dimmer, establishing hierarchy). This matches the user's VMD aesthetic where the G-protein is orange (different from cyan receptor) — but in the portfolio's cyan register, we use brightness/saturation instead of hue to separate them.
- **RMSF modulation:** High-flexibility residues (loops, ICLs) are slightly warmer and brighter. Low-flexibility (TM helices) are cooler and more matte. This is a subtle effect — the ribbon shape already communicates structure; the color variation adds the dynamics layer.
- **Fresnel rim:** Subtle edge glow, same register as the arbor's branch rim. Brighter on the receptor than the G-protein.
- **Per-SS variation:** Helices have a slight specular highlight along the ribbon edge (the flat surface catches the key light). Sheets are slightly more matte. Coils are the dimmest.

### 9.3 Membrane

- **Geometry:** Cylinder (very short height) or flat disc with displaced vertices.
- **Color:** Neutral grey with a hint of warm cream (referencing the lipid bilayer's organic nature — a warm accent against the cool protein).
- **Opacity:** 0.12–0.18. Depth-write off. Rendered before the protein (renderOrder) so it sits visually behind.
- **Ripple:** Procedural vertex displacement — 2–3 octaves of simplex noise, time-driven, very slow (~0.1 Hz). Amplitude ~1–2 Å. The membrane breathes gently.
- **Reduced motion:** Static — no ripple animation.

### 9.4 Ligand (psilocin)

- **Representation:** A small glowing marker at the binding site. Options: a luminous sphere, a simplified ball-and-stick (bonds as thin cylinders, atoms as small spheres), or a single bright point with a soft halo.
- **Color:** Gold/yellow (#d4a520 → #f0c040 range), matching the user's VMD convention. This is the complementary warm accent against the cyan register — the same role amber plays in the coil band. One of very few non-cyan elements in the scene.
- **Behavior:** Tracks the ligand position per frame (it's in the trajectory data). Glow intensity increases when the 5ht2a annotation is focused.

### 9.5 MPro shading

- **Same cyan register** as the receptor, but slightly different character: the domain structure drives subtle brightness variation.
- Domain I / Domain III slightly different saturation to hint at the two-domain architecture without breaking the monochrome scheme.
- Active-site cleft (the heart's notch) has a warm accent — the catalytic dyad residues glow faintly, same gold/yellow as the psilocin ligand, but dimmer.
- **Reduced brightness overall** relative to the 9AS8 complex — the MPro is the secondary element.

### 9.6 Atmosphere

- **Drift motes:** Sparse cyan points with additive blending. Fainter and slower than the coil band's silt particles. ~50–80 instances. The scene should feel clean and precise.
- **Scene fog:** Continues the warm→cool gradient. At the protein band's entry, fog is the neutral blue left by the coil band. Through the band, it cools further toward a deep blue-cyan. Density is moderate — the protein should be clearly visible, not fighting through haze (unlike the coil, which deliberately sits in underwater murk).
- **Post-processing gradient:** Less bloom than the coil (the coil's underwater glow gives way to clearer, sharper light). Less film grain. The overall feeling is: we've surfaced from the underwater world into something cleaner, more precise, more digital.

---

## 10. Transitions

### 10.1 Chromatin → Protein (entry)

Same crossfade-with-z-motion pattern used at every band boundary.

- The coil fiber's opacity fades to 0 as the protein band begins.
- The protein complex emerges from the haze (the fog starts dense and clears as scaleProgress advances — the "resolve from haze" pattern).
- Fog color shifts from the coil's warm amber-blue toward the protein's cool cyan.
- The protein intro overlay text fades in with the structure, reads from `content/sections/protein.md`.
- Camera transitions from the coil's orbital view to the protein's initial framing.

### 10.2 Protein → Code (exit)

- The protein complex fades into fog as the code band begins.
- Fog shifts colder still. The protein's cyan gives way to the code scale's cooler digital register.
- Standard z-motion and opacity fade.

### 10.3 Reveal envelope

Following the coil's split-reveal pattern (lights first, body second):

- Ligand glow appears first (the warm accent glimmers through the haze).
- Membrane disc resolves next (the translucent slab emerges).
- Protein ribbons resolve last (the full structure materializes).
- Annotations appear once the structure is fully revealed.

---

## 11. Performance budget

| Metric | Target | Rationale |
|--------|--------|-----------|
| Draw calls (steady state) | ≤ 12 | Matches prior scales. |
| Draw calls (during toggle) | ≤ 15 | Transient; both G-protein sets visible during crossfade. |
| Vertex count | ~30–50K | 5 ribbon geometries × ~6–10K verts each. Comparable to the coil's instanced drums + thread. |
| CPU per scroll tick | < 1ms | Guide-point lerp (~900 residues × 6 floats × 2 frames) + geometry position write. |
| Payload (lazy-loaded) | ~5–8 MB | Two trajectory binaries + metadata JSON + MPro JSON. Fetched on band approach. |
| Transfer (gzipped) | ~3–4 MB | Float32 arrays compress well (~50% with gzip). |
| Memory | ~15–20 MB | Two trajectory buffers + geometry + textures. |

---

## 12. Validation checkpoints

These gates must pass **in order** before proceeding to the next stage. They replace the PLAN's "integration test" with concrete, inspectable criteria.

### Gate 1: Pipeline output validated against VMD

**When:** After the Python pipeline is complete, before any TypeScript.

- Load the frame-0 guide output in matplotlib 3D (or a simple Python viewer).
- Overlay on the VMD NewCartoon render of the same frame.
- **Pass criteria:**
  - Helix ribbons match VMD's helical ribbon winding (no 180° twists, no flipped normals).
  - Sheet regions (especially Gβ WD40 blades) show oriented flat ribbons.
  - Coil regions show thin tubes.
  - The ICL3 gap in chain A produces two visually separate fragments.
  - Psilocin position matches the binding pocket in the VMD render.
  - Membrane midplane/thickness are physically reasonable (~35 Å thick, centered on the TM helices).

### Gate 2: Static ribbon renders in browser

**When:** After `protein-geometry.ts` and `protein-materials.ts` are working with frame-0 data.

- The receptor complex renders as a recognizable GPCR (7 TM helices visible as ribbon windings).
- The Gβ propeller shows sheet arrows.
- The membrane disc is translucent and positioned correctly.
- The ligand glows at the binding site.
- Screenshot the isolated preview and compare to VMD renders.

### Gate 3: Trajectory animation works

**When:** After `ProteinMesh.tsx` scroll-driven interpolation is connected.

- Scrolling through the protein band drives smooth protein motion.
- The motion reads as thermal breathing — loops flex, helices shimmer, the fold is stable.
- No vertex popping, no topology changes, no NaN artifacts.
- Scrolling backward rewinds cleanly.

### Gate 4: Gq/Gi toggle works

**When:** After the toggle mechanic is connected.

- Toggling smoothly morphs the receptor.
- The G-protein crossfades (no hard pop).
- The RMSF coloring changes visibly — ICL/ECL loops show different flexibility between the two systems.
- The scientific result is visible: the intracellular face breathes harder under Gi.

### Gate 5: Full scene integration

**When:** After annotations, intro, transitions, atmosphere, and MPro are all connected.

- Scroll from the coil band into the protein band. The receptor complex resolves from haze.
- The chromatin→protein transition is smooth (no double-rendering, no fog discontinuity).
- Both annotations are accessible and their focus interactions work.
- The MPro dimer is visible and its heart shape is recognizable.
- Links work. The overall warm-to-cool gradient is continuous.
- No-WebGL fallback shows the document version from Phase 1.

---

## 13. Prerequisites (user actions before implementation)

These are things Zara must do that cannot be automated by the pipeline or the renderer.

1. **Export MPro dimer PDB from PyMOL.**
   - Open `mpro-analysis/vmd/mpro_ens_prepared.pdb` in PyMOL.
   - Generate the biological assembly (the C2 dimer). In PyMOL: `Action → Generate → Biological Assembly` or `symexp dimer, mpro, CRYST1, 3.0` → find the symmetry mate that produces the heart shape.
   - Save the dimer as a single PDB file with two chains (A and B).
   - Place it somewhere accessible (e.g., `mpro-analysis/vmd/mpro_dimer.pdb` or directly in the portfolio's `setup/` or `public/protein/` directory).

2. **Verify the `biochemcore` conda env has everything needed.**
   - MDAnalysis 2.10+ (confirmed: 2.10.0 ✓)
   - NumPy, struct (stdlib) — for binary packing
   - matplotlib — for validation visualization
   - No additional installs expected.

3. **Run the pipeline script** (provided by the implementation phase).
   - `conda activate biochemcore && python scripts/process-protein-trajectory.py`
   - Review the validation output (matplotlib overlay plot).
   - Commit the output files in `public/protein/` to the repo.

4. **Update `content/publications.json`** (if not already done) with entries for the two Tier-1 protein-scale projects: `5ht2a-md` and `mpro-analysis`.

---

## 14. Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MDAnalysis DSSP misclassifies known helices | Medium | High (wrong ribbon shape) | Cross-check against `rmsf_data.csv` region labels; override mismatches. Gate 1 catches visually. |
| Carbonyl-flip correction fails at helix-sheet boundary | Medium | High (180° ribbon twist) | Standard dot-product-flip algorithm, validated at Gate 1. Fixable in pipeline without touching TS. |
| Guide-point interpolation produces NaN/degenerate normals | Low | High (black triangles) | Renormalize after lerp; fallback to previous frame's normal if length < epsilon. |
| Gq/Gi receptor residue mismatch > 4 residues | Low | Medium (visible gap at termini during morph) | Fade unmatched residues rather than morphing. sharedMap handles arbitrary correspondence. |
| Payload too large for portfolio context | Low | Medium (slow initial load of protein band) | Lazy-load on band approach. Gzip. Fall back to §5.3 only if §5.2 proves insufficient. |
| Gβ WD40 sheet arrows don't read at screen scale | Medium | Low (Gβ is a secondary element) | If arrows are too small to read, simplify to flat ribbons (no taper). The receptor's helices are the dominant visual. |
| MPro biological dimer is incorrect (wrong symmetry mate) | Low | Medium (wrong shape) | User validates in PyMOL before export. The heart shape is unmistakable — if it doesn't look like a heart, it's wrong. |
| Thread-ambient breathing amplitude too high at portfolio scale | Medium | Low (distracting wobble) | Tunable via `protein-params.ts` defaults, adjustable in dev panel. Start conservative (0.02 Å × RMSF_norm). |

---

## 15. What changed from the PLAN

| PLAN item | Change | Reason |
|-----------|--------|--------|
| "Cluster frames to ~50–100 representatives" (6.2) | **Eliminated.** Ship all 100 frames directly. | The trajectory IS 100 frames. No clustering needed. |
| "PDB parser in TypeScript" (6.1) | **Replaced** with offline Python pipeline. | Don't reinvent molecular tools in the browser. Fat pipeline, thin renderer. |
| "Trajectory data pipeline — may require Python" (6.2) | **Confirmed Python-only.** The pipeline is the central build step. | MDAnalysis is the right tool. Everything molecular happens offline. |
| "mpro-analysis anchors at the G-protein interface" (6.6) | **Corrected.** MPro is a separate static structure, not part of the 9AS8 complex. | MPro (SARS-CoV-2 main protease) has nothing to do with the GPCR's G-protein. |
| Single system (6.3–6.4) | **Expanded** to Gq + Gi with a toggle comparison. | Both trajectories exist locally. The Gq-vs-Gi finding is the project's actual scientific result. |
| "Under 12 draw calls" (6.9) | **Steady state ≤ 12**, transient ≤ 15 during toggle. | Two G-protein sets are briefly visible during the crossfade. |
| Secondary structure from PDB HELIX/SHEET records (6.1) | **Replaced** with MDAnalysis DSSP on frame 0. | More reliable than PDB header records, which can be incomplete. Cross-checked against RMSF region labels. |

---

## 16. Glossary

| Term | Meaning in this document |
|------|--------------------------|
| **Guide point** | A point on the ribbon's centerline with position, tangent, and normal. 4 per residue (Catmull-Rom sub-samples). The geometry builder sweeps a cross-section at each guide point. |
| **Ribbon normal** | ⚠️ **Corrected 2026-07-15 (Stage B.1).** This entry originally read "the vector perpendicular to the ribbon surface", which contradicts its own next sentence: the Cα→carbonyl-O vector is the ribbon's **width axis**, not its surface normal. In an ideal helix the Cα tangent is tangential (θ̂) and the carbonyls point roughly *along* the helix axis (ẑ, the i→i+4 H-bond direction), so `side = GramSchmidt(Cα→O, tangent) ≈ ẑ` is the width axis and `up = tangent × side ≈ r̂` — radial — is the surface normal. That is the correct cartoon: broad face seen from the side, width along the axis. Reading it as the surface normal instead rotates every ribbon 90° into a stack of washers. Pinned by the ideal-coil test in `protein-guide.test.ts`. Beware the plausible-but-false premise that Cα→O points radially outward: it reaches the right formulas via broken logic and invites a swap. |
| **Carbonyl flip** | An artifact where the ribbon normal reverses direction at certain residues (especially at helix-sheet boundaries), causing a 180° twist in the ribbon. Fixed by detecting and flipping negative dot products between consecutive normals. |
| **SS** | Secondary structure assignment: H (helix), E (sheet/strand), C (coil/loop). |
| **RMSF** | Root Mean Square Fluctuation — a per-residue measure of flexibility (how much each residue moves across the trajectory). Higher RMSF = more flexible = loops. Lower = rigid = helices. |
| **scaleProgress** | Local 0–1 progress through the current scale band. Set by the depth store. Drives the trajectory frame interpolation. |
| **lit_resid** | Literature residue number — the canonical UniProt numbering, as opposed to the local (1-indexed, sequential) numbering used in the processed PDB. Enables matching residues across the Gq and Gi systems. |
| **Segid** | CHARMM segment identifier. The DCD trajectories use segids (PROA, PROB, etc.) rather than PDB chain letters (A, B, etc.) to identify subunits. |
| **ICL3** | Intracellular loop 3 — a long disordered region connecting TM5 and TM6 of the receptor. 49 residues deleted in the construct, creating the backbone gap at residues 185/186. |
| **WD40 propeller** | The beta-sheet-rich fold of Gβ1. Seven "blades" arranged in a circular propeller. This is where the sheet arrows matter most visually. |
