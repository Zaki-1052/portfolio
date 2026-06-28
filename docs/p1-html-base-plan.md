# Phase 1: HTML Content Layer & Content Pipeline

## Context

Phase 0 produced a running Vite dev server with an empty Canvas behind 6 scrollable colored sections, all CSS design tokens, self-hosted fonts, Zustand depth store, and passing CI. Phase 1 builds the complete semantic HTML structure — the accessibility foundation. After this phase, the entire portfolio is navigable without any 3D or scroll animation: screen readers, keyboard users, search engines, and broken GPUs all get the full content.

The reference prototype in `reference/ui_kits/portfolio/` has working JSX screens for every scale. These inform layout and component patterns, but all body text uses strict lorem ipsum — real titles, links, tags, and metadata only.

---

## Implementation Order

### Step 1: CSS Foundation — element defaults + prose class

**Why first:** Every content component depends on heading inheritance, link styling, and the `.prose` class for markdown rendering.

**File:** `src/styles/globals.css` — append after the existing base styles (line ~290)

**Add from `reference/tokens/base.css`:**
- Heading defaults: `h1`–`h6` inherit `--font-heading`, use `--text-strong`, `--weight-semibold`, `--leading-tight`, `--tracking-tight`, `text-wrap: balance`; sizes `h1: --text-3xl`, `h2: --text-2xl`, `h3: --text-xl`, `h4: --text-lg`
- Paragraph: `p { margin: 0 0 var(--space-4); }`
- Links: `a` with `color: var(--accent)`, underline-offset, hover underline
- Code elements: `code, pre, kbd, samp` use `--font-mono`
- `::selection` with `--accent-soft` background
- `hr` with `--border-soft`

**Add `.prose` class:**
```css
.prose { max-width: var(--measure); color: var(--text-body); font-size: var(--text-md); line-height: var(--leading-relaxed); }
.prose > * + * { margin-top: var(--space-4); }
.prose strong { color: var(--text-strong); font-weight: var(--weight-semibold); }
[data-scale="code"] .prose, [data-scale="expression"] .prose {
  font-size: var(--text-base); line-height: var(--leading-normal); max-width: var(--measure-wide);
}
```

**Add `.eyebrow` class** (scale label micro-text):
```css
.eyebrow { font-family: var(--font-sans); font-size: var(--text-2xs); letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--text-muted); }
```

**Add `.visually-hidden`** utility for screen-reader-only text.

**Add component-specific classes** from `reference/ui_kits/portfolio/kit.css`:
- `.branches` grid (3-col, responsive to 1-col under 760px)
- `.branch` button (top-border accent, `[aria-pressed]` state, `[data-dim]` opacity)
- `.contact-links` / `.contact-row` (flex key-value rows with hover)
- `.scroll-hint` (animated arrow nudge, respects `prefers-reduced-motion`)

---

### Step 2: Content Type Definitions

**File:** `src/content/types.ts`

Define TypeScript interfaces enforcing content schemas:

```typescript
export interface Project {
  id: string;
  title: string;
  domain?: string;
  branch?: 'epigenetics' | 'structural' | 'software';
  oneLiner: string;
  tags: string[];
  links: { github?: string; paper?: string };
  scale?: ScaleName;
}

export interface Tier2Project {
  id: string;
  title: string;
  oneLiner: string;
  stars?: number;
  tags?: string[];
  links: { github: string };
}

export interface Publication {
  id: string;
  title: string;
  year: number;
  status: 'published' | 'in preparation' | 'submitted';
  venue: string;
  description: string;
  links: { preprint?: string; paper?: string };
}

export interface ContactLink {
  name: string;
  url: string;
  display: string;
}

export interface Status {
  status: string;
  updatedAt: string;
}

export interface SectionFrontmatter {
  scale: ScaleName;
  title: string;
  subtitle?: string;
  description?: string;
}
```

Import `ScaleName` from `@/stores/depth`.

---

### Step 3: Content Files (at project root)

**JSON files** — use real metadata, lorem ipsum for description fields:

