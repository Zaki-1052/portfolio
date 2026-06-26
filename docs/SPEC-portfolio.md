
---

# SPEC.md

---

# Biological Scale Descent Portfolio: technical specification

> **Status:** Living document. Reflects planning decisions through session 3.
> **Last updated:** 2026-06-24
> **Author:** Zara Alibhai
> **Domain:** zalibhai.com

A scroll-driven portfolio that descends through biological scales of organization (tissue, cell, chromatin, protein, code, expression), where each scale hosts portfolio content rendered in that scale's visual language. One continuous spine, no branching paths. Built with React Three Fiber, GSAP ScrollTrigger, and Lenis. Dark mode only.

---

## 1. Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Vite 6 + React 19 + TypeScript | SPA. Evaluate Astro wrapper later if needed. |
| 3D | three.js, @react-three/fiber@9, @react-three/drei, @react-three/postprocessing | One persistent full-viewport `<Canvas>`. Pin postprocessing versions. |
| Scroll | lenis, gsap (ScrollTrigger) | Lenis drives GSAP ticker. ScrollTrigger maps scroll to depth. |
| State | zustand | Global `depth` store (0 to 1), current scale, UI state. |
| CSS | Tailwind CSS 4 + CSS custom properties | Tailwind for layout utilities. Custom properties for scroll-driven theming. |
| Fonts | Lora (serif), Inter (sans), Fira Code (mono) | Google Fonts, variable where available. `font-display: swap`. |
| Content | Markdown (prose) + JSON (structured data) | Build-time import via Vite. See content pipeline section. |
| Dev tooling | Theatre.js (@theatre/r3f) | Dev-only camera keyframe editor. Excluded from production bundle. |
| Linting | ESLint, Prettier | Enforced via Git hooks (lint-staged + husky) and CI. |
| Build checks | TypeScript (strict), `tsc --noEmit` | CI runs lint + typecheck + build. |
| Analytics | Stubbed hooks, provider TBD | `useTrackEvent(name, data)` hook wired to no-op initially. |
| Deployment | Cloudflare Pages or GitHub Pages | Static output + CDN. Auto-deploy on push to main. |

### Dev dependencies (not shipped to production)

| Package | Purpose |
|---|---|
| @theatre/studio, @theatre/r3f | Visual camera path authoring |
| leva | Runtime GUI for tweaking shader/scene parameters |
| r3f-perf | Performance HUD (draw calls, FPS, memory) |
| vite-plugin-compression | Gzip/Brotli pre-compression for deployment |

---

## 2. Project structure

