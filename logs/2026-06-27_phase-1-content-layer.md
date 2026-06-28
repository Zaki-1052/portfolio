# Phase 1: HTML Content Layer & Content Pipeline

**Date:** 2026-06-27

## What was done

Built the complete semantic HTML structure for all 6 biological scales, content pipeline, and navigation. The portfolio is now fully navigable without 3D or scroll animation.

### CSS additions (`src/styles/globals.css`)
- Element defaults: h1-h6 heading inheritance, paragraph, link, code, selection, hr
- `.prose` class with scale-aware rhythm (warm scales breathe, code scales tighten)
- `.eyebrow`, `.visually-hidden` utility classes
- Component patterns: `.branches` grid, `.branch` buttons, `.contact-row`, `.scroll-hint`

### Content pipeline (3 files)
- `src/content/types.ts` — TypeScript interfaces for Project, Tier2Project, Publication, ContactLink, Status, ParsedSection
- `src/content/loader.ts` — import.meta.glob for markdown, JSON imports, frontmatter parser (no external dependency)
- `src/content/markdown.tsx` — react-markdown + remark-gfm renderer with external link handling

### Content files (10 files)
- `content/projects.json` — 5 Tier 1 + 6 Tier 2 projects (real metadata, lorem descriptions)
- `content/publications.json` — 2 publications (real titles, in-preparation status)
- `content/links.json` — email, GitHub, LinkedIn, Bluesky, resume
- `content/status.json` — current work status
- 6 markdown files in `content/sections/` (real frontmatter, lorem body)

### Core components (4 files)
- `ScaleSection` — data-scale wrapper, eyebrow label, kicker, title, full/align props
- `ProjectCard` — hover-lift border, tags, external link arrow (no transform:scale)
- `Tag` — mono pill with muted/accent tones
- `TerminalListing` — ls -la directory with syntax colors, 3-column grid, hover highlight

### Per-scale content (6 files)
- `TissueContent` — hero with serif h1, "currently" box, scroll hint
- `CellularContent` — 3 branch buttons with focus toggle, filtered ProjectCards
- `ChromatinContent` — publication articles with left-accent border
- `ProteinContent` — 2-column grid with status aside (key-value rows + tags)
- `CodeContent` — featured `$ cat` blocks + TerminalListing for Tier 2
- `ExpressionContent` — 2-column with contact-row key-value nav

### Navigation
- `DepthIndicator` — fixed right-edge nav, IntersectionObserver detection, click-to-jump

### App shell
- `app.tsx` refactored to import all content components, Canvas gets aria-hidden
- `tsconfig.app.json` — added resolveJsonModule, included content/ directory

## Decisions made
- Strict lorem ipsum for all body text (user confirmed over reference prototype content)
- Simple frontmatter parser instead of gray-matter dependency
- JSON imports use relative paths (../../content/) for TypeScript resolution compatibility
- Publication.links typed as `string | null` to match JSON null values
- DepthIndicator uses IntersectionObserver (Phase 2 replaces with depth store)
- All components ported from reference JSX with CSS custom properties throughout

## Open items
- Phase 2: Lenis + GSAP ScrollTrigger → depth store wiring
- Phase 2: CSS property animation during scale transitions
- Phase 2: DepthIndicator upgrade to depth-store-driven
- Accessibility audit (VoiceOver, Lighthouse) not formally run yet
- URL fragment sync not yet implemented (Phase 2)

## Key file paths
- `src/styles/globals.css` — modified (element defaults, prose, component CSS)
- `src/app.tsx` — rewritten
- `src/content/` — types.ts, loader.ts, markdown.tsx
- `src/components/` — ScaleSection.tsx, ProjectCard.tsx, Tag.tsx, DepthIndicator.tsx
- `src/scales/*/` — TissueContent, CellularContent, ChromatinContent, ProteinContent, CodeContent, ExpressionContent
- `src/scales/code/TerminalListing.tsx`
- `content/` — projects.json, publications.json, links.json, status.json, sections/*.md
- `tsconfig.app.json` — modified
