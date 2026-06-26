# Document 1: Session 2 log

---

## Portfolio planning: session 2 log

**Date:** June 23, 2026
**Continuity:** Follows session 1 (June 22, 2026). Session 1 established the Biological Scale Descent concept, rejected three alternatives, settled the tech stack, and identified open design questions.

### Documents reviewed this session

All project knowledge was searched and cross-referenced: the project prompt, session 1 log, repos list (GitHub profile), old portfolio copy, resume.tex, methylation paper draft, FERGUSON_LAB.md, CLAUDE.md, biochemcore-syllabus.md, MPro/Javier summary (SUMMARY.md), MetaENCODE README, LandingPage.tsx (Cleave), vmfunc-portfolio-reference.html, apps.md, and the anti-AI writing style guide.

This gave a complete picture of the project inventory, which turned out to be broader than the project prompt captured. The repos list and old portfolio revealed projects not mentioned in the prompt (GPTPortal, AO3 tools, WebReg, Crime Analysis, Yeast MSA, client websites, class notes repos, etc.).

---

### Decisions made

#### 1. Architecture: single continuous descent with FOV-focus dendrites

**Decided:** The site uses a single continuous scroll descent (one spine, all content arranged by scale). There are no branching paths.

The dendritic tree at the neuron/cellular level functions as an **interactive index**. Three major branches are labeled: epigenetics, structural biology, software. Clicking or hovering on a branch triggers a camera pivot or FOV tightening to focus on that branch, revealing Tier 1 project cards/labels for that domain. Each card can link out to GitHub, a paper, etc.

The visitor can also ignore the dendrites entirely and just keep scrolling. The dendrites are navigation, not a fork in the road.

**Why this over branching paths:** Branching would require either multiple parallel scroll tracks or a mechanism to enter/exit branches, fragmenting the core experience. The single continuous descent IS the experience. The FOV-focus model gives project-level navigation without breaking scroll continuity.

**Zara's words:** "If we do the shared descent, but then with the dendrites or whatever, clicking on that FOV focuses... I think that makes sense. That way we don't need to do the branching descent with clicking and all that, because I also don't want it to be too annoying to actually navigate."

#### 2. Content tiering

Projects are sorted into three tiers based on portfolio relevance:

**Tier 1: featured projects with dedicated visual moments in the descent.**

| Project | Domain | Scale level |
|---|---|---|
| Hi-C chromatin conformation pipeline | Epigenetics (Ferguson Lab) | Chromatin |
| DNA methylation (DUET evoC) pipeline | Epigenetics (Ferguson Lab) | Chromatin |
| 5-HT2A serotonin receptor MD | Structural biology (Amaro Lab) | Protein |
| Cleave (CUT&RUN platform) | Software | Code/terminal |
| MetaENCODE (ENCODE similarity engine) | Software | Code/terminal |
| Hi-C publication (expected fall 2026) | Publication | Chromatin |
| Methylation publication (expected fall 2026) | Publication | Chromatin |

**Tier 2: listed with title-as-link and one-line description at the code/terminal scale.**

| Project | Notes |
|---|---|
| GPTPortal | 397 stars, 68 forks. Popular but tonally different from research identity. Zara: "I don't really care about GPTPortal that much. It got popular without my say-so." |
| WebReg Auto-Enroller | Rust, async Tokio. Clever systems project. |
| AO3 History Exporter + Explorer | Browser extension + React web app combo. 10 stars on exporter. |
| Yeast MSA | Reference-guided alignment, Budin Lab. |
| MPro analysis | Amaro Lab fork, MD trajectory analysis of viral protease. May gain prominence later. |
| Crime Analysis | R data pipeline, political/incarceration data viz. |

**Tier 3: omit from portfolio.**
Class notes repos (BILD 1/3/5, PHIL 10, PHYS 87, SOCI 30, ANTH 10, CSE notes), Todo app (LLM benchmark test), Genome_Analysis and Data_Viz-R (early coursework tools), forked repos without substantial modification, Dia_Icons scraper, client websites (Forzak LLC, Naz, Mendel), flashcards app, Mothers/Fathers Day sites, and other one-off scripts.

