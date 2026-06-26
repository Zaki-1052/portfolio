# BioChemCore

## Program overview

BioChemCore is a research experience in which I learn the complete workflow for setting up and running molecular dynamics (MD) simulations of membrane proteins. I select a post-synaptic CNS membrane protein of my own choosing, build and simulate the system, and then assemble proteins into one large, unified post-synaptic MegaMembrane.

The goal is to get through the whole pipeline, from raw structure to analyzed trajectory, while learning the biology of the system along the way. The emphasis is on progress and curiosity over perfection: if the lipid composition is a little off or a step takes longer than expected, keep moving.

## Guiding principles

- **Keep it simple:** use one integrated tool for system preparation rather than chaining multiple specialized programs for missing loops, protonation states, and so on.
- **Stay hands-on:** problem-solve directly and build understanding by doing.
- **Biology first:** understand your protein, what it does, where it lives, why it matters, not just the simulation parameters.

## Software and tools

| Tool | Purpose |
|---|---|
| Protein Data Bank (PDB) | Finding experimental protein structures |
| Maestro (Schrödinger) | Integrated system preparation: missing loops, protonation, disulfides |
| CHARMM-GUI | Membrane builder and input file generation |
| OpenMM + CHARMM36m | MD engine and force field for minimization, equilibration, and production |
| VMD / PyMOL | Trajectory visualization and figure preparation |
| Python / MDAnalysis | Quantitative trajectory analysis (RMSD, RMSF, contacts) |

## Schedule

| Day | Phase | Key activities |
|---|---|---|
| Days 1–2 | Onboarding & Protein Selection | Read foundational literature · Choose a post-synaptic CNS membrane protein · Locate structure in the Protein Data Bank (PDB) · Discuss project goals |
| Day 3 | System Building — Maestro | Prepare protein structure in Maestro · Address missing residues, protonation states, and disulfide bonds within one tool · Export cleaned structure for membrane insertion |
| Day 4 | Membrane Setup — CHARMM-GUI | Build lipid bilayer with CHARMM-GUI Membrane Builder · Embed protein in membrane; define lipid composition · Generate input files for OpenMM (CHARMM36m force field) |
| Day 5 | Minimization & Equilibration | Energy minimization to relax initial geometry · NVT and NPT equilibration runs · Monitor RMSD, temperature, and pressure convergence |
| Day 6 | Production MD | Launch production simulation · Check trajectory visually in VMD or PyMOL · Begin collecting raw data for analysis |
| Day 7 | Analysis | RMSD / RMSF, lipid order parameters, protein-lipid contacts · Visualize results; identify interesting dynamics · Prepare individual protein snapshot for MegaMembrane assembly |
| Day 8 | MegaMembrane Assembly | Combine individual proteins into one large post-synaptic membrane · Visualize and discuss the assembled MegaMembrane |

## The MegaMembrane — Day 8 goal

The program culminates in the MegaMembrane: a single, large-scale model of a post-synaptic membrane populated with the program's membrane proteins, assembled into one unified system. Each protein, equilibrated and analyzed, is contributed to the larger model.

This finale reinforces the big-picture biology, showing how individual membrane proteins exist not in isolation but as part of a rich, crowded membrane environment.

**Assembly steps:**

- Export the final protein structure and equilibrated membrane patch
- Combine and arrange structures into a large composite bilayer
- Visualize and discuss the assembled MegaMembrane