```
zalibhai.com/
├── public/
│   ├── fonts/                    # Self-hosted font files (woff2)
│   ├── og-image.png              # Social preview image
│   ├── favicon.svg               # Themed favicon
│   ├── robots.txt
│   └── _headers                  # Cloudflare Pages headers (caching)
├── content/
│   ├── sections/
│   │   ├── brain.md              # Hero/intro prose
│   │   ├── chromatin.md          # Publications, research writeups
│   │   ├── protein.md            # Amaro Lab / MD work
│   │   ├── code.md               # Software narrative, workflow opinions
│   │   └── expression.md         # Contact/closing prose
│   ├── projects.json             # All project metadata (Tier 1 + Tier 2)
│   ├── publications.json         # Publication data
│   ├── status.json               # "Currently working on" line
│   └── links.json                # Contact links, socials, resume URL
├── src/
│   ├── app.tsx                   # Root: Canvas + HTML sections + providers
│   ├── main.tsx                  # Entry point
│   ├── stores/
│   │   └── depth.ts              # Zustand depth store
│   ├── engine/
│   │   ├── scroll-engine.ts      # Lenis + GSAP ticker sync
│   │   ├── scale-manager.ts      # Scale boundaries, current scale logic
│   │   ├── camera-controller.tsx  # Scroll-driven camera position/rotation
│   │   └── gpu-detect.ts         # WebGL capability tier detection
│   ├── scales/
│   │   ├── tissue/
│   │   │   ├── TissueScene.tsx   # R3F scene component
│   │   │   ├── TissueContent.tsx # HTML content for this scale
│   │   │   └── shaders/          # Scale-specific GLSL
│   │   ├── cellular/
│   │   │   ├── CellularScene.tsx
│   │   │   ├── CellularContent.tsx
│   │   │   ├── DendriteTree.tsx  # L-system branching geometry
│   │   │   └── DendriteFocus.tsx # FOV-focus interaction logic
│   │   ├── chromatin/
│   │   ├── protein/
│   │   ├── code/
│   │   │   ├── CodeScene.tsx
│   │   │   ├── CodeContent.tsx
│   │   │   └── TerminalListing.tsx # Tier 2 ls -la directory
│   │   └── expression/
│   ├── components/
│   │   ├── DepthIndicator.tsx    # Right-edge scale bar + magnification
│   │   ├── LoadingSequence.tsx   # Typed intro + zoom-in
│   │   ├── MotionToggle.tsx      # Explicit reduced-motion control
│   │   ├── WebGLErrorBoundary.tsx # Fallback when GPU context dies
│   │   ├── ScaleSection.tsx      # Wrapper: arrival + content phase layout
│   │   └── ProjectCard.tsx       # Reusable project card (dendrite + featured)
│   ├── content/
│   │   ├── loader.ts             # Vite import.meta.glob for md/json
│   │   ├── markdown.tsx          # MD rendering component
│   │   └── types.ts              # TypeScript types for content schemas
│   ├── hooks/
│   │   ├── useDepth.ts           # Subscribe to depth store
│   │   ├── useCurrentScale.ts    # Derived: which scale level is active
│   │   ├── useScrollProgress.ts  # Per-section local progress (0 to 1)
│   │   ├── useReducedMotion.ts   # prefers-reduced-motion + toggle state
│   │   └── useTrackEvent.ts      # Analytics stub hook
│   ├── shaders/
│   │   ├── reaction-diffusion.glsl  # Gray-Scott organic texture
│   │   ├── noise.glsl               # Shared noise functions
│   │   └── atmosphere.glsl          # Fog/volumetric helpers
│   ├── styles/
│   │   ├── globals.css           # CSS custom properties, base styles
│   │   ├── scales.css            # Per-scale property overrides
│   │   └── typography.css        # Font loading, type scale
│   └── utils/
│       ├── l-system.ts           # L-system generation for dendrites
│       ├── spline.ts             # Catmull-Rom spline utilities
│       └── math.ts               # Lerp, clamp, remap helpers
├── theatre/                      # Theatre.js project state (gitignored in prod)
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
├── .github/
│   └── workflows/
│       └── ci.yml                # Lint + typecheck + build
└── package.json
```

---

## 3. Content pipeline

Content is separated from code so Zara can edit copy without touching React components.

### File formats

**Markdown** (`content/sections/*.md`) for prose-heavy sections. Each file has YAML frontmatter:

```markdown
---
scale: brain
title: Zara Alibhai
subtitle: computational biology @ UCSD
---

Your intro prose here. Supports **bold**, *italic*, [links](url),
and inline `code`. No custom components in markdown, just text.
```

**JSON** (`content/*.json`) for structured, repeatable data:

```jsonc
// content/projects.json
{
  "tier1": [
    {
      "id": "hic-pipeline",
      "title": "Hi-C chromatin conformation pipeline",
      "domain": "epigenetics",
      "branch": "epigenetics",        // which dendrite branch
      "oneLiner": "Replicate-aware differential loop calling...",
      "tags": ["R", "mariner", "edgeR", "Hi-C"],
      "links": { "github": "https://...", "paper": null },
      "scale": "chromatin"            // where the featured moment lives
    }
    // ...
  ],
  "tier2": [
    {
      "id": "gptportal",
      "title": "GPTPortal",
      "oneLiner": "Multi-provider AI chat interface",
      "stars": 397,
      "links": { "github": "https://..." }
    }
    // ...
  ]
}
```

### Build-time loading

Vite's `import.meta.glob` loads content files at build time. No runtime fetching, no CMS, no API calls:

```typescript
// src/content/loader.ts
const markdownFiles = import.meta.glob('/content/sections/*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
});

import projectData from '/content/projects.json';
import statusData from '/content/status.json';
```

Content changes require a rebuild. Since Cloudflare Pages auto-deploys on push to main, the workflow is: edit markdown/JSON, commit, push, site updates in ~30 seconds. For development, Vite's HMR picks up changes instantly.

