# Phase 1c: HTML Fallback Polish

**Date:** 2026-06-27

## What was done

Visual polish pass on the HTML content layer so it works as a genuinely pretty standalone site before Phase 2's scroll engine and 3D scenes are built on top.

### Bug fixes
- Fixed branch button padding: added horizontal + bottom padding so active/hover background has breathing room
- Reduced dimmed branch opacity from 0.4 to 0.55 (legible, not broken-looking)
- Wired glass favicon: copied SVG + resized PNG (180x180) to `public/`, added link tags in `index.html`

### Atmospheric presence (globals.css)
- Boosted radial gradient intensities ~2x (tissue 0.08→0.14, cellular 0.06→0.10, chromatin 0.04→0.07, protein 0.05→0.09)
- Expanded tissue ellipse to 90% 70% for wider warm wash
- Bumped code/expression scanline visibility (0.025→0.04, 0.012→0.02)
- Bumped grain opacity: tissue 0.04→0.055, cellular 0.03→0.04, chromatin 0.018→0.022
- Added explicit `--grain-opacity` to protein (0.01), code (0), expression (0) scopes
- Widened section transition gradient fade: 85%→75% start point (25% zone instead of 15%)
- Strengthened inter-section hairline: `hairline-soft` → `hairline`

### Component visual weight
- **Hero**: 3px accent-line bottom border under name, subtitle bumped to `text-base`
- **Project cards**: darker background (`surface-deep`), 3px accent left border, softer overall border
- **Tags**: accent-tinted badges (accent-line border, text-body color, accent-soft fill) instead of ghostly outlines
- **Publications**: 2px left border, padding + negative margin for hover room, accent-soft hover background
- **Contact rows**: transparent left border at rest, accent-colored on hover with padding compensation
- **Expression closing**: short accent `<hr>`, terminal prompt `>` in accent color, bumped text size

### Token cleanup
- Added `h5 { font-size: var(--text-md); }` and `h6 { font-size: var(--text-base); }`
- Explicit grain-opacity on all scale scopes for clarity

### Content change
- Replaced "computational biology" with "bioinformatics" across all instances (TissueContent.tsx, brain.md, index.html)

## Decisions made
- Moderate atmosphere (2x, not 3x) — noticeable but not overpowering; the 3D layer will eventually provide the primary atmosphere
- Darker card background (surface-deep) instead of lighter surface-raised — creates more visible contrast on dark themes by going darker, like an inset panel
- All tags get accent treatment (not just accent-toned ones) — muted tags were invisible; accent-soft fill at 16% is subtle enough for all

## Verified
- TypeScript typecheck: clean
- Production build: passes
- Desktop (1470px): all sections render with improved atmosphere, hover states work
- Mobile (375px): all grids stack, nothing overflows, branch padding scales
- Favicon: serving from public/

## Files modified
- `src/styles/globals.css` — atmospheric gradients, grain, transitions, branch bugs, publication/contact CSS, h5/h6
- `src/components/ProjectCard.tsx` — darker bg, accent left border, tag styling
- `src/components/Tag.tsx` — accent-tinted muted tone
- `src/scales/tissue/TissueContent.tsx` — hero underline, subtitle size, bioinformatics text
- `src/scales/chromatin/ChromatinContent.tsx` — removed inline border (now in CSS class)
- `src/scales/expression/ExpressionContent.tsx` — terminal closing flourish
- `content/sections/brain.md` — bioinformatics text
- `index.html` — favicon links, bioinformatics meta description
- `public/favicon.svg` — new (copied from icons/)
- `public/favicon.png` — new (resized 180x180 from icons/)