**Note:** MPro and 5-HT2A may swap tier positions as the Amaro Lab work evolves. Zara: "I think mpro and 5-HT2A might switch eventually, but for now I'm not really working on mpro that much."

#### 3. Tier 2 spatial placement: terminal directory listing

Tier 2 projects appear at the code/terminal scale as a styled directory listing (think `ls ~/projects` or a stylized GitHub profile output). Each entry has: project title (as link), one-line description, and optionally a few tech tags. This is authentic to the terminal visual language and gives secondary projects visibility without requiring their own 3D scenes.

Zara confirmed: "I agree with the one-liner and link, if you mean their titles, like their title being the link and the one-line or the description of the project."

#### 4. Contact info: "expression" layer at the bottom of the descent

Contact info lives at the very end of the descent, after the code/sequence level, as a section themed around gene expression. The biological metaphor: information encoded at the sequence level gets transcribed and sent outward. The cell communicates to the outside world. This section contains email, GitHub, LinkedIn, socials, and any other external links.

Visual register stays in the cool/digital aesthetic from the code scale. Could be styled as a terminal prompt waiting for input, an outgoing message buffer, or similar.

Practical reasoning: contact info belongs at the bottom because visitors arrive there after seeing everything. Putting it at the hero level wastes prime real estate on links people can find anywhere.

#### 5. Light mode: ship dark-only

**Decided:** No light mode toggle.

Reason (flagged by Claude, agreed by Zara): A light mode toggle is straightforward for HTML/CSS (custom properties, body class), but the 3D scenes are a problem. Every shader uniform, fog color, post-processing parameter, and bloom threshold is tuned for dark backgrounds. Supporting light mode means maintaining a parallel set of visual parameters for every scale level, doubling the design surface. The accessible semantic HTML layer (which exists for screen readers) could theoretically have a simpler light-mode reading experience, but the 3D canvas stays dark.

Zara: "Oh, very good point. I didn't think of that... I think you're right to ship dark only."

#### 6. Depth indicator: vertical scale bar with magnification readout

**Decided:** Combine a vertical scale bar (thin line pinned to viewport edge, dots/notches at each scale level, click to jump) with a magnification readout (current scale name + magnification number, e.g., "cellular · 100x").

This serves as both "you are here" orientation and jump navigation. The scale bar is proven (Neal.fun Deep Sea, Scale of the Universe), and the magnification readout adds personality and fits the microscopy metaphor.

Zara: "I agree with combining options 1 and 2."

#### 7. Personal content: woven throughout the descent

Personal and non-research content (interests, personality, the "real person" feel) is distributed across scale levels rather than isolated in one section. The brain/hero level carries the intro and identity. The code/terminal section is where personal voice comes through most strongly (workflows, tool opinions, how Zara actually works). Other scales carry personality through the writing itself.

Zara: "When I am writing the About and various other sections, probably when I'm writing in the code section talking about my workflows and tools that I'm using and stuff, that's probably where I'd have the most of my personal copy."

---

### Confirmed from session 1 (still holds)

These decisions from session 1 were not revisited and remain in effect:

- Tech stack: Vite + React + TypeScript SPA, R3F, Lenis + GSAP ScrollTrigger, Zustand
- No Blender (procedural generation only)
- Dark mode, blue anchor, warm → cool gradient, Atom One Dark as visual home
- Evocative abstractions over anatomical accuracy
- External links for resume/publications (new tab), no embedding
- I write all copy; Claude helps with structure
- Scroll as primary navigation, jump-nav as secondary
- Accessibility: full semantic HTML layer alongside WebGL canvas
- No blog initially
- "What I'm currently working on" section will exist (placement TBD)

---

### Open items carried forward

See the "future directions" document for the full list of unresolved questions and next steps.

---