**`content/projects.json`:**
- `tier1` array: 5 projects with real `id`, `title`, `branch`, `tags`, `links`, `scale`; `oneLiner` is lorem ipsum
  - Hi-C pipeline (branch: epigenetics, scale: chromatin)
  - DNA methylation pipeline (branch: epigenetics, scale: chromatin)
  - 5-HT2A MD (branch: structural, scale: protein)
  - Cleave (branch: software, scale: code)
  - MetaENCODE (branch: software, scale: code)
- `tier2` array: 6 projects with real `id`, `title`, `stars`, `links.github`; `oneLiner` is lorem ipsum
  - GPTPortal (stars: 397), WebReg, AO3-Explorer, YeastMSA, MPro-Analysis, Crime-Analysis

Real GitHub URLs from docs/repos.md and reference prototype:
- `https://github.com/Zaki-1052/mariner_hi-c`
- `https://github.com/Zaki-1052/cleave`
- `https://github.com/Zaki-1052/MetaEncode`
- `https://github.com/Zaki-1052/GPTPortal`
- `https://github.com/Zaki-1052/WebReg-Auto-Enroller`
- `https://github.com/Zaki-1052/AO3-History-Explorer`
- `https://github.com/Zaki-1052/Yeast_MSA`
- `https://github.com/Zaki-1052/Crime_Analysis`

**`content/publications.json`:**
- 2 publications, real titles and status ("in preparation"), lorem descriptions

**`content/links.json`:**
- Real contact info: email (`zalibhai@ucsd.edu`), GitHub, LinkedIn, Bluesky, resume placeholder

**`content/status.json`:**
- Real status line (from reference: "molecular dynamics of a postsynaptic membrane protein at the Amaro Lab")

**Markdown files** (`content/sections/`):
- `brain.md` — frontmatter: `scale: tissue, title: Zara Alibhai, subtitle: computational biology @ UCSD`; body: lorem ipsum (3 paragraphs)
- `cellular.md` — frontmatter: `scale: cellular, title: Three branches of one tree`; body: lorem ipsum
- `chromatin.md` — frontmatter: `scale: chromatin, title: Chromatin & Regulation`; body: lorem ipsum
- `protein.md` — frontmatter: `scale: protein, title: Down to the molecule`; body: lorem ipsum
- `code.md` — frontmatter: `scale: code, title: ~/projects`; body: lorem ipsum
- `expression.md` — frontmatter: `scale: expression, title: $ whoami --contact`; body: lorem ipsum

---

### Step 4: Content Pipeline

**`src/content/loader.ts`:**
- `import.meta.glob('/content/sections/*.md', { eager: true, query: '?raw', import: 'default' })` for markdown
- Direct imports for JSON: `import projectsData from '/content/projects.json'`
- Export typed accessors: `getProjects()`, `getPublications()`, `getLinks()`, `getStatus()`, `getSection(scale)`
- Simple frontmatter parser: split on `---` delimiters, parse YAML key-value pairs (no external dependency — our frontmatter is flat key-value only)

**`src/content/markdown.tsx`:**
- Named export `MarkdownRenderer` component
- Props: `content: string` (raw markdown body, frontmatter already stripped)
- Uses `react-markdown` with `remark-gfm`
- Wraps output in a `div` with `className="prose"`
- Links get `target="_blank"` and `rel="noopener noreferrer"` for external URLs

---

### Step 5: Core Reusable Components

Port from reference prototype JSX → TypeScript React components. All use CSS custom properties (never hardcoded hex). Named exports only.

**`src/components/ScaleSection.tsx`:**
- Port from `reference/components/portfolio/ScaleSection.jsx`
- Props: `scale: ScaleName`, `magnification?: string`, `title?: string`, `kicker?: string`, `children`, `full?: boolean` (100vh), `align?: 'left' | 'center'`, `className?: string`, `id?: string`
- Sets `data-scale={scale}` on `<section>` element
- Renders eyebrow (accent dot + scale name + magnification) when `scale` is provided
- Content wrapper with `maxWidth: min(1080px, 100%)`, alignment from `align` prop
- `id` defaults to `scale` for URL fragment navigation

