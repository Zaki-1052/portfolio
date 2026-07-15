<!-- docs/PLAN-protein-scale.md — session-phased implementation plan for protein-scale-design.md (Phase 6, the protein scale). -->

# Phase 6 — The Protein Scale: GPCR molecular structure + MD trajectory

> **Governing spec:** `docs/protein-scale-design.md` (approved 2026-07-11).
> This plan tells you what to build and when; the design doc has the full
> specification. Section references (§N) point there.

## Context

Phases 0–5 shipped the first three 3D scenes (tissue/brain, cellular/arbor,
chromatin/coil). Phase 7 (code/terminal) and Phase 8 (expression) are in
progress in parallel. The protein band `[0.57, 0.71)` is the fourth scene
and the first built from **real experimental data** rather than procedural
generation.

Current state (verified 2026-07-13 in source):

- `ProteinContent.tsx` exists with a sidebar + `content/sections/protein.md`
  (lorem placeholder). No 3D scene — `protein` has no entry in
  `SCENE_REGISTRY` or `SCENE_KEYS` (`scene-manager.tsx`).
- `src/scales/protein/` contains only `.gitkeep` and `ProteinContent.tsx`.
- `content/publications.json` has two entries (both chromatin-scale); no
  protein-scale project entries exist.
- No `public/protein/` directory, no binary assets, no pipeline script.

Data state (verified 2026-07-13 on disk):

| Asset | Location | Status |
|-------|----------|--------|
| Gq structure | `amarolab/setup/9AS8_complex.pdb` | Present (1.1 MB) |
| Gq PSF | `amarolab/openmm/step5_input.psf` | Present (49 MB) |
| Gq DCDs | `amarolab/openmm/step7_{1..10}.dcd` | 10 files × ~34 MB |
| Gq RMSF | `amarolab/analysis/phase3_rmsf/rmsf_data.csv` | Present |
| Gq H-bonds | `amarolab/analysis/phase8_hbonds/hbond_occupancy.csv` | Present |
| Gq aromatics | `amarolab/analysis/phase9_aromatics/aromatic_summary.csv` | Present |
| Gi structure | `amarolab/new-Gi/9LL8_complex.pdb` | Present (1.1 MB) |
| Gi PSF | `amarolab/new-Gi/charmm-gui-8313215931/openmm/step5_input.psf` | Present (48 MB) |
| Gi DCDs | `amarolab/new-Gi/charmm-gui-8313215931/openmm/step7_{1..100}.dcd` | **100 files** × ~32 MB |
| Gi RMSF | `amarolab/new-Gi/analysis/phase3_rmsf/rmsf_data.csv` | Present |
| MPro monomer | `mpro-analysis/vmd/mpro_ens_prepared.pdb` | Present (monomer only) |
| MPro dimer | `mpro-analysis/vmd/mpro_dimer.pdb` | Present (exported 2026-07-14) |

**Gi trajectory discrepancy:** the design doc assumes 10 DCDs / 100 frames /
10 ns. Reality is **100 DCDs / ~1000 frames / ~100 ns**. The pipeline must
subsample to 100 frames to match the Gq system's frame count — either use
only the first 10 DCDs (matched 10 ns window), or stride every 10th frame
across the full 100 ns. Decision made in Session 1 based on what best serves
the visualization.

---

## Architecture decisions

1. **Gq-first development.** The full pipeline and renderer are built and
   validated against the Gq system alone. Gi is added as a second pass once
   the single-system path works end-to-end. This avoids doubling the debug
   surface during the hardest integration window (DSSP, flip correction,
   geometry sweep).

2. **Ship Cα+O, compute splines in TS (§5.2).** Per-residue Cα and
   carbonyl-O positions are packed into the binary; the TypeScript side
   computes Catmull-Rom splines, tangents, and per-frame normals using the
   reference normals from `protein-meta.json` for flip consistency. Fall back
   to pre-computed guides (§5.3) only if runtime derivation produces
   artifacts at Gate 2.

3. **Pipeline writes the binary; Zara runs the script.** The AI writes
   `scripts/process-protein-trajectory.py` as a complete, literal,
   copy-pasteable script. Zara runs it in the `biochemcore` conda env and
   pastes validation output back. No heredocs, no placeholders.

4. **Agnostic model vocabulary.** Same rule as all phases: code, comments,
   docs, and commit messages use neutral geometric/design terms. The design
   doc is the only place domain-specific terms live.

---

## Prerequisites (user actions, before Session 1)

