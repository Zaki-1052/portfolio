# Summary of Javier's thesis defense: MPro dynamics and allostery

This is a working reference for Javier's PhD defense on the SARS-CoV-2 main protease (MPro). It pulls together the biology behind the analysis repo and what the four drug conditions actually showed in simulation. Read it to get oriented before going back through the transcript, or point an AI at it when you need ground truth on the biochemistry.

Where the talk and the repo guide used different words for the same thing, I went with the talk.

The one-sentence version: dimerization stiffens MPro's global structure while the active site stays loose, and a beta sheet in domain 2 that the literature hadn't flagged carries the allosteric signal between the active site and the dimer interface. Nirmatrelvir leans on that signal, and one residue, Y126, sits at the hub.

The talk runs in three parts. Part 1 is raw dynamics: how MPro moves with each ligand bound. Part 2 connects the active site to the dimer interface through network analysis. Part 3 takes both tools and points them at one drug, nirmatrelvir.

---

## What MPro is and why anyone cares

MPro is the main protease of SARS-CoV-2, also called 3CLpro or Nsp5. When the virus infects a cell, it acts like a glorified USB stick: it injects its genetic instructions, and the cell reads them out as one long polyprotein with all the virus's non-structural pieces fused together in a single chain.

That chain is useless until it gets cut apart. MPro is the scissors. It recognizes specific sequences inside the polyprotein and cuts at 11 of them, releasing the non-structural proteins that go on to copy the genome, hijack the cell, and build more virus.

Block MPro and the virus can't assemble itself. That's why it's a drug target, and why two approved antivirals aim straight at it.

One handy quirk makes it a clean target: MPro only recognizes viral cut sites. It won't touch human proteins, because the sequences it reads don't appear in our proteome. So a drug aimed at MPro can hit the virus without wrecking our own proteases.

How it reads a cut site: MPro looks for an L-Q motif (leucine then glutamine), and the glutamine drops into a dedicated subpocket in the active site. The inhibitors are built to mimic that glutamine and slot into the same spot.

---

## The structure you need to know

One MPro chain is 306 amino acids. The functional form is a homodimer, 612 residues total, and the whole talk runs on that heart-shaped dimer.

Each chain folds into three domains:

- **Domain I** (17 to 109) and **Domain II** (110 to 175) sit side by side, and the cleft between them is the active site.
- **Domain III** (201 to 289) is an alpha-helical bundle that drives dimerization.
- The **interdomain linker** (IDL, 176 to 200) is a floppy loop connecting Domain II to Domain III.
- The **N-terminus** (1 to 16) and **C-terminus** (290 to 306) sit at the dimer interface.

The active site does the actual cutting through a **catalytic dyad**: C145 (a cysteine, the nucleophile that attacks the substrate) and H41 (a histidine that activates it). Right beside C145 sits the **oxyanion loop**, which steadies the reaction intermediate while the cut happens.

The rest of the active site is built for recognition. A long beta sheet, the interdomain loop, and the lid all help read the substrate sequence. These recognition regions are partly disordered, and that floppiness is what lets them sense different sequences and lock onto the right amino acids.

A few structural facts that pay off later:

- Catalysis jumps way up when MPro dimerizes, but a lone monomer can still cut its own N-terminus free. This self-excision works without a partner, so the monomer isn't catalytically dead.
- The fold is conserved across coronaviruses (SARS-CoV-2, SARS, MERS, NL63, and others). About 86 positions are absolutely conserved. Because evolution holds those positions fixed, they tell you what future strains will likely keep, which makes conserved residues a useful anchor for drug design.

The dimer interface itself is built from both ends of each chain plus the domain 2 beta sheets near the active site. The N-terminus of one chain reaches over and locks into the active site of the opposite chain. Both termini matter, because they do double duty: they stabilize the partner's active site, and they relay information between the active site and the dimer interface. That relay is the whole story of Part 2.

---

## The four conditions and how they were simulated

Everything compares four ligand states:

- **apo**: nothing bound. The control.
- **nirm**: nirmatrelvir, the covalent inhibitor in Paxlovid. Its nitrile group forms an actual chemical bond to C145, so it locks in permanently.
- **ens**: ensitrelvir, the non-covalent inhibitor sold as Xocova. It sits in the pocket held by intermolecular forces, no chemical bond, so it's reversible.
- **nat**: the native peptide substrate. MPro doing its normal job.

Both inhibitors carry a glutamine-like group that drops into the same subpocket the peptide uses, plus extra contacts that mimic the native interactions (like reaching toward the interdomain loop).