### Markdown rendering

Use `react-markdown` with `remark-gfm` for GitHub-flavored markdown. No MDX (no need for embedded React components in prose content). Styling applied via Tailwind's `@apply` in a `.prose` wrapper class tuned to match the current scale's typography register.

---

## 4. Core architecture

### The scroll engine

One Lenis instance wraps the page scroll. It syncs to GSAP's ticker so ScrollTrigger receives smooth interpolated scroll values:

```
Lenis scroll event → ScrollTrigger.update()
GSAP ticker → lenis.raf(time * 1000)
gsap.ticker.lagSmoothing(0)
```

A single master ScrollTrigger instance maps total document scroll progress to a `depth` value (0 to 1) stored in Zustand. Individual scale components read `depth` and compute their own local visibility, opacity, and animation state.

### The depth store

```typescript
interface DepthStore {
  depth: number;              // 0 (top) to 1 (bottom)
  currentScale: ScaleName;    // derived from depth
  previousScale: ScaleName | null;
  isTransitioning: boolean;   // true during scale boundary crossings
  setDepth: (d: number) => void;
}
```

Scale boundaries are defined as depth thresholds. The exact values will be tuned during prototyping, but the initial split is roughly even (each of 6 scales gets ~16.7% of the scroll range, with transition zones overlapping by ~2-3%).

### Scale lifecycle

Each scale is a React component that receives `depth` and computes its own state. Scales mount when the user approaches them (depth within ~10% of their range) and unmount when fully out of range. This keeps the active scene count to 2 at most (outgoing + incoming during transitions).

```
Mount threshold:     depth > scale.start - 0.1
Visible threshold:   depth > scale.start && depth < scale.end
Unmount threshold:   depth > scale.end + 0.1
```

### Camera system

The camera position is driven by a GSAP timeline with `scrub: true`. Keyframes correspond to each scale's "home" position. The camera primarily moves along the z-axis (deeper into the scene), with per-scale rotations and position offsets for variety.

Theatre.js is used in development to visually author these keyframes. The authored values are exported to a JSON file (`theatre/camera-state.json`) that GSAP reads in production. Theatre.js itself is excluded from the production bundle via conditional `import()`.

### HTML/Canvas layering

```
[z-index: -1]  <Canvas> (position: fixed, inset: 0)
[z-index: 0]   <main> with <section> elements (position: relative)
[z-index: 10]  UI overlay (DepthIndicator, MotionToggle, nav)
```

The Canvas is behind everything. HTML sections scroll normally over it. The 3D scenes respond to scroll position but the HTML content is the "real" page. This means the site is fully functional without WebGL: screen readers, search engines, and users with GPU issues all get the complete semantic content.

---

## 5. Per-scale architecture

Each scale level has two scroll phases within its range:

