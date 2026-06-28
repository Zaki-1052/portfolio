# Phase 1b: HTML Fallback Polish — Atmospheric CSS & Component Refinement

**Date:** 2026-06-27

## What was done

Added CSS-only atmosphere and component polish so the HTML-only fallback feels like a deliberately designed dark site with warm-to-cool descent, not just unstyled text on a flat background.

### Atmospheric backgrounds (`globals.css`)
- Per-scale `::before` pseudo-elements with radial gradient vignettes (tissue: warm gold upper-left, cellular: rose center-right, chromatin: subtle blue centered, protein: cyan lower-left, code/expression: faint horizontal scanlines)
- Section boundary gradient fades via `--bg-next` custom property per scale
- Film grain texture via SVG `feTurbulence` data URI on `::after`, intensity controlled by `--grain-opacity` per scale (warm scales get grain, code/expression get none)
- Inter-section hairline borders via `[data-scale] + [data-scale]`

### Component polish
- **ProjectCard**: Removed `glass` prop (dead code), eliminated `useState` hover in favor of CSS custom properties (`--_card-border`, `--_card-shadow`, `--_card-title`, `--_card-arrow`) driven by `.project-card:hover`
- **TerminalListing**: Eliminated `useState` hover, same CSS custom property pattern (`--_row-bg`, `--_row-name`), added green accent top-border, darker header bar, alternating row striping, locale-formatted star counts
- **Branch buttons**: Added `background: var(--accent-soft)` on hover and active, active branch heading turns accent color
- **Contact rows**: Negative-margin + padding trick for full-width highlight, accent-soft background on hover
- **Status box (tissue hero)**: Changed from full border to left-only accent border with glow shadow
- **Featured blocks (code)**: Added `featured-block` class with accent top-border and hover background
- **Publications (chromatin)**: Added `publication` class with hover border-color intensification
- **ScaleSection**: Added `position: relative; z-index: 1` to content wrapper so pseudo-elements layer behind

### CSS refinements
- Link underline transition: `text-decoration-color` fades from transparent to accent on hover
- Scroll hint: Added opacity fade to the nudge animation
- Responsive content grids: `.content-grid--asymmetric` and `.content-grid--equal` stack to 1-column on mobile
- `.featured-grid`: 2-col to 1-col below 640px

### New custom properties added to scale scopes
- `--grain-opacity`: 0.04 (tissue) → 0.03 (cellular) → 0.018 (chromatin) → 0 (protein/code/expression)
- `--bg-next`: next section's background color for boundary fade gradients

## Decisions made
- CSS custom property hover pattern over `useState`: inline styles reference `var(--_card-border, var(--hairline))`, CSS `:hover` overrides the custom property. Eliminates React re-renders for pure visual state.
- Kept inline styles for structural properties (padding, grid, flex), extracted only shared/interactive patterns to CSS classes. This avoids a full refactor while Phase 2 needs inline styles for scroll-driven changes.
- Film grain uses inline SVG data URI (no image assets). `mix-blend-mode: overlay` at 2-4% opacity.
- No `backdrop-filter: blur()`, no `transform: scale()`, no centered headers — per DESIGN.md anti-slop rules.
- Section boundary uses both a hairline border AND a gradient fade for redundancy.

## Files modified
- `src/styles/globals.css` — atmospheric backgrounds, component classes, responsive grids, micro-interactions (~120 lines added)
- `src/components/ScaleSection.tsx` — z-index on content wrapper
- `src/components/ProjectCard.tsx` — CSS-only hover, removed glass prop
- `src/scales/code/TerminalListing.tsx` — CSS-only hover, star formatting, classes
- `src/scales/code/CodeContent.tsx` — featured-grid and featured-block classes
- `src/scales/tissue/TissueContent.tsx` — left-border status box with glow
- `src/scales/chromatin/ChromatinContent.tsx` — publication class
- `src/scales/protein/ProteinContent.tsx` — content-grid class
- `src/scales/expression/ExpressionContent.tsx` — content-grid class

## Verified
- TypeScript typecheck: clean
- Production build: passes
- Desktop: all 6 sections render with atmosphere, hover states work on all interactive elements
- Mobile (375px): all grids stack, nothing overflows
- Console: only missing favicon.ico (pre-existing, not related)
