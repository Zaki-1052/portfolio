# Zara Alibhai — Biological Scale Descent Portfolio

A scroll-driven 3D portfolio that descends through biological scales of organization — from tissue to cell to chromatin to protein to code — where each scale hosts portfolio content rendered in that scale's visual language.

One continuous spine, no branching paths. Dark mode only.

## The Concept

The site maps the journey from macroscopic biology down to source code. As the visitor scrolls, the camera descends through six scales, each with its own 3D scene, color register, typography, and atmosphere:

| Scale | Visual | Typography | Accent |
|---|---|---|---|
| Tissue | Folded cortex shell, golden atmosphere | Lora (serif) | Warm amber |
| Cellular | L-system dendritic tree with branch-focus interaction | Lora (serif) | Magenta-rose |
| Chromatin | Instanced nucleosome fiber on spline | Inter (sans) | Blue |
| Protein | Abstracted molecular dynamics | Inter (sans) | Cyan |
| Code | Terminal aesthetic, minimal 3D | Fira Code (mono) | Green |
| Expression | Contact/closing, terminal register | Fira Code (mono) | Green |

The warm-to-cool color gradient is continuous across the full scroll range. Post-processing (bloom, grain, fog) is heaviest at the tissue level and stripped away by the code level.

## Stack

| Layer | Technology |
|---|---|
| Framework | Vite 6, React 19, TypeScript (strict) |
| 3D | Three.js 0.170, React Three Fiber 9, drei 10, postprocessing |
| Scroll | Lenis + GSAP ScrollTrigger |
| State | Zustand |
| CSS | Tailwind CSS 4 + CSS custom properties |
| Content | Markdown + JSON, loaded at build time via Vite |
| Dev tools | Theatre.js, Leva, r3f-perf |

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm run format` | Prettier |
| `npm run test` | Vitest |

## Project Structure

```
src/
├── app.tsx                    # Root: Canvas + HTML sections + providers
├── main.tsx                   # Entry point
├── engine/                    # Scroll, camera, depth, post-processing, GPU detection
│   ├── scroll-engine.ts       # Lenis + GSAP ticker sync
│   ├── scale-manager.ts       # Canonical depth bands, piecewise remap
│   ├── camera-controller.tsx  # Scroll-driven camera position/rotation
│   ├── camera-keyframes.ts    # Per-scale camera poses
│   ├── post-fx.tsx            # EffectComposer (bloom, noise, vignette, tone mapping)
│   ├── scene-manager.tsx      # Lazy mount/unmount of scale scenes
│   ├── theme-bridge.ts        # CSS custom property updates from depth
│   └── gpu-detect.ts          # WebGL capability tier detection
├── scales/                    # Per-scale 3D scenes + HTML content
│   ├── tissue/                # Folded shell, atmosphere, breakthrough transition
│   ├── cellular/              # L-system arbor tree, branch-focus, annotations
│   ├── chromatin/             # Publications content
│   ├── protein/               # Research content
│   ├── code/                  # Terminal listing, software projects
│   └── expression/            # Contact, terminal mail form
├── components/                # Shared UI (DepthIndicator, LoadingSequence, MotionToggle)
├── stores/                    # Zustand stores (depth, motion, branch-focus, intro)
├── hooks/                     # useDepth, useCurrentScale, useReducedMotion, etc.
├── shaders/                   # Shared GLSL (noise, reaction-diffusion, shell-shape)
├── content/                   # Build-time content loader + markdown renderer
├── styles/                    # globals.css with all CSS custom properties
└── utils/                     # L-system generator, math helpers

content/                       # Markdown prose + JSON data (projects, publications, links)
docs/                          # SPEC, DESIGN, PLAN, research, reference material
logs/                          # Session logs from each build phase
```

## Architecture

**Scroll engine.** Lenis drives smooth scroll. A master GSAP ScrollTrigger maps total document-scroll progress onto a canonical depth value (0–1) stored in Zustand. Sections have unequal heights, so a piecewise-linear remap keeps each scale pinned to its fixed depth band regardless of content length.

**Scale lifecycle.** Scales mount when the user approaches (~10% before their range) and unmount when fully past. At most two scales are active simultaneously during transitions.

**Camera.** Position and rotation are driven by depth-keyed spline interpolation. Theatre.js is available in dev for visual keyframe authoring.

**HTML-first accessibility.** Every piece of content exists as semantic HTML in the DOM. The Canvas is `aria-hidden`. The site is fully navigable without WebGL — screen readers, search engines, and GPU failures all get the complete content.

**Content pipeline.** Markdown and JSON files in `content/` are loaded at build time via `import.meta.glob`. No CMS, no API calls. Edit content, push to main, site rebuilds.

## Configuration

- **Tailwind v4**: CSS-first config in `src/styles/globals.css` — no `tailwind.config` file
- **ESLint v9**: Flat config in `eslint.config.mjs`
- **Path alias**: `@/` maps to `src/`
- **Theatre.js**: Dev-only, installed with `--legacy-peer-deps`

## Build Status

Phases 0–4 are complete (scaffolding, HTML content layer, scroll engine, tissue 3D scene with shell/atmosphere/breakthrough, cellular arbor tree with branch-focus interaction). Phases 5–7 (remaining 3D scales, loading sequence, performance/mobile/ship) are in progress.

## License

Private