**Arrival phase** (~40% of the scale's scroll range): The 3D scene fills the viewport. Text is minimal (a scale label, section title, or nothing). This is the immersive moment. Scale transitions happen here.

**Content phase** (~60% of the scale's scroll range): The 3D scene dims or recedes (reduced opacity, pulled back, atmospheric role). HTML content scrolls into view over the faded scene.

### Scale definitions

| Scale | Depth range | 3D scene | Content | Typography |
|---|---|---|---|---|
| Tissue/brain | 0.00 to 0.17 | Stylized cerebellar cross-section, folded cortex | Hero intro, name, identity, "currently working on" | Lora (serif) |
| Cellular/neuron | 0.17 to 0.33 | L-system dendritic tree | Interactive project index (3 branches, FOV-focus) | Lora (serif) |
| Chromatin/nuclear | 0.33 to 0.50 | Instanced nucleosome beads on spline | Publications, research writeups, Ferguson Lab work | Inter (sans) |
| Protein/MD | 0.50 to 0.67 | Abstracted protein structure, MD trajectory | Amaro Lab work (5-HT2A, possibly MPro) | Inter (sans) |
| Code/terminal | 0.67 to 0.83 | Terminal/code aesthetic, minimal 3D | Tier 1 software featured moments, Tier 2 listing, workflows | Fira Code (mono) |
| Expression/contact | 0.83 to 1.00 | Continues code register | Contact links, socials, resume, external links | Fira Code (mono) |

Depth ranges are approximate. Exact boundaries will be tuned during prototyping.

### Special interactions

**Dendrite FOV-focus (cellular scale):** Clicking a labeled branch triggers a smooth camera pivot toward that branch. Other branches dim. Project cards fade in as HTML overlays positioned near branch tips. Cards show: title (as link), one-sentence description, tech/domain tags. Clicking a different branch swaps the view. Clicking the active branch or a "back" control returns to the full tree. The interaction is optional; scrolling past ignores it.

**Tissue-to-cellular breakthrough:** The transition from tissue to cellular gets a special "breaking through the cortex" moment where the camera pushes through a membrane-like surface. All other transitions use the standard crossfade-with-z-motion pattern.

**Terminal directory listing (code scale):** Tier 2 projects appear as a styled `ls -la` output with Fira Code, syntax-colored, row-hover highlight, and project names as links. Star counts where notable.

---

## 6. Navigation

### Depth indicator

Pinned to the right edge of the viewport, vertically centered. Thin line (1-2px, low opacity) with dots at each scale boundary. The active dot is brighter and slightly larger, with a subtle glow matching the current scale's accent color. A small label near the active dot shows scale name and magnification (e.g., "cellular · 100×").

The line segment between the previous and next dots fills as the user scrolls through the current scale, showing intra-level progress. Clicking any dot smooth-scrolls to that scale.

On mobile: simplified to dots only, no line, smaller footprint.

### URL fragments

Each scale has a hash route: `#tissue`, `#cellular`, `#chromatin`, `#protein`, `#code`, `#expression`. Loading the page with a fragment scrolls to that scale. Scrolling updates the hash in the URL bar (via `history.replaceState`, not `pushState`, to avoid polluting browser history).

### Keyboard navigation

Arrow keys and Page Up/Down advance between scales. The depth indicator dots are focusable and keyboard-navigable. Tab order follows the document flow of the HTML sections.

---

## 7. Loading sequence

1. Dark screen. A typed text sequence appears (content written by Zara). Styled to bridge warm and cool registers (the entry point before any scale). Typing covers asset loading time.
2. When the 3D scene is ready, typed text fades. Camera zooms in from an exterior view to the tissue level (2-3 seconds of cinematic motion).
3. Visitor arrives at the hero section. Scroll activates. Depth indicator appears.

The intro plays to completion even if assets load fast. It's a deliberate opening sequence, not a loading screen. First-time and returning visitors both see it.

---

## 8. Accessibility

This is non-negotiable and built from day one, not bolted on.

**Semantic HTML layer.** Every piece of portfolio content (bio, projects, publications, contact info) exists as real HTML in the DOM. The Canvas is purely decorative. Screen readers get a complete, well-structured document regardless of WebGL.

**`aria-hidden="true"`** on the Canvas element and all purely decorative 3D UI.

**`prefers-reduced-motion` support.** When the OS setting is `reduce` or the on-page toggle is active: Lenis lerp set to 1 (instant scroll), camera animations replaced with instant cuts or simple fades, all particle/organic motion stopped, post-processing disabled. The site is still navigable and the content is identical.

**On-page motion toggle.** A small button (probably near the depth indicator) lets users disable motion without knowing about the OS setting. State persisted in `localStorage`.

**Keyboard navigation.** Arrow keys, Tab, Enter all work. Focus indicators are visible. Focus follows logical document order.

**WCAG color contrast.** All text meets AA (4.5:1 for body text, 3:1 for large text) across every scale's palette. The warm-to-cool gradient must maintain contrast against the dark backgrounds at every point.

**WebGL error boundary.** If the GPU context is lost or WebGL initialization fails, the site falls back to the HTML content layer with CSS-animated atmospheric backgrounds (gradients, subtle noise). No black screen, no broken state.

---

## 9. Performance targets

| Metric | Target |
|---|---|
| Draw calls per frame | Under 100 |
| Total 3D asset size | Under 5 MB (procedural generation helps) |
| First Contentful Paint | Under 2s |
| Frame rate | 60 fps on modern desktop, 30+ fps on capable mobile |
| Font files | Under 300 KB total (woff2, subset) |

**Procedural generation** is the main performance lever. No Blender exports, no large mesh files. Neurons from L-systems, chromatin from instanced beads on splines, cells from noise-displaced spheres, textures from GPU shaders (reaction-diffusion, noise). This keeps asset size near zero.

**Lazy mounting.** Each scale's R3F components mount only when the user approaches that depth range. At most 2 scales are mounted simultaneously (during transitions).

**InstancedMesh** for repeated geometry (nucleosomes, cells, particles). Single draw call for hundreds of instances.

**Post-processing budget.** One merged EffectComposer pass, not stacked passes. The pass includes bloom, noise/grain, vignette, and tone mapping. The intensity of each effect is driven by depth (heavier at top, stripped at bottom), but the pass count stays at 1.

**Pixel ratio capping.** `Math.min(window.devicePixelRatio, 2)` on the renderer. Retina screens don't need 3x.

**`frameloop="demand"`** on the Canvas. Only re-render when something changes (scroll position, interaction, resize). No rendering when the user stops scrolling.

### Mobile fallback

GPU capability is detected via `WEBGL_debug_renderer_info` at startup. Devices are classified into two tiers:

**Full 3D:** Apple A14+ (iPhone 12+), Adreno 640+ (Snapdragon 855+), equivalent desktop GPUs. These get the full experience.

**Static fallback:** Older/weaker devices get the HTML content sections with CSS-animated atmospheric backgrounds (warm-to-cool gradients, subtle noise textures via CSS `background-image`, animated with `@keyframes`). No Canvas element rendered. The descent concept is preserved through the color gradient and typography shift; the 3D is the part that's dropped.

---

## 10. Deployment

**Host:** Cloudflare Pages (free tier is sufficient for a static portfolio) or GitHub Pages.

**Build:** `vite build` produces a `dist/` directory. No server runtime.

**Caching:** Long-lived cache headers on hashed assets (JS, CSS, fonts). Short cache on `index.html`. Cloudflare handles this via `_headers` file or dashboard config.

**Domain:** zalibhai.com pointed at the host via DNS.

**Auto-deploy:** Push to `main` triggers a build and deploy. No manual steps.

---

## 11. Configuration

Environment variables (`.env` file, not committed):

| Variable | Purpose |
|---|---|
| `VITE_ANALYTICS_ENABLED` | Enable/disable analytics hook (false by default) |
| `VITE_ANALYTICS_PROVIDER` | "plausible", "posthog", or "none" |
| `VITE_SITE_URL` | Canonical URL (https://zalibhai.com) |
| `VITE_THEATRE_ENABLED` | Show Theatre.js Studio (dev only) |

---

## 12. Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Vite SPA (not Astro, not Next.js) | The entire page is the 3D experience. SSR/islands add complexity with no benefit for a Canvas-dominated site. |
| Canvas count | One, persistent, full-viewport | Browser limits simultaneous WebGL contexts. Multiple canvases cause resource contention. |
| Scroll library | Lenis + GSAP ScrollTrigger | Proven pair for scroll-driven WebGL. Lenis handles smooth interpolation; GSAP handles animation mapping. |
| Camera authoring | Theatre.js (dev) exported to GSAP (prod) | Visual keyframe editing during development. No runtime dependency on a pre-release library. |
| Content format | Markdown + JSON, build-time import | No CMS overhead. Content in the repo. Vite HMR for dev, git push for deploy. |
| CSS strategy | Tailwind utilities + CSS custom properties | Tailwind for layout speed. Custom properties for the scroll-driven warm-to-cool theming that Tailwind can't do. |
| Biology generation | All procedural (no Blender) | Authentic to computational biology identity. Near-zero asset size. Full creative control. |
| Mobile strategy | GPU-tier detection with static CSS fallback | Don't block desktop ambition for mobile parity. Capable phones get full 3D; weaker ones get styled HTML. |
| Light mode | None (dark only) | Every shader, fog, bloom, and post-processing parameter is tuned for dark. Light mode doubles the design surface for every scale. |
| Accessibility | HTML-first, 3D as enhancement | Screen readers, search engines, and broken GPUs all get the complete content. |

---

*End of SPEC.md.*

---