These cannot be automated. The pipeline session can proceed on Gq + Gi
without the MPro dimer — MPro is processed separately and needed only by
Stage D.

- [x] **Export MPro dimer PDB from PyMOL.** Open
  `mpro-analysis/vmd/mpro_ens_prepared.pdb`, generate the biological
  assembly (C2 dimer), save as a two-chain PDB. Place at
  `mpro-analysis/vmd/mpro_dimer.pdb` or `public/protein/mpro_dimer.pdb`.
  The heart shape is the visual test — if it doesn't look like a heart,
  it's the wrong symmetry mate.
  **Done 2026-07-14.** Saved to `mpro-analysis/vmd/mpro_dimer.pdb`.
  Chains A+B, 4772 atoms each, 7YY ligand in both chains.
  Reference: PDB 6Y2E biological assembly used for symmetry mate.

- [x] **Verify `biochemcore` conda env.** Run:
  ```
  conda activate biochemcore
  python -c "import MDAnalysis; print(MDAnalysis.__version__)"
  ```
  Confirm ≥ 2.10.0. NumPy and matplotlib are expected to be present.

---

## Session 1 — Pipeline script (Python)

> **Goal:** Produce `scripts/process-protein-trajectory.py` — a complete
> script that processes the Gq and Gi trajectories and writes the binary
> output files.
>
> **Estimate:** 1 session.

### Prerequisites

- `biochemcore` conda env verified.

### 1.1 Decide Gi frame sampling

Gq has 100 frames spanning 10 ns. Gi has ~1000 frames spanning ~100 ns.
Options:

- **A) First 10 DCDs only** (matched 10 ns window): best for direct
  comparison, but misses the full trajectory's equilibrated dynamics.
- **B) Stride every 10th frame** (100 frames spanning 100 ns): broader
  sampling, different time window than Gq.

Recommendation: **Option A** for initial build — keeps the comparison clean
and the pipeline simple. The stride approach is a later upgrade if the 10 ns
window doesn't capture enough motion.

### 1.2 Write the pipeline script

Full specification: §4.2 (Gq/Gi processing) and §4.3 (MPro processing).
The script handles both systems in one run. Key processing steps:

1. Load topology + trajectory (`MDAnalysis.Universe`)
2. Select backbone atoms (Cα + carbonyl O) + ligand heavy atoms
3. Align all frames to frame 0 (receptor Cα)
4. Run DSSP on frame 0, cross-check against RMSF CSV region labels
5. Compute reference ribbon normals with carbonyl-flip correction
6. Extract membrane geometry (midplane, thickness, radius from phosphates)
7. Extract per-residue metadata (RMSF, regions, binding pocket, aromatics)
8. Build the shared receptor map (lit_resid matching between Gq and Gi)
9. Process ligand positions + bond connectivity per frame
10. Pack and write binary files (§5.1–§5.2 format)

Input paths (verified on disk):

```python
# Gq
GQ_PSF  = 'amarolab/openmm/step5_input.psf'
GQ_DCDS = ['amarolab/openmm/step7_{}.dcd'.format(i) for i in range(1, 11)]
GQ_RMSF = 'amarolab/analysis/phase3_rmsf/rmsf_data.csv'
GQ_HBONDS = 'amarolab/analysis/phase8_hbonds/hbond_occupancy.csv'
GQ_AROMATICS = 'amarolab/analysis/phase9_aromatics/aromatic_summary.csv'

# Gi
GI_PSF  = 'amarolab/new-Gi/charmm-gui-8313215931/openmm/step5_input.psf'
GI_DCDS = ['amarolab/new-Gi/charmm-gui-8313215931/openmm/step7_{}.dcd'.format(i)
           for i in range(1, 11)]  # first 10 only (Option A)
GI_RMSF = 'amarolab/new-Gi/analysis/phase3_rmsf/rmsf_data.csv'
```

Output files (written to `public/protein/` in the portfolio repo):

| File | Contents | Est. size |
|------|----------|-----------|
| `protein-meta.json` | All metadata (§5.1) | ~50 KB |
| `gq-trajectory.bin` | 100 frames, Gq Cα+O + G-protein + ligand (§5.2) | ~2.2 MB |
| `gi-trajectory.bin` | 100 frames, Gi Cα+O + G-protein + ligand (§5.2) | ~2.2 MB |

### 1.3 MPro processing (separate path)

If the dimer PDB exists, the script also processes it per §4.3 and writes
`mpro-static.json`. If not, this step is deferred to a later session — the
main pipeline doesn't block on it.

### 1.4 Generate validation plots