Each ligand was run in three oligomeric states: as a single monomer, as a symmetric dimer with both sites occupied, and as an asymmetric dimer with only one site bound. Apo has no asymmetric dimer, since there's nothing to be asymmetric about.

The simulation specs, straight from the talk: roughly 67,000 atoms per system, 1 microsecond (1,000 ns) of sampling, run in triplicate. The box held 150 mM salt, protonation states were set for pH 7.4, and the conditions were physiological (37 C, 1 atmosphere). Each run followed the standard sequence: minimize to remove clashes, heat, equilibrate at constant pressure, then production.

---

## What MD can and can't tell you

Molecular dynamics is physics applied atom by atom. You assign forces from a potential energy function, then step the system forward in tiny femtosecond increments and watch it move.

The potential energy comes from a handful of terms: bonded ones (bond stretches, atom-to-atom distances), torsional ones (angles and dihedrals), and non-bonded ones (electrostatics and Lennard-Jones). Those terms produce forces, you plug the forces into Newton's laws, and you integrate one femtosecond at a time. Stack up enough steps and you get a trajectory.

The hard limit: bonds stay fixed. MD won't break or form a bond, because that's electron behavior and lives in quantum mechanics. So it can't show you the chemistry of the cut itself.

What it does capture scales with run length. The fastest motion is hydrogen-bond vibration. Run longer and you pick up side-chain rotations, then loop disorder, then whole-domain swings. A microsecond is long enough to reach the biologically interesting motions.

Javier's framing for why any of this matters: a crystal structure is a photo of a dancer. You need the video to see the choreography. That video is the trajectory, and everything downstream is just a way of measuring the dance.

---

## Part 1: how the protein moves

This part characterizes raw dynamics, ligand by ligand, across monomer and dimer.

### RMSF, the per-residue wiggle

RMSF gives one flexibility number per residue, measured against the first frame, across all 306 beads. In the monomer, the N and C termini swing the most (the plot tapers up at both ends), and the rigid regions show up as valleys in between.

In the dimer the whole profile calms down and the signals converge, but small active-site differences survive.

The lid region tells the cleanest story:

- Nirmatrelvir (the green line) stabilizes the lid, which flops around in the apo form.
- Ensitrelvir pushes the lid out further, through a group Javier calls the "spring group" (this might be "spiro group," worth checking against the audio).
- The peptide substrate destabilizes the lid even harder than apo does.

So even when dimerization locks down the global structure, the regions that have to grab the ligand (the lid, the IDL) keep moving. The C-terminus in particular peels off its starting spot and goes to visit other parts of the protein.

### RMSF ratios: bound versus unbound

Divide each bound RMSF by its apo counterpart and you get a clean before-and-after for what binding does. The going assumption was that the peptide, being bigger, would calm the active site most. The data went the other way.

Peptide binding to the monomer destabilizes the dimer interface and domain 3. The covalent inhibitor does the reverse and freezes the protein, with less motion than apo. The non-covalent inhibitor lands in between, loosening the ends while tightening the active site.

The dimer shows the same trends, just gentler. The result worth sitting with: the covalent drug inhibits by stiffening MPro, while the natural substrate loosens it. The inhibitor and the substrate move the protein in opposite directions, which is a useful thing to know when you're trying to design something that behaves like the drug and not like the substrate.

### PCA and the domain 3 hinge

PCA squashes about 60,000 atoms of motion down to a few dominant modes, so you can actually track what the protein is doing. Compare monomer and dimer and the principal components collapse onto the same place once the protein dimerizes.

Go domain by domain and domain 3 stands out for the nirm and peptide-bound monomers. Realign everything to domain 3 and a hinging motion appears, the same one you can see in crystal structures.

This connects straight to self-excision. Dimerization-incompetent mutant structures from the literature show the identical hinge. That suggests the hinge is the mechanism: a chain swings one end into its own active site to cut itself free from the polyprotein. The hinge is specific to the peptide-bound monomer, and covalent inhibitor binding shuts it down.

### Pocket volume at the interface

When two chains meet, they leave a gap between them. Lab alumni found a cryptic pocket sitting in that gap, a cavity that could in principle hold a second drug.

Across the simulated dimers, substrate binding makes that interface pocket bigger. So binding at the active site doesn't only reshape the active site; it opens space at the dimer interface, which could create new interaction surfaces or new druggable room.

### Baseline dynamics: apo monomer versus dimer

To anchor everything, Javier ran apo monomer and apo dimer and clustered the trajectories into representative snapshots of the active site.