**`src/components/ProjectCard.tsx`:**
- Port from `reference/components/portfolio/ProjectCard.jsx`
- Props: `title`, `href?`, `description?`, `tags?: string[]`, `meta?: string`, `glass?: boolean`
- Hover: border lifts to `--accent-line`, title color to `--accent`, arrow fades in — NO `transform: scale` (anti-slop)
- Tags rendered as inline mono pills with hairline border

**`src/components/Tag.tsx`:**
- Port from `reference/components/core/Tag.jsx`
- Props: `children`, `tone?: 'muted' | 'accent'`
- Mono font, small, pill-shaped

**`src/scales/code/TerminalListing.tsx`:**
- Port from `reference/components/portfolio/TerminalListing.jsx`
- Props: `cwd?: string` (default `~/projects`), `items: TerminalRow[]`
- `TerminalRow`: `{ name, description, stars?, href?, perms? }`
- 3-column grid: permissions, name+description, star count
- Hover: faint green background (`rgba(152,195,121,0.08)`)
- Square corners always, no card chrome

---

### Step 6: Per-Scale Content Components

Each component renders inside `<ScaleSection>`. Layout patterns follow the reference UI kits.

**`src/scales/tissue/TissueContent.tsx`:**
- Hero layout (left-aligned, asymmetric — NOT centered)
- Kicker: "computational biology @ UCSD" (accent color)
- `<h1>` with name (Lora serif, `--text-5xl`, max 12ch)
- `.prose` div with lorem ipsum paragraphs
- "Currently" box: mono label + status line from `content/status.json`
- Scroll hint: "descend ↓" with subtle animation
- ScaleSection with `full` (100vh), `scale="tissue"`, `magnification="1×"`