The script produces a matplotlib 3D overlay of the frame-0 ribbon guide:
- Cα trace colored by SS type (H=blue, E=red, C=gray)
- Normal vectors drawn as short sticks at every 10th residue
- Separate subplot per chain fragment (receptor frag 1, frag 2, Gα, Gβ, Gγ)
- Ligand position as a gold sphere
- Membrane midplane as a translucent disc

Saved to `scripts/validation/protein-pipeline-validation.png`.

### Session 1 done criteria

- [x] `scripts/process-protein-trajectory.py` exists, is complete and literal (no placeholders)
- [x] The script's input paths match verified file locations above
- [x] Output format matches §5.1 and §5.2 exactly
- [x] Validation plot generation is included
- [x] Gi frame sampling decision is documented in the script header
  **Done 2026-07-14.** Option B: stride every 10th frame across all 100 Gi DCDs
  (1000 → 100 frames, full 100 ns). Script is 974 lines.

---

## Session 2 — Pipeline execution & validation (Gate 1)

> **Goal:** Run the pipeline, validate output against VMD renders, commit
> binary assets. Gate 1 must pass.
>
> **Estimate:** 1 session (may extend if DSSP/flip issues arise).

### Prerequisites

- Session 1 complete.
- Zara has the `biochemcore` conda env activated.

### 2.1 Run the pipeline

Zara runs:
```
conda activate biochemcore && python scripts/process-protein-trajectory.py
```

Review stdout for:
- Chain detection and residue counts matching §2.1 / §2.2
- DSSP assignment summary (count of H/E/C per chain)
- Any DSSP overrides from region-label cross-check
- Carbonyl-flip correction count
- Shared receptor map size (~260 residues)
- Output file sizes matching estimates

### 2.2 Validate against VMD (Gate 1)

Gate 1 criteria from §12:

- [ ] Helix ribbons match VMD's helical ribbon winding (no 180° twists)
- [ ] Sheet regions (Gβ WD40 blades) show oriented flat ribbons
- [ ] Coil regions show thin tubes
- [ ] ICL3 gap in chain A produces two visually separate fragments
- [ ] Psilocin position matches the binding pocket in VMD render
- [ ] Membrane midplane/thickness are physically reasonable (~35 Å, centered on TM)

Compare `scripts/validation/protein-pipeline-validation.png` against VMD
reference renders in `amarolab/charmm-gui/Figure_5HT2A_psilocin_membrane_full.png`
and `amarolab/demo/protein.png`.

### 2.3 Iterate if needed

If DSSP misclassifies known helices → add overrides from RMSF region labels.
If carbonyl flips remain → adjust the dot-product threshold or extend the
smoothing window. If the shared map is too small → debug lit_resid matching.

Each fix modifies the pipeline script only — no TypeScript touches until
Gate 1 passes.

### 2.4 Commit output

Once validated:
```
mkdir -p public/protein
cp <output files> public/protein/
git add public/protein/
```

### Session 2 done criteria

- [x] Gate 1 passes (all 6 criteria above)
- [x] `public/protein/protein-meta.json` committed
- [x] `public/protein/gq-trajectory.bin` committed (~2.2 MB)
- [x] `public/protein/gi-trajectory.bin` committed (~2.2 MB)
- [x] Validation plot reviewed and filed
  **Done 2026-07-14.** Gate 1 passed. Helix/sheet/coil assignments correct,
  ICL3 gap produces 2 fragments, ligand at binding pocket, membrane ~37 Å.
  MPro DSSP: H=70 E=85 C=151. `mpro-static.json` also committed.

---

## Session 3 / Stage A — Loader, params, seams, scene registration

> **Goal:** Wire the protein scale into the engine. Loader decodes the
> binary. Scene placeholder mounts/unmounts at the correct depth. All
> pure-logic modules tested. No 3D geometry yet.
>
> **Estimate:** 1 session.

### Prerequisites

- Session 2 complete (binary assets in `public/protein/`).
- Phases 0–5 patterns stable.

### New files