In the apo dimer, the termini wobble around the interface, the lid and IDL hinge, and domain 3 hinges (exaggerated in the peptide-bound monomer). The C-terminus gets stabilized by the interface but still flops out to touch other regions. The N-terminus shifts into the active site once the dimer forms.

Clustering surfaces three structural changes that come with dimerization:

1. The lid stabilizes by forming helices.
2. The IDL gets more disordered, relaxing into a loop.
3. The oxyanion loop reorganizes into a beta sheet.

That third one matters most. The oxyanion loop is disordered in monomer crystal structures, too floppy to resolve, with no secondary structure holding it. In the dimer it forms a beta sheet, and that matches experimental data, which is a real validation of the simulations.

### Part 1 takeaways

- Dimerization stabilizes MPro's global structure while the active site keeps its local dynamics.
- In the monomer, covalent inhibition freezes the active site; peptide substrate destabilizes it.
- In the dimer, the interface pocket grows on binding.
- Domain 3 hinges in the peptide-bound monomer, which ties back to self-excision.

---

## Part 2: connecting the active site to the dimer interface

Substrate binding drives dimerization, and dimerization makes the active site work better. So the two sites talk to each other. That reciprocal communication between a binding site and a distant functional site is allostery, and Part 2 is about mapping it.

### A quick history of allostery

Christian Bohr (the biochemist, father of Niels Bohr) first noticed it in hemoglobin: oxygen binding shifts with pH. That observation kicked off decades of work on how proteins relay signals internally.

The first formal model came from Monod, Wyman, and Changeux in 1965: subunits flip together between a tense and a relaxed state, all at once, in a concerted way. A year later Daniel Koshland proposed the alternative, that binding propagates one subunit at a time, sequentially.

The two models fought for 20 years. Then Cooper and Dryden showed something subtler: a protein can transmit allosteric signals through changes in its vibrational modes, with no visible change in shape. The energy landscape shifts even when the structure looks the same. That's the kind of signal MD network analysis can catch, because it reads correlated motion rather than static conformation.

### How WISP builds the networks

Treat every residue as a node. Track how the nodes move over the microsecond trajectory, then measure how strongly pairs of nearby nodes move together. Those correlations run from -1 to 1.

The trick is converting correlation into distance. Rescale the values so they run from 0 to 1, where 0 means tightly correlated and 1 means uncorrelated. That feels backwards until you realize what comes next: you want to find the shortest path through correlation space, and shortest paths need low numbers to mean "close."

With distances in hand, Dijkstra's algorithm finds the shortest path between every pair of nodes. It's the same routing logic Google Maps uses, except the map is correlation rather than physical space. Do it for all pairs and you get a weighted network. Thicker edges carry more of the coordinated motion, so they mark the routes allosteric signals actually travel.

### Apo networks: how dimerization rewires the signal

Start with the unbound states.

In the apo monomer, the strongest coordinated motion sits in the interdomain loop, just below the active site, reaching toward domain 3. In the apo dimer, that shifts: the strongest motion moves to the domain 2 and 3 nodes at the center of domain 3.

The dimer also grows interchain edges, drawn in yellow, that run from chain A to chain B. Those don't exist in the monomer. (Javier projects both chains onto one to keep the graph readable; per-chain, it's symmetric.)

The monomer's active site shows almost no correlated motion, which fits Part 1, since that region is disordered enough to grab substrate. Once the dimer forms, new networks reach across the active site, and you can finally see how allosteric information gets from the interface to the catalytic machinery.

### Bound versus apo: the oxyanion loop in monomers

Now subtract the apo baseline from each bound network. What's left are the edges unique to that ligand.

For the substrate-bound monomers, the unique active-site edges land on the oxyanion loop. The glutamine side chain anchors into its pocket, and coordinated motion runs along the loop. This holds for all three ligands, with one exception: the non-covalent (ensitrelvir) monomer adopts a dimer-like network instead.

This is the part dynamics alone would have missed. Earlier, the oxyanion loop looked quiet apart from reorganizing on dimerization. The network analysis shows it does real work stabilizing the monomer. (One fine-grained detail: in the ensitrelvir monomer, residue S113 splits, one branch heading into the domain 2 beta sheet and the other to the back of the oxyanion loop.)

### The domain 2 beta sheet (the main finding)

Do the same subtraction for the dimers and the unique active-site edges move to a beta sheet in domain 2, spanning roughly residues 110 to 130. This holds across ligands, except the covalent inhibitor, which spreads extra correlated motion around the active site.

