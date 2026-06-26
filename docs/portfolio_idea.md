# Portfolio Brainstorm — Session Log

**Date:** June 22, 2026  
**Who:** Zara (she/her), 20, UCSD Y2 Bioinformatics, AuADHD  
**Purpose:** Initial brainstorm for a personal portfolio site. No building yet — this is the planning/concept phase. A future session should use this document plus the attached HTML reference file (`vmfunc-portfolio-reference.html`) to continue into design and implementation.

---

## How We Got Here

Zara found [vmfunc.re](https://vmfunc.re), a personal portfolio by Celeste (vmfunc), a security researcher known for the Persona/OpenAI surveillance exposé and various reverse engineering work. The site is a fully interactive Windows 98 desktop simulation built with Astro and the 98.css framework. She downloaded the source files from the browser's dev tools (it's not on GitHub), and I reconstructed the full site into a single self-contained HTML reference file.

The key insight about why vmfunc.re works: **the interaction metaphor IS the content structure.** Blog posts are files in a directory. The start menu is real navigation. Server status appears in "Network Neighborhood." The Windows 98 aesthetic isn't decoration — it's the organizational system. Every element earns its place in the metaphor. This works because vmfunc is a security researcher who does reverse engineering, so retro computing IS their domain.

Zara's reaction: "I've never used Windows 98 because I am not old" — she has no nostalgia anchor for that specific theme, but she immediately recognized what made it cool and wanted something with that same quality of metaphor-as-structure for her own work.

---

## What Zara Does (for context)

### Ferguson Lab (UCSD Pathology, Sept 2025–present)
- **Hi-C chromatin conformation analysis**: Built a replicate-aware differential loop-calling pipeline (mariner/edgeR). Identified 2,910 dysregulated loops in BAP1-knockout mouse cerebellum. This is her first major project and will be a publication, but she joined onto a graduate student's existing Hi-C work.
- **DNA methylation (Biomodal DUET evoC)**: Built a 22-section (later 50-script) analysis pipeline for simultaneous 5mC/5hmC profiling. Found coordinated hyper-methylation / hypo-hydroxymethylation at ~6,750 gene body loci. This is more "hers" — she built the entire computational infrastructure from scratch. Also heading toward publication.
- Both projects study BAP1 loss in mouse cerebellum (Purkinje neurons, granule neurons). The overarching story: BAP1 loss causes H2AK119ub accumulation, which disrupts both 3D chromatin architecture and DNA methylation, breaking enhancer-gene connections at synaptic and developmental loci.

### Amaro Lab (UCSD, just started June 2026)
- Modeling a postsynaptic CNS membrane protein with molecular dynamics simulations
- Currently running her first trajectory
- This is computational chemistry / structural biology territory
- She finds it "a little less interesting than genetics research" right now but acknowledges she literally just started and will probably get more into it

### Major Projects
- **Cleave**: Full-stack self-hosted CUT&RUN analysis platform (React/TypeScript, FastAPI/Python, PostgreSQL, AWS). Serves ~10 lab members. 60k LoC, 500+ tests. Has a polished landing page (attached as reference for what "well-made but not me" looks like).
- **MetaENCODE**: ENCODE dataset similarity engine (SBERT embeddings, UMAP/t-SNE visualization)
- **Yeast genome regulatory network analysis** (Budin Lab, earlier work)
- She'll have two publications by fall 2026

### Overall pattern
"A lot of things are in the brain with me." Nearly all her research is neuro-adjacent: cerebellar epigenetics, synaptic gene regulation, postsynaptic membrane proteins. Even when the methods are pure computation (pipelines, statistics, ML), the biological subject is consistently the brain.

---

## Theme Options Explored

### 1. Genome Browser (IGV/UCSC-style)
- **Concept:** Portfolio modeled after a genome browser. Projects as annotation tracks on a chromosome ideogram, navigation by zoom/scroll.
- **Zara's take:** Appreciated the idea but it doesn't resonate personally. "I personally don't even really use IGV or UCSC because I'm usually in R scripts or my terminal." She literally built a KaryoPlotR script so her PI wouldn't have to use IGV. The genome browser is a wet lab researcher's tool, not hers.
- **Status: Passed.**

### 2. Chromatin Architecture / Hi-C Contact Map
- **Concept:** Portfolio as a Hi-C contact map. Bright dots are projects, the diagonal is a timeline, TADs are section boundaries.
- **Zara's take:** "I've kind of soured on Hi-C as a field. It is very niche. I don't want to keep being known for Hi-C." It was her first project but she joined an existing graduate student's work. "It doesn't feel right to me to co-opt like that." She has methylation and protein work too — doesn't want to hyperfocus on one project.
- **Status: Passed.**

### 3. Cell Journey / Biological Scale Descent ← SELECTED
- **Concept:** See full description below.
- **Zara's take:** "That actually sounds appealing to me." Agreed with the structural logic, liked that it accommodates breadth without privileging one project, liked that the metaphor is organic rather than imposed.
- **Status: Selected and refined. See next section.**

### 4. Lab Notebook (skeuomorphic)
- **Concept:** Portfolio as a physical lab notebook with sticky tabs, margin notes, taped-in gel images.
- **Zara's take:** "I don't work at a bench." Also lacks wow factor.
- **Status: Passed immediately.**

---

## The Concept: Biological Scale Descent

### Core Metaphor
The site is organized by biological magnification level. You descend through scales of biological organization, and each scale hosts a different category of portfolio content rendered in the visual language of how that scale is actually studied. The biology IS the site architecture, the way Windows 98 IS vmfunc's architecture.

### Scale Levels (working draft)

1. **Tissue scale — Brain / Cerebellum**
   - Visual: Stylized cerebellar cross-section, folded cortex shape
   - Content: About me, intro, identity
   - This is the landing / hero section

2. **Cellular scale — Purkinje Neuron**
   - Visual: Branching dendritic tree
   - Content: Project navigation. Each major branch = a research domain
   - The branches map to: **epigenetics, structural biology, software**
   - Zara noted these actually ARE separate projects/domains, so the mapping is clean

3. **Nuclear scale — Chromatin Fiber**
   - Visual: Chromatin, nucleosomes, fiber structure
   - Content: Publications, research writeups, the "regulation" layer
   - Metaphor: "Your writing IS regulation of how people understand your work"

4. **Sequence / Molecular scale — Code**
   - Visual: Shifts to terminal/code aesthetic
   - Content: Computational work, pipelines, tools, the actual implementation layer
   - "At the base level, the actual nucleotides, is where your computational work lives"

5. **Protein scale (possible intermediate level)**
   - Visual: Molecular dynamics, protein structure
   - Content: Amaro Lab work, structural biology projects
   - Sits between chromatin and sequence levels naturally

### Why This Works
- Not locked to one project (unlike Hi-C concept)
- Not a tool Zara doesn't actually use (unlike genome browser)
- Not decorative biology on a SaaS template (unlike Cleave's landing page)
- Naturally accommodates Ferguson Lab epigenetics, Amaro Lab MD simulations, software projects, and publications at appropriate scales
- The metaphor is how biology is actually organized, and Zara's work happens to span those levels
- "Everything is the brain all the way down" parallels vmfunc's "everything is hacker culture all the way down"

### Open Questions for Next Session
- How exactly do the dendritic branches (research domains) connect to specific projects? Zara flagged this needs workshopping: "We're gonna have to workshop how the branches intersect with the different projects." But also noted that epigenetics, structural biology, and software being separate projects actually makes this cleaner.
- What does the Amaro Lab section look like if the project evolves (e.g., into COVID-related work)?
- Navigation: is this purely scroll-driven, or are there click-to-jump-to-scale controls?
- How does the "you are here" depth indicator work?
- Resume/CV section — where does this live in the metaphor?
- Contact info — where does this live?
- Mobile experience — does the zoom metaphor translate to touch scrolling?

---

## Design Principles (distilled from conversation)

1. **Metaphor as structure, not decoration.** The biology should be the organizational system, not ornament on a standard layout. (Lesson from vmfunc.)
2. **Don't compromise in planning.** "I don't want to compromise when I'm just starting. We can always compromise later when we're actually building, which tends to happen." Scope cuts happen during implementation when you hit real walls, not preemptively.
3. **Wow factor matters.** Zara explicitly wants this. The lab notebook was rejected partly for lacking it.
4. **Three.js / 3D is on the table.** Zara does not consider this overkill. "I think I could probably make it work." She needs a summer project anyway and has web dev experience. Don't pre-downscale.
5. **AI-assisted development is expected.** "Claude will probably use some AI assistance." This is going to be built with heavy LLM pair-programming, so ambition is feasible.
6. **It should feel personal.** The Cleave landing page is well-made but "isn't me." Decorative SVG biology (DNA helices as dividers, peak landscapes as illustrations) reads as generic. The portfolio needs to feel like Zara, not like a biotech SaaS product.
7. **Breadth over depth.** The site should represent the full range (epigenetics, structural bio, software, publications) without privileging Hi-C or any single project.

---

## Technical Notes

- **vmfunc.re stack:** Astro (SSG with View Transitions), 98.css (third-party Win98 CSS framework), vanilla JS for interactivity, Vercel hosting. Source: reconstructed HTML reference file attached.
- **Cleave landing page stack:** React 18 + Vite, TypeScript, Tailwind CSS, react-router-dom, custom SVG components, intersection observer animations, mouse parallax. Source: `LandingPage.tsx` attached.
- **Zara's comfort zone:** R, Python, Bash, terminal-first. Has web dev experience (built Cleave, a full-stack app). TypeScript/React is familiar territory.
- **Likely stack for portfolio:** TBD. Astro is a strong candidate (static, fast, supports View Transitions). Three.js via react-three-fiber for the 3D zoom is on the table. Research needed on existing biological visualization libraries and Three.js cell/neuron assets.
- **Compute:** Has access to SDSC Expanse HPC, but portfolio hosting would be something simpler (Vercel, Netlify, GitHub Pages).

---

## Attached References
- `vmfunc-portfolio-reference.html` — Reconstructed single-file reference of vmfunc.re with all key patterns (boot sequence, tab system, taskbar, start menu, theme switcher, desktop icons). Use as a "here's what inspired this" reference, not as a template to copy.
- `LandingPage.tsx` — Cleave's landing page. Use as a reference for "well-made but not personal" — the biology is decorative, not structural.
- `FERGUSON_LAB.md` — Research background, proposal, and methods for both the Hi-C and methylation projects.
- `resume.tex` — Full CV with all projects, tools, and experience.

---

*End of session log. Next session: begin translating the biological scale descent concept into concrete wireframes, decide on tech stack, research Three.js neuron/cell visualization approaches.*