| File | Purpose |
|------|---------|
| `src/utils/protein-loader.ts` | Fetch `protein-meta.json`, then `gq-trajectory.bin` and `gi-trajectory.bin` in parallel. Decode Float32Arrays. Return `ProteinData` (§6.5 interface). |
| `src/utils/protein-loader.test.ts` | Validate decode of a small synthetic binary (hand-built fixture). |
| `src/scales/protein/protein-params.ts` | Visual parameters: `PROTEIN_ORIGIN`, cross-section profiles (§6.2 table), reveal envelope depths, colors, RMSF normalization range. `applyProteinRibbonLook()` writer. |
| `src/scales/protein/protein-fog.ts` + `.test.ts` | Additive fog density delta + cool-cyan tint blend for `[0.57, 0.71)`. Zero outside window. Non-overlap assertion vs coil fog. |
| `src/stores/protein-focus.ts` + `.test.ts` | `activeSystem: 'gq' | 'gi'`, `toggleBlend: number`, `focusedAnnotation: string | null`, `shouldReleaseProteinFocus`. Coil-focus mold. |
| `src/scales/protein/ProteinScene.tsx` | Placeholder `<group/>` — proves mount/unmount wiring. |

### Modified files

| File | Edit |
|------|------|
| `src/engine/scene-manager.tsx` | `protein: ProteinScene` in `SCENE_REGISTRY` + `SCENE_KEYS` entry. |
| `src/engine/scene-atmosphere.tsx` | Compose `proteinFogDensityDeltaFor` / `proteinFogColorBlendT` after the coil term. |
| `src/engine/camera-keyframes.ts` | New knots in `[0.565, 0.71]`: arrival ≈0.58, plateau center ≈0.64, band exit ≈0.70. Authored with commentary convention. |
| `src/engine/camera-keyframes.test.ts` | At least one knot inside `[0.57, 0.71)`. |
| `src/styles/globals.css` | Add `[data-scale='protein']` to reveal-seam selector groups. Add `[data-webgl='active'] [data-scale='protein'] .protein-doc { display:none; }`. |
| `src/scales/protein/ProteinContent.tsx` | Wrap existing body in `.protein-doc`. Add `hideBadge`. Exact `ChromatinContent.tsx` shape. |

### Exit check

`npm run test` + `npm run typecheck` green. Scrolling into the protein band
mounts/unmounts the placeholder scene. `.protein-doc` hidden under WebGL.
Loader successfully fetches and decodes the binary assets (verified via a
throwaway `console.log` in the scene placeholder, or a unit test with a
dev-server fetch).

### Session 3 done criteria

- [x] `src/utils/protein-loader.ts` + test — fetch + decode binary trajectory data
- [x] `src/scales/protein/protein-params.ts` — PROTEIN_ORIGIN, cross-sections, envelope, RMSF
- [x] `src/scales/protein/protein-fog.ts` + test — density delta + tint blend, non-overlap verified
- [x] `src/stores/protein-focus.ts` + test — activeSystem, toggleBlend, focusedAnnotation
- [x] `src/scales/protein/ProteinScene.tsx` — placeholder group, acquireAmbientRendering
- [x] `src/engine/scene-manager.tsx` — protein entry in SCENE_REGISTRY + SCENE_KEYS
- [x] `src/engine/scene-atmosphere.tsx` — protein fog composed between coil and code
- [x] `src/engine/camera-keyframes.ts` + test — 3 new knots in [0.565, 0.71]
- [x] `src/styles/globals.css` — WebGL reveal, theme → cyan, protein-doc yield, runways
- [x] `src/scales/protein/ProteinContent.tsx` — reshaped to ChromatinContent pattern
- [x] All tests pass (349/349), typecheck green, lint clean
  **Done 2026-07-14.** 8 new files, 6 modified. CSS theme updated from rose to
  cyan per design spec. Fog non-overlap with coil and code verified in tests.

---

## Session 4 / Stage B.1 — Ribbon geometry, materials, static render (Gate 2)

> **Goal:** The receptor complex renders as a recognizable GPCR from
> frame-0 data. Gate 2 must pass.
>
> **Estimate:** 1 session (the largest single session — geometry sweep is
> the core new algorithm).

### Prerequisites

- Stage A complete.

### New files