This beta sheet hadn't been described in the literature as a layer connecting substrate binding to the dimer interface. Look closer and it's wired into everything:

- Its upper edge contacts both the N and C termini in the dimer.
- Its lower edge ties into the interdomain loop, which runs into domain 3.
- It carries the characteristic A129–B290 interchain edge.

So dimerization pulls the allosteric network out of the interdomain loop and parks it at the domain 2/3 interface, with this beta sheet acting as the hub. It routes signal through the oxyanion loop in substrate-bound monomers and through the C-terminal residues in bound dimers.

### The E290 validation

E290 shows up as the top-scoring domain 3 edge in every dimer network. That's reassuring, because E290A is a known dimerization-abolishing mutation and a standard positive control. Finding E290 at the top means the method is catching real interface physics rather than noise.

> **Transcript note.** Later, in the Y126 section, the recording has Javier calling E290 a "non-dimer-abolishing mutation." That contradicts his earlier statement that E290A "abolishes dimerization completely" and is "a control mutation." The coherent science is the earlier one: E290A abolishes dimerization, which is exactly why it works as a positive control. The "non-" is almost certainly a misspeak or mishear. Worth a relisten, but treat E290A as dimerization-abolishing.

### Part 2 takeaways

- Dimerization moves the allosteric network from the active site and interdomain loop into the domain 2/3 interface.
- The domain 2 beta sheet (110 to 130) is the central coordinator, linking both termini to the active site.
- It signals through the oxyanion loop in monomers and the C-termini in dimers.
- E290 anchors the validation.

---

## Part 3: applying it to nirmatrelvir

The last part takes both tools, dynamics and networks, and points them at one drug.

### Why nirmatrelvir

Nirmatrelvir shifts the equilibrium toward the dimer. Take an MPro that can't dimerize (truncate a domain or mutate the interface), add nirmatrelvir, and dimerization comes back. So binding at the active site somehow triggers assembly at the interface. That's an allosteric effect worth dissecting.

### Two profiles, one protein

Score each residue by how much coordinated motion it carries, and the dynamical and allosteric pictures diverge:

- **Dynamically**, the action is in the lid and the interdomain loop.
- **Allosterically**, it's in the domain 2 beta sheet, the C-terminus, and the N-terminus.

Same protein, different answer depending on which lens you use. Neither lens alone gives you the whole thing.

### The FRET assay

Collaborators at the University of Texas built an assay to test this in the wet lab. They tag two monomers with a FRET pair that lights up only when the monomers come together. So fluorescence reads out dimerization.

- Wild-type MPro: signal.
- A dimer-abolishing mutation (like E290A): no signal.
- Wild-type plus nirmatrelvir: a stronger signal, because the drug pushes toward the dimer.

This is how the domain 2 beta sheet predictions get checked. The simulations also say nirmatrelvir cuts active-site dynamics in both states (more so in the monomer), locks the C-termini and lid into the active site, and displaces the N-termini region.

### The Y126 hub

Map the unique edges for the nirmatrelvir dimer and the conserved players show up where you'd expect: C145 (catalytic) and H172 (also conserved) at the active-site edges. From there the network runs along the back of the interdomain loop through S147 and into the domain 2 beta sheet (residues like A116, A115, B125, L115).

Rank the residues unique to the nirmatrelvir dimer and filter for non-conserved ones (those are the ones you can mutate without breaking the enzyme). Most of the top 10 sit in the domain 2 beta sheet. E240 from domain 3 also appears (a different residue from E290), and E290 itself shows up as the internal control.

The standout is **Y126**. Mutate it to alanine and dimerization collapses, with the FRET signal gone. The mechanism is a domino chain: Y126's aromatic ring contacts the conserved F140 in the oxyanion loop, F140 contacts the conserved H172, and H172 helps shape the pocket for substrate binding. Knock out the aromatic ring at 126 and the whole relay breaks.

So Y126A is the experimentally validated switch for this newly described allosteric beta sheet. That's the headline result of the defense.

### Part 3 takeaways

- Nirmatrelvir favors the dimer, and you can rescue dimerization in dimer-incompetent constructs by adding it.
- Its dynamical footprint (lid, IDL) and allosteric footprint (beta sheet, termini) are different.
- The FRET assay confirms the predictions.
- Y126 is the hub, Y126A breaks it, and the Y126 to F140 to H172 chain is the proposed wiring.

---

## What it all adds up to

The defense ties structure, evolution, dynamics, allostery, and wet-lab validation into one arc. A few claims to carry forward as ground truth:

Dimerization stiffens MPro globally while keeping the active site loose enough to grab substrate. Covalent inhibitors work by freezing that motion; the natural substrate loosens the monomer. The allosteric signal between the active site and the dimer interface runs through a domain 2 beta sheet (110 to 130) that the literature hadn't characterized, and Y126 sits at its hub.

For drug design, the residues worth targeting are the non-conserved ones unique to the substrate-bound state, since the conserved ones can't be touched without killing the enzyme. The shortest-path-map approach finds things plain dynamics misses, like the oxyanion loop's real contribution to monomer stability.

The method point is its own contribution: combining dynamical and allosteric analysis says more than either alone, and the lab is building this into reusable software.

---

## Future directions and biological context

Javier made a point about studying MPro in its non-catalytic states, not only the active form. Most MPro drug work fixates on the working version. Stepping back to model the other states (different ligands, monomer and dimer) is what surfaced the beta sheet.

The clear next technical step is side-chain correlations. The current networks are built from a backbone atom that doesn't move much. Side chains carry the chemistry (aromatics, electrostatics, hydrogen bonding) and would likely sharpen the network picture.

For reference: the two inhibitors here are clinically approved. Nirmatrelvir is Paxlovid, ensitrelvir is Xocova.

---

## Residue and term cheat sheet

Quick lookup for the recurring players.

| Item | Where | What it does |
|------|-------|--------------|
| **C145** | active site, conserved | Catalytic cysteine, the nucleophile. Nirmatrelvir bonds here. |
| **H41** | active site, conserved | Catalytic histidine, activates C145. Together they're the catalytic dyad. |
| **Oxyanion loop** | ~140 to 144 | Steadies the reaction intermediate. Disordered in the monomer, forms a beta sheet in the dimer. |
| **Domain 2 beta sheet** | 110 to 130 | The main finding. New allosteric mediator between active site and dimer interface. |
| **Y126** | domain 2 beta sheet | The allosteric hub. Y126A abolishes dimerization. Aromatic ring feeds F140. |
| **F140** | oxyanion loop, conserved | Receives Y126's aromatic contact, passes it to H172. |
| **H172** | active site, conserved | Shapes the substrate pocket. End of the Y126 to F140 to H172 chain. |
| **E290 / E290A** | domain 3, C-term edge | Top domain 3 edge in dimer networks. E290A abolishes dimerization (standard positive control). |
| **A129–B290 edge** | interchain | Signature interchain contact of the dimer network. |
| **E240** | domain 3 | Non-conserved residue in the nirmatrelvir top 10. Distinct from E290. |
| **S147** | back of IDL | Links the active-site network into the domain 2 beta sheet. |
| **S113** | oxyanion loop region | In the ensitrelvir monomer, splits toward the beta sheet and the back of the loop. |

Domains, for orientation:

| Region | Residues | Role |
|--------|----------|------|
| N-terminus | 1 to 16 | Dimer interface; locks into the partner's active site |
| Domain I | 17 to 109 | Half the active-site cleft |
| Domain II | 110 to 175 | Other half; catalytic residues, substrate pockets, the allosteric beta sheet |
| IDL | 176 to 200 | Flexible linker, substrate recognition |
| Domain III | 201 to 289 | Alpha-helical, drives dimerization |
| C-terminus | 290 to 306 | Dimer interface |

Ligand codes: `apo` (unbound control), `nirm` (nirmatrelvir, covalent, Paxlovid), `ens` (ensitrelvir, non-covalent, Xocova), `nat` (native peptide substrate).

---

## Q&A recap

Four questions followed the talk.

**1. The cryptic pocket and the correlated motions.** Do the pocket-volume changes at the interface show up in the network? Not yet connected. The next step is overlaying the interface pocket volume onto the networks. Javier described the interface as two sets of secondary structures twisting around each other, with the termini locking into the active site and that beta sheet wrapping the N-terminus. How the pocket volume specifically tracks the correlated motion is still open.

**2. E290A rescue and MERS.** The covalent inhibitor still can't rescue dimerization in the E290A background. On MERS: he hasn't done a specific comparison, but MERS sits in the alignment at roughly the same size.

**3. Slide 34, the yellow paths.** The yellow traces the top 10 unique networks for the nirmatrelvir dimer. Dotting the residues along the path shows them falling from domain 3 down into domain 2.

**4. Glycosylation.** MPro itself isn't glycosylated, so the question doesn't bite here. But the same network approach is being applied to the spike protein, which is heavily glycosylated. Carla (a postdoc) and others are working on the glycan networks and how they interact with spike, including the glycosylation sites.