**`src/scales/cellular/CellularContent.tsx`:**
- Dendrite index as flat HTML (non-interactive fallback for Phase 4's FOV-focus)
- 3 branch buttons in a grid (`.branches` class): epigenetics, structural biology, software
- Click toggles focus state: pressed branch highlighted, others dim (`opacity: 0.4`)
- Below: `ProjectCard` components for the focused branch's Tier 1 projects
- Data loaded from `content/projects.json`, filtered by `branch`
- ScaleSection with `scale="cellular"`, `magnification="100×"`, `title="Three branches of one tree"`, `kicker="pick a branch"`

**`src/scales/chromatin/ChromatinContent.tsx`:**
- Publications with left-accent border layout (from `ChromatinPublications.jsx`)
- Intro prose from `content/sections/chromatin.md`
- Publication articles: left border in `--accent-line`, mono status label, title (`<h3>`), lorem description, venue
- Data from `content/publications.json`
- ScaleSection with `scale="chromatin"`, `magnification="10,000×"`, `kicker="the regulation layer"`

**`src/scales/protein/ProteinContent.tsx`:**
- 2-column grid: prose (left, wider) + status aside (right)
- Prose from `content/sections/protein.md`
- Aside: hairline border, `--surface-raised` bg, key-value rows (system, lab, state, compute), tags at bottom
- ScaleSection with `scale="protein"`, `magnification="1,000,000×"`, `kicker="structural biology, lately"`

**`src/scales/code/CodeContent.tsx`:**
- Intro prose from `content/sections/code.md`
- Featured Tier 1 software: 2-column grid, terminal-style cards (`$ cat name/README.md` + description)
- Below: `<TerminalListing>` with Tier 2 projects from `content/projects.json`
- Data: Tier 1 filtered by `scale === 'code'`, Tier 2 from `tier2` array
- ScaleSection with `scale="code"`, `kicker="the sequence level"`

**`src/scales/expression/ExpressionContent.tsx`:**
- 2-column grid: prose (left) + contact links (right)
- Prose from `content/sections/expression.md`
- Contact nav: `.contact-links` / `.contact-row` (key-value, mono, hover accent)
- Data from `content/links.json`
- Footer: tagline in mono, faint color
- ScaleSection with `scale="expression"`, `kicker="surface, again"`, `title="$ whoami --contact"`

---

### Step 7: App Shell Refactor

**`src/app.tsx`:**
- Remove the inline `ScaleSection` component (it moves to `src/components/ScaleSection.tsx`)
- Remove the `SCALE_LABELS` constant
- Import each per-scale content component
- Render: `<Canvas>` (unchanged) + `<main>` wrapping the 6 content components in order
- Canvas keeps `aria-hidden="true"` (add if not present)

```tsx
export function App() {
  return (
    <>
      <Canvas ... aria-hidden="true">...</Canvas>
      <main>
        <TissueContent />
        <CellularContent />
        <ChromatinContent />
        <ProteinContent />
        <CodeContent />
        <ExpressionContent />
      </main>
      <DepthIndicator />
    </>
  );
}
```

---

### Step 8: Depth Indicator (Static)

**`src/components/DepthIndicator.tsx`:**
- Port from `reference/components/portfolio/DepthIndicator.jsx`
- Fixed position, right edge, vertical center
- Thin 1px track line with dots at each scale boundary
- Active dot: larger (9px vs 5px), accent color, glow shadow
- Active label: scale name + magnification, positioned left of dots
- Click: `scrollIntoView({ behavior: 'smooth' })` to that section
- **Phase 1 detection**: Use `IntersectionObserver` to detect which section is in view (not wired to depth store — that's Phase 2)
- `<nav aria-label="Scale depth">` for accessibility
- Dots are `<button>` elements with `aria-current` on active
- Scale data: array of `{ id, name, magnification }` matching the 6 scales

Scale magnifications: tissue 1×, cellular 100×, chromatin 10,000×, protein 1,000,000×, code (no mag), expression (no mag)

---

### Step 9: Verification

**Automated:**
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run build` — succeeds

**Browser:**
- All 6 sections render with correct typography (Lora → Inter → Fira Code)
- Colors shift warm-to-cool across sections
- Project cards display with correct data
- Terminal listing renders with syntax colors and hover
- Dendrite branch buttons toggle focus state
- Contact links are clickable (mailto:, GitHub, LinkedIn, etc.)
- DepthIndicator shows 6 dots, clicking jumps to correct section

**Accessibility:**
- `#tissue`, `#cellular`, etc. URL fragments work
- Tab through all interactive elements (branch buttons, project links, contact links, depth indicator dots)
- VoiceOver: heading hierarchy correct (h1 > h2 > h3), all content readable
- Canvas has `aria-hidden="true"`
- Focus indicators visible (accent-colored ring)
- All text meets WCAG AA contrast (already verified in token system)

---

## Files Created/Modified (complete list)

**Modified:**
- `src/styles/globals.css` — add element defaults, prose class, component classes
- `src/app.tsx` — refactor to use new components

**New source files (15):**
- `src/content/types.ts`
- `src/content/loader.ts`
- `src/content/markdown.tsx`
- `src/components/ScaleSection.tsx`
- `src/components/ProjectCard.tsx`
- `src/components/Tag.tsx`
- `src/components/DepthIndicator.tsx`
- `src/scales/tissue/TissueContent.tsx`
- `src/scales/cellular/CellularContent.tsx`
- `src/scales/chromatin/ChromatinContent.tsx`
- `src/scales/protein/ProteinContent.tsx`
- `src/scales/code/CodeContent.tsx`
- `src/scales/code/TerminalListing.tsx`
- `src/scales/expression/ExpressionContent.tsx`

**New content files (10):**
- `content/projects.json`
- `content/publications.json`
- `content/links.json`
- `content/status.json`
- `content/sections/brain.md`
- `content/sections/cellular.md`
- `content/sections/chromatin.md`
- `content/sections/protein.md`
- `content/sections/code.md`
- `content/sections/expression.md`

**Removed:**
- `content/sections/.gitkeep` (replaced by actual content files)

---

## Key Reuse Points

| Existing asset | How it's reused |
|---|---|
| `src/stores/depth.ts` — `ScaleName`, `SCALES` types | Imported by types.ts, ScaleSection, DepthIndicator |
| `src/styles/globals.css` — all CSS custom properties | Components reference `var(--accent)`, `var(--bg)`, etc. — never hardcode |
| `reference/components/portfolio/*.jsx` | Ported to TypeScript as core components |
| `reference/ui_kits/portfolio/*.jsx` | Layout patterns for per-scale content components |
| `reference/ui_kits/portfolio/kit.css` | CSS classes for branches, contact rows, scroll hint |
| `reference/tokens/base.css` | Element defaults and prose class added to globals.css |