| File | Purpose |
|------|---------|
| `src/scales/protein/protein-geometry.ts` | The core ribbon sweep (§6.2). Takes per-residue Cα+O positions → Catmull-Rom spline (4 sub-samples/residue) → SS-dependent cross-section sweep → `BufferGeometry`. Exports `buildRibbonGeometry()` (initial build) and `writeRibbonPositions()` (in-place update for animation). Cross-section profiles: helix (flat ellipse 1.2×0.2), sheet (rectangle→arrow taper), coil (tube r=0.15). SS transitions morph over 2 guide points. Per-vertex attributes: `aResidueIndex`, `aSSType`, `aChainIndex`, `aShade`. |
| `src/scales/protein/protein-geometry.test.ts` | Verify: guide-point count = residueCount × 4. Vertex count > 0. No NaN in positions/normals. Arrow taper fires for E-runs ≥ 3. Two fragments for receptor (ICL3 gap). |
| `src/scales/protein/protein-materials.ts` | `ProteinRibbonMaterial` via drei `shaderMaterial`. Uniforms per §6.4. `applyProteinRibbonLook()`. RMSF DataTexture (set once from metadata). |
| `src/scales/protein/shaders/protein-ribbon.vert.glsl` | Per-vertex: position + normal from geometry. Ambient breathing displacement (RMSF-modulated sinusoidal, §6.3). Fog. |
| `src/scales/protein/shaders/protein-ribbon.frag.glsl` | Monochrome cyan base. Chain-based brightness (receptor full, G-protein 60%). RMSF warmth modulation. Fresnel rim. Per-SS specular variation. Fog mix. Focus-dim uniform. |
| `src/scales/protein/ProteinMesh.tsx` | Mounts receptor fragments (2 geometries) + G-protein chains (3 geometries) = 5 draw calls. Reads depth imperatively in `useFrame`. Frame-0 only this session — no interpolation yet. Depth-gated reveal envelope (§10.3 ordering: ligand first, membrane, ribbons). `DynamicDrawUsage` on position/normal attributes. |
| `src/dev/protein-live-params.ts` | Leva override channel (coil-live-params pattern). |
| `src/dev/protein-dev-tools.tsx` | Leva panel: ribbon look, cross-section dimensions, camera override, RMSF range. Every slider range brackets its shipped default. |
| `protein-preview.html` + `src/dev/protein-preview.tsx` | Isolated preview: `?depth=`, `?dpr=`, real PostFX, `window.__preview` for draw-call inspection. |

### Modified files

| File | Edit |
|------|------|
| `ProteinScene.tsx` | Real children: `<ProteinMesh />` + dev tools. `acquireAmbientRendering()`. |
| `app.tsx` | Lazy DEV-gated `ProteinDevTools`. |

### Gate 2 criteria (§12)

- [ ] Receptor complex renders as a recognizable GPCR (7 TM helices visible)
- [ ] Gβ propeller shows sheet arrows
- [ ] Membrane disc is translucent and positioned correctly (deferred if membrane is Session 5)
- [ ] Ligand glows at the binding site (deferred if ligand is Session 5)
- [ ] Screenshot of preview compared to VMD renders

**Note:** membrane and ligand rendering may land in this session or be
deferred to Session 5. The gate's core test is the ribbon geometry — the
protein must be recognizable.

### Exit check

`npm run test` + `npm run typecheck` green. `protein-preview.html?depth=0.64`
shows the GPCR complex with correct helix/sheet/coil rendering. Draw calls
confirmed ≤ 7 via `window.__preview`. No NaN artifacts or degenerate
triangles.

---

## Session 5 / Stage B.2 — Animation engine, membrane, ligand (Gate 3)

> **Goal:** Scrolling through the protein band drives smooth trajectory
> playback. Membrane and ligand render and track per-frame positions.
> Gate 3 must pass.
>
> **Estimate:** 1 session.

### Prerequisites

- Stage B.1 complete (static frame-0 renders correctly).

### 5.1 Scroll-driven frame interpolation

In `ProteinMesh.tsx` (§6.3):

- `scaleProgress` (0–1 through the protein band) maps to float frame index:
  `frameIndex = scaleProgress * (frameCount - 1)`.
- Bracket the two neighboring frames, lerp all Cα+O positions.
- Feed lerped positions to `writeRibbonPositions()` — recomputes splines,
  updates BufferGeometry in place.
- **Write guard:** skip if frame index hasn't changed (same floor + frac to
  3 decimal places). Same pattern as `CoilMesh.syncGeometry`.

### 5.2 Ambient breathing

Vertex shader (§6.3): small sinusoidal displacement along normal, driven by
`uTime`, modulated by per-residue RMSF. Amplitude ~0.05 Å × RMSF_normalized.
Frequency ~0.3 Hz. Frozen to zero under reduced motion.

### 5.3 Membrane disc

New files:

| File | Purpose |
|------|---------|
| `src/scales/protein/ProteinMembrane.tsx` | Short cylinder or displaced disc at `membrane.midplaneY`. Translucent grey (~0.15 opacity), depth-write off, renderOrder before protein. |
| `src/scales/protein/shaders/protein-membrane.vert.glsl` | Procedural simplex-noise vertex displacement for ripple (2–3 octaves, ~0.1 Hz). |
| `src/scales/protein/shaders/protein-membrane.frag.glsl` | Neutral grey + warm cream hint. Alpha 0.12–0.18. Fog mix. |

