# Phase 1c: HTML Polish & Visual Elevation

**Date:** 2026-06-27 → 2026-06-28

## What was done

Elevated the HTML fallback layer from functional dark site to deliberately designed portfolio. Quality bar: TerminalListing and contact-row components — everything else brought up to match. Then added content corrections, terminal listing annotations, toolkit dropdown with holographic popup blurbs, and favicon/icon integration.

### Spacing & layout fixes
- **Branch buttons**: Added horizontal + bottom padding (`var(--space-4) var(--space-4) var(--space-3)`), `border-radius: var(--radius-sharp)`. Accent-soft background no longer touches text edges.
- **Chromatin publications**: Added padding on all sides (`var(--space-4)` top/right/bottom, `var(--space-5)` left) so hover background has breathing room. Added `border-radius: var(--radius-sharp)`.
- **Branch h4 margin**: `4px` → `var(--space-1)`
- **Scroll hint gap**: `8px` → `var(--space-2)`

### Hover state upgrades (`globals.css`)
- **Terminal rows**: hover bg opacity 0.08 → 0.12, alternating stripe 0.015 → 0.025
- **Publications**: added `background: var(--accent-soft)` + `box-shadow: inset 2px 0 8px -4px var(--accent)` on hover
- **Featured blocks**: added `border-top-color: var(--accent)` + `box-shadow: var(--shadow-sm)` on hover
- **Project cards**: arrow starting opacity 0 → 0.3, added `:focus-within` state
- **Branch buttons**: differentiated hover-not-active (subtle bg) from active (accent-soft)

### Depth indicator redesign (`DepthIndicator.tsx` + `globals.css`)
- Moved from all-inline-styles to CSS class system (`.depth-indicator__*`)
- Replaced hardcoded pixel values with CSS custom properties
- Added hover state: dots brighten + grow (5px → 7px) on hover
- Focus-visible ring inherited from global `:focus-visible`

### Viewport-triggered content reveal
- New `src/hooks/useReveal.ts`: shared IntersectionObserver (threshold 0.15), adds `.revealed` class
- CSS: `.reveal` starts at `opacity: 0; transform: translateY(12px)`, transitions to visible
- Respects `prefers-reduced-motion` (instant, no animation)
- Applied to: project cards (cellular), publications (chromatin), featured grid + terminal listing (code), contact links (expression)

### Favicon & meta
- Copied `icons/z_dendrite_glass_favicon.svg` to `public/favicon.svg`
- Added `<link rel="icon">` and `<meta name="theme-color">` to `index.html`
- Glass dendrite-Z icon also placed in expression section (absolute-positioned, 60px, 0.4 opacity near heading)

### Hardcoded value cleanup
- TerminalListing: row padding `5px 16px` → `var(--space-1) var(--space-4)`, line-height `1.7` → `var(--leading-relaxed)`, header bar `10px 16px` → `var(--space-2) var(--space-4)`, darkened header bg to 0.2
- ProjectCard/Tag: tag padding `4px 8px` → `var(--space-1) var(--space-2)`, arrow marginLeft `8` → `var(--space-2)`
- TerminalListing ul padding `6px 0` → `var(--space-1) 0`

### Content corrections
- "computational biology" → "bioinformatics" (TissueContent fallback, brain.md frontmatter, index.html meta)
- "postsynaptic membrane protein" → "post-synaptic CNS membrane protein" (ProteinContent status, status.json, projects.json)
- GROMACS → AMBER (ProteinContent tag, projects.json)
- GPTPortal stars 397 → 400
- MPro promoted from tier2 to tier1 under structural biology branch (each branch now has 2 projects)
- Footer: `zalibhai.com` → terminal-styled `~/zalibhai.com` linking to GitHub repo

### Terminal listing enhancements
- Added `metric` field to `Tier2Project` type and `TerminalRow` interface for non-star annotations
- AO3-Explorer: `◇ 150 MAU` metric
- YeastMSA: `Itay-Budin Lab` annotation
- Crime-Analysis: `R` annotation
- WebReg: `Rust` annotation, moved to bottom of tier2 list