### 5.4 Ligand rendering

New file:

| File | Purpose |
|------|---------|
| `src/scales/protein/ProteinLigand.tsx` | Gold/yellow glow marker at psilocin position. Tracks ligand coords per frame from trajectory data. Options: luminous sphere, simplified ball-and-stick, or single point + halo. Glow intensifies when 5ht2a annotation is focused. |

### 5.5 Reduced motion

Static at middle frame (frame 50). No interpolation, no breathing, no
membrane ripple. Everything renders but nothing moves.

### Gate 3 criteria (§12)

- [ ] Scrolling through the protein band drives smooth protein motion
- [ ] Motion reads as thermal breathing — loops flex, helices shimmer, fold is stable
- [ ] No vertex popping, topology changes, or NaN artifacts
- [ ] Scrolling backward rewinds cleanly
- [ ] Membrane disc is visible and correctly positioned
- [ ] Ligand glows at the binding site and tracks its position

### Exit check

`npm run test` + `npm run typecheck` green. Scrolling in
`protein-preview.html` produces smooth trajectory playback from frame 0 to
frame 99 and back. CPU time per scroll tick < 1ms (measured in devtools
performance panel). Draw calls ≤ 8 (5 ribbons + membrane + ligand + maybe atmosphere placeholder).

---

## Session 6 / Stage C — Gq/Gi toggle (Gate 4)

> **Goal:** Both systems load. Toggling smoothly morphs the receptor and
> crossfades the G-protein. The scientific result (ICL face breathes
> differently under Gi) is visible. Gate 4 must pass.
>
> **Estimate:** 1 session.

### Prerequisites

- Stage B.2 complete (Gq animation works end-to-end).
- `gi-trajectory.bin` in `public/protein/`.

### 6.1 Dual-system loading

`protein-loader.ts` already loads both binaries. `ProteinMesh` gains a
second set of G-protein geometries (Gαi1, Gβ1-Gi, Gγ2-Gi) — always
present in the scene, initially invisible (opacity 0).

### 6.2 Receptor morph

Using the `sharedMap` from `protein-meta.json` (§6.3):

- Shared-subset residues morph vertex-by-vertex: lerp between Gq and Gi
  guide positions at the current frame, driven by `toggleBlend` (0–1).
- Unmatched terminal residues: opacity fades (outgoing 1→0, incoming 0→1).
- RMSF coloring transitions simultaneously (RMSF DataTexture swaps or
  blends between two textures).

### 6.3 G-protein crossfade

Outgoing G-protein: opacity 1→0 over ~600ms GSAP tween.
Incoming G-protein: opacity 0→1 simultaneously.
Both sets exist in the scene; visibility is opacity-only.

### 6.4 Ligand morph

Same molecule in both systems (same atom count). Vertex-by-vertex lerp
driven by `toggleBlend`.

### 6.5 Membrane crossfade

If midplane/thickness differ between systems, crossfade the membrane
parameters.

### 6.6 Toggle UI

New file:

| File | Purpose |
|------|---------|
| `src/scales/protein/ProteinToggle.tsx` | HTML overlay: minimal two-state toggle ("Gq" / "Gi") positioned in the viewport. Drives `protein-focus.ts` store. Styled to match the site's design language. Visible only when the protein band is active. |

### Gate 4 criteria (§12)

- [ ] Toggling smoothly morphs the receptor (no hard pops)
- [ ] G-protein crossfades cleanly
- [ ] RMSF coloring changes visibly — ICL/ECL loops show different flexibility
- [ ] The scientific result is visible: intracellular face breathes harder under Gi
- [ ] Toggle is discoverable and responsive

### Exit check

`npm run test` + `npm run typecheck` green. In `protein-preview.html`,
toggling between Gq and Gi produces a smooth 600ms morph. The receptor's
loops visibly change character. Draw calls during toggle ≤ 15 (transient).
Steady state ≤ 12.

---

## Session 7 / Stage D.1 — MPro companion

> **Goal:** The static MPro dimer renders as a recognizable heart-shaped
> structure, offset from the receptor complex.
>
> **Estimate:** 1 session (can be combined with Session 8 if fast).

### Prerequisites

- Stage B.1 complete (ribbon geometry code works).
- MPro dimer PDB exported from PyMOL (prerequisite item).
- `mpro-static.json` generated by the pipeline (Session 2 or a re-run).

### New files

| File | Purpose |
|------|---------|
| `src/scales/protein/MProMesh.tsx` | Static ribbon mesh from `mpro-static.json` (§5.4). Two chains = 2 draw calls. Uses the same `buildRibbonGeometry()` from `protein-geometry.ts` but with pre-computed guides (no animation). Domain-driven brightness variation. Catalytic dyad (C145/H41) accent in gold. |
| `src/scales/protein/mpro-params.ts` | `MPRO_ORIGIN` (offset from receptor: lower-right, ~60% scale, slightly further from camera). Domain color map from §2.4. |

### Modified files

| File | Edit |
|------|------|
| `ProteinScene.tsx` | Add `<MProMesh />`. |

### Exit check

`protein-preview.html` shows both the receptor complex and the MPro dimer.
The heart shape is recognizable. MPro is visually secondary (dimmer, smaller).
Two additional draw calls (total steady state ≤ 14 with both G-protein sets).

---

## Session 8 / Stage D.2 — Annotations, intro overlay, focus interactions

> **Goal:** Two annotation cards anchor to the scene. Intro text resolves
> with the structure. Focus interactions work (camera pivot, dimming).
>
> **Estimate:** 1 session.

### Prerequisites

- Stage C complete (toggle works).
- Stage D.1 complete (MPro renders).

### 8.1 Publication data

Modified:

| File | Edit |
|------|------|
| `content/publications.json` | Add two entries for protein-scale projects: `5ht2a-md` and `mpro-analysis` (§8.1, §8.2). Titles, one-liners, tags, links — lorem placeholder text where real copy isn't finalized. |

### 8.2 Annotations

New files:

| File | Purpose |
|------|---------|
| `src/scales/protein/ProteinAnnotations.tsx` | HTML overlay following `CoilAnnotations.tsx` exactly. Two annotation cards: (1) 5ht2a-md anchored at the binding pocket, (2) mpro-analysis anchored at MPro's active-site cleft. GSAP ticker for projection. De-collision for two labels. Depth envelope for reveal/fade. |
| `src/scales/protein/protein-anchors.ts` + `.test.ts` | World-space anchor positions for the two annotations. Binding pocket anchor: near psilocin between TM3/5/6/7. MPro anchor: at the dimer's notch. |

### 8.3 Intro overlay

New file:

| File | Purpose |
|------|---------|
| `src/scales/protein/ProteinIntro.tsx` | Resolve-from-haze text overlay (§10.3). Reads from `content/sections/protein.md`. Fades in with the structure, fades out as annotations appear. Exact `CoilIntro.tsx` pattern. |

### 8.4 Focus interactions

When an annotation is clicked/focused (§8.1, §8.2):

- **5ht2a-md focus:** Camera pivots toward binding pocket. Binding-pocket
  residues and aromatic cage brighten (`uFocusRegion` shader uniform).
  Non-pocket residues dim. Toggle becomes prominent in the card.
- **mpro-analysis focus:** Camera swings to face MPro dimer. Catalytic dyad
  and active-site loops brighten. The 9AS8 complex dims.
- Esc to close. Scroll-away releases focus. Same UX as coil annotations.

### Exit check

`npm run test` + `npm run typecheck` green. Both annotations appear in
`protein-preview.html`. Clicking each annotation triggers the focus
interaction. Labels de-collide. Intro text appears and fades correctly.

---

## Session 9 / Stage E — Atmosphere, transitions, integration (Gate 5)

> **Goal:** Fog, atmosphere, entry/exit transitions, reveal envelope all
> work. Full scroll-through from coil to protein to code is seamless.
> Gate 5 must pass.
>
> **Estimate:** 1–2 sessions.

### Prerequisites

- All prior sessions complete.

### 9.1 Atmosphere

New file:

| File | Purpose |
|------|---------|
| `src/scales/protein/protein-atmosphere.tsx` | Sparse cyan drift motes (§9.6). 50–80 instanced points with additive blending. Fainter and slower than the coil's silt. Own `opacityAt(depth)` envelope. Under reduced motion: frozen or unmounted. |

### 9.2 Fog

Verify `protein-fog.ts` (written in Stage A) produces the correct density
curve and tint blend in the live scene. The protein band's fog should be
moderate — the structure clearly visible, not fighting through haze.

### 9.3 Entry transition (chromatin → protein)

Per §10.1:

- Coil fiber opacity fades to 0 as the protein band begins.
- Protein complex resolves from haze (fog starts dense, clears with
  progress). The "resolve from haze" pattern.