### Toolkit dropdown + holographic popup
- New `content/toolkit.json`: 4 categories (languages, bioinfo, web, workflow) with values and optional blurbs
- `getToolkit()` added to content loader with `ToolkitEntry` interface
- `<details>` dropdown styled as `$ cat ~/.toolkit` in terminal register
- Each category key with a `blurb` shows `?` indicator and is clickable
- Click triggers a centered holographic popup (`holo-overlay` + `holo-popup`):
  - Backdrop blur + dark overlay
  - Blue scan-line texture background (`repeating-linear-gradient` at 4px intervals)
  - Blue accent border with outer + inner glow (`box-shadow`)
  - Category header + blurb body in blue tones
  - `esc` close button, click-outside-to-dismiss
  - Fade-in animation, reduced-motion safe
- Blurb content currently lorem ipsum — to be written by Zara

### Housekeeping
- Added `.playwright-mcp/` to `.gitignore`

## Decisions made
- Reveal animations use a shared IntersectionObserver instance (one observer for all elements, ref-counted cleanup)
- Publication padding uses asymmetric values (more on left for border-left visual weight)
- Branch hover-not-active uses `rgba(255,255,255,0.03)` instead of `accent-soft` to differentiate from active state
- Depth indicator CSS uses BEM-style naming (`depth-indicator__dot`, `depth-indicator__btn`) to avoid class collisions
- Holographic popup uses blue (`--aod-blue`) regardless of current scale accent — it's a UI element, not scale-themed
- Toolkit content extracted to JSON for editability; blurbs are optional per-entry
- Terminal listing `metric` field is a plain string displayed in the stars column — flexible for any annotation format

## Open items
- Phase 2: Lenis + GSAP ScrollTrigger → depth store wiring (reveal animations will be superseded by scroll-driven animations)
- Phase 2: DepthIndicator upgrade to depth-store-driven (currently IntersectionObserver)
- Phase 2: CSS property animation during scale transitions
- Accessibility audit with reveal animations active (VoiceOver, Lighthouse) not formally run
- Toolkit blurbs need real content written by Zara
- Holographic popup could support keyboard dismiss (Escape key) — not yet wired

## Key file paths
- `src/styles/globals.css` — branch padding, hover upgrades, reveal CSS, depth indicator classes, toolkit CSS, holographic popup CSS
- `src/components/DepthIndicator.tsx` — rewritten with CSS classes
- `src/hooks/useReveal.ts` — new IntersectionObserver reveal hook
- `src/components/ProjectCard.tsx` — arrow opacity, tag padding
- `src/components/Tag.tsx` — padding cleanup
- `src/scales/code/TerminalListing.tsx` — hardcoded values replaced, `metric` field added
- `src/scales/code/CodeContent.tsx` — reveal on featured grid + terminal, passes metric
- `src/scales/cellular/CellularContent.tsx` — reveal applied to cards
- `src/scales/chromatin/ChromatinContent.tsx` — reveal + publication padding
- `src/scales/expression/ExpressionContent.tsx` — toolkit dropdown, holographic popup, icon, reveal on contacts, footer restyled
- `src/scales/protein/ProteinContent.tsx` — AMBER, CNS corrections
- `src/content/types.ts` — `metric` field on Tier2Project
- `src/content/loader.ts` — `getToolkit()`, `ToolkitEntry` interface
- `content/projects.json` — MPro promoted, stars, metrics, title corrections, reordered
- `content/toolkit.json` — new, toolkit categories + blurbs
- `content/status.json` — CNS membrane protein
- `content/sections/brain.md` — bioinformatics
- `index.html` — favicon, theme-color, bioinformatics meta
- `public/favicon.svg` — glass dendrite-Z favicon
- `.gitignore` — added `.playwright-mcp/`