- Fog color shifts from coil's warm blue toward protein's cool cyan.
- Camera transitions from coil's orbital view to protein's initial framing.

### 9.4 Exit transition (protein → code)

Per §10.2:

- Protein complex fades into fog as the code band begins.
- Fog shifts colder. Standard z-motion and opacity fade.

### 9.5 Reveal envelope

Per §10.3, ordered:

1. Ligand glow appears first (warm accent through haze)
2. Membrane disc resolves next
3. Protein ribbons resolve last
4. Annotations appear once structure is fully revealed

### 9.6 Full integration pass

- Scroll from coil band into protein band. Confirm smooth transition.
- Scroll through the full protein band. Trajectory plays. Annotations work.
- Toggle Gq/Gi mid-band. Confirm smooth morph.
- Scroll into code band. Confirm smooth exit.
- Check for: double-rendering, fog discontinuity, annotation z-fighting,
  membrane render order, focus interaction conflicts.

### 9.7 Performance audit

| Metric | Target | Check |
|--------|--------|-------|
| Draw calls (steady state) | ≤ 12 | `window.__preview` |
| Draw calls (during toggle) | ≤ 15 | `window.__preview` |
| Vertex count | ~30–50K | Renderer info |
| CPU per scroll tick | < 1ms | Performance panel |
| 60 fps sustained | Yes | Performance panel |
| Payload (gzipped) | ~3–4 MB | Network panel |

### 9.8 Fallbacks

- **Reduced motion:** Static at middle frame. No animation, no breathing,
  no toggle animation (toggle snaps instantly). No membrane ripple.
- **No-WebGL:** `ProteinContent.tsx` (document version from Phase 1) is
  visible. `.protein-doc` is `display:block`. All 3D hidden.

### Gate 5 criteria (§12)

- [ ] Scroll from coil band into protein band — receptor resolves from haze
- [ ] Chromatin→protein transition is smooth (no double-rendering, no fog discontinuity)
- [ ] Both annotations are accessible and focus interactions work
- [ ] MPro dimer is visible and heart shape is recognizable
- [ ] Links work
- [ ] Overall warm→cool gradient is continuous
- [ ] No-WebGL fallback shows document version
- [ ] Performance targets met

### Exit check

All Gate 5 criteria pass. `npm run test` + `npm run typecheck` + `npm run
build` green. Full scroll-through verified in `descent-preview.html` (the
full-site isolated harness). Session log written to `logs/`.

---

## Session map (summary)

| Session | Stage | Primary deliverable | Gate |
|---------|-------|--------------------|----|
| 1 | Pipeline | Python script for Gq + Gi processing | — |
| 2 | Pipeline | Run pipeline, validate output, commit binaries | Gate 1 |
| 3 | A | Loader, params, fog, stores, scene registration | — |
| 4 | B.1 | Ribbon geometry + materials + shaders + static render | Gate 2 |
| 5 | B.2 | Animation engine + membrane + ligand | Gate 3 |
| 6 | C | Gq/Gi toggle + dual-system morph | Gate 4 |
| 7 | D.1 | MPro static companion | — |
| 8 | D.2 | Annotations + intro + focus interactions | — |
| 9 | E | Atmosphere + transitions + integration + polish | Gate 5 |

**Estimated total: 7–10 days.** Sessions 4 (ribbon geometry) and 9
(integration) are the most likely to extend.

---

## Risk register (from design doc §14, with plan-level additions)

| Risk | Mitigation | Session affected |
|------|-----------|-----------------|
| MDAnalysis DSSP misclassifies known helices | Cross-check against RMSF region labels; override. Gate 1 catches. | 1–2 |
| Carbonyl-flip correction fails at helix-sheet boundary | Standard dot-product-flip algorithm. Iterate in pipeline. | 1–2 |
| Runtime Catmull-Rom + normal derivation too slow | Profile in Session 5. Fall back to pre-computed guides (§5.3) if > 1ms/tick. | 5 |
| Gi has 100 DCDs, not 10 — frame subsampling needed | Decision in Session 1. First 10 DCDs (Option A) is the safe default. | 1 |
| MPro dimer PDB not yet exported | MPro work (Session 7) is independent; rest of scale doesn't block on it. | 7 |
| Gβ WD40 sheet arrows don't read at scale | Simplify to flat ribbons if too small. Gβ is secondary. | 4 |
| Ribbon geometry sweep is the most novel code | Allocate Session 4 as the largest single session. Test heavily. | 4 |
| Toggle morph introduces vertex popping | Shared map morph is vertex-by-vertex; unmatched residues fade. | 6 |
