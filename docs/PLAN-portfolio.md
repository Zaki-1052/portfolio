
---

# PLAN.md

---

# Biological Scale Descent Portfolio: build plan

> The build roadmap. Each phase produces a verifiable increment. Steps within a phase are ordered by dependency. The spec (SPEC.md) has the technical details; this document tells you what to build and when.

---

## Current status

**Planning complete.** Three sessions of architectural planning have resolved: the concept (biological scale descent), the stack (Vite + R3F + GSAP + Lenis), the content architecture (6 scales, tiered projects, single spine), navigation (depth indicator + URL fragments), transitions (crossfade-with-z-motion, cortex breakthrough), typography (Lora/Inter/Fira Code), color (Atom One Dark with per-scale accent shifts), content pipeline (markdown + JSON, build-time), accessibility strategy (HTML-first), and mobile fallback (GPU-tier detection).

Ready for Phase 0 (scaffolding).

---

## Phase 0: scaffolding

> **Goal:** A running dev server with the full toolchain configured, an empty Canvas behind scrollable sections, and all linting/formatting/CI passing. No 3D, no content, no scroll animations. Just the skeleton.
> **Estimate:** 1-2 days.

### 0.1 Project setup

```bash
npm create vite@6 zalibhai.com -- --template react-ts
cd zalibhai.com
```

**Pin all dependency versions** to ranges known to be stable and compatible with AI-assisted development. Running `@latest` installs whatever is current at install time, which may be unstable, have breaking API changes, or fall outside the AI's training data. The Vite 6 template installs React 19; verify it matches the range below.

Install production dependencies (pinned):

```bash
npm i three@~0.170.0 @react-three/fiber@^8.17.0 @react-three/drei@^9.114.0 \
  @react-three/postprocessing@^2.16.0 gsap@^3.12.5 lenis@^1.1.0 \
  zustand@^5.0.0 react-markdown@^9.0.0 remark-gfm@^4.0.0
```

Install Tailwind CSS 4 (pinned):

```bash
npm i tailwindcss@^4.0.0 @tailwindcss/vite@^4.0.0
```

Install dev dependencies (pinned):

```bash
npm i -D @types/three@~0.170.0 @theatre/core@^0.7.0 @theatre/studio@^0.7.0 \
  @theatre/r3f@^0.7.0 leva@^0.9.35 r3f-perf@^7.2.0 eslint@^9.0.0 \
  prettier@^3.4.0 eslint-config-prettier@^9.1.0 husky@^9.0.0 \
  lint-staged@^15.2.0 vite-plugin-compression@^0.5.1
```

After install, verify all versions resolved correctly. The `package-lock.json` is the canonical version record. If a version range above resolves to something broken, pin to a known-good exact version rather than bumping to `@latest`.

### 0.2 Toolchain configuration

Configure `tsconfig.json` (strict mode, path aliases), `tailwind.config.ts`, `.eslintrc`, `.prettierrc`. Set up `husky` + `lint-staged` for pre-commit hooks (lint + format).

Configure Vite: path aliases (`@/` for `src/`), font loading, markdown raw import, conditional Theatre.js import.

### 0.3 CSS foundation

Create `src/styles/globals.css` with CSS custom properties for the color system. Define the scale-specific property sets. Set up Tailwind's `@import` and configure the dark background, font stacks, and base typography.

```css
:root {
  --bg: #282c34;
  --text: #abb2bf;
  --accent: #61afef;
  --fog-color: #282c34;
  /* ... per-scale overrides applied via data attribute or class */
}

[data-scale="tissue"] {
  --bg: #2c2a28;
  --accent: #e5c07b;
  --fog-color: #2c2a28;
}
/* ... etc for each scale */
```

### 0.4 App shell

Create `src/app.tsx` with: a fixed `<Canvas>` (empty scene, dark clear color), six `<section>` elements (each `min-height: 100vh`, identified by `id` for URL fragments), and the basic HTML structure. No content, no 3D. Just colored placeholder sections so you can scroll through them.

### 0.5 Zustand depth store

Create `src/stores/depth.ts` with the `DepthStore` interface. Implement `setDepth` and the derived `currentScale` computation.

### 0.6 CI setup

Create `.github/workflows/ci.yml`:
- Trigger on push to main and pull requests
- Steps: install, `tsc --noEmit`, `eslint .`, `npm run build`

### 0.7 Git

Initialize repo. Push to GitHub. No production deployment yet: the domain gets purchased and Cloudflare Pages (or equivalent) gets connected only after the site is complete and ready to ship. Development happens entirely in dev.

**Verify:** `npm run dev` starts the app. Six colored sections are scrollable. The Canvas renders behind them (dark, empty). `npm run build` succeeds. CI passes.

### Phase 0 done criteria

- Running dev server with hot reload
- Empty Canvas + 6 scrollable HTML sections
- Zustand store created (not wired to scroll yet)
- Tailwind + CSS custom properties configured
- ESLint, Prettier, TypeScript strict all passing
- CI pipeline runs on push

---

## Phase 1: HTML content layer and content pipeline

> **Goal:** The complete semantic HTML structure for all 6 scales, populated from markdown and JSON content files. Fully navigable without any 3D or scroll animation. Accessible to screen readers, keyboard, and URL fragments. This is the accessibility foundation.
> **Estimate:** 3-5 days.

### Prerequisites

- Phase 0 complete

### Content constraint (applies to all phases)

All body text, descriptions, and prose content use **lorem ipsum placeholder text** during implementation. Section headings, navigation labels, and structural elements use their real names ("Tissue," "Cellular," "Code," etc.), and project titles/links can be real, but paragraph content, bio text, and project descriptions are placeholder. This prevents content-writing from blocking development and avoids relitigating copy during design iteration. Zara writes all real copy after the site structure is visible and testable.

### Reference material

The `reference/` directory contains a Claude Design prototype (`Zara Alibhai - Scale Descent Portfolio.html` and associated assets). This prototype can inform layout patterns and component structure, but SPEC.md, DESIGN.md, and this plan always take priority over the prototype. The HTML content layer should not be bare-bones wireframe: it should feel like a deliberately designed static version of the portfolio, with considered typography, spacing, and atmospheric color, even before any 3D is layered on. Draw from the prototype for inspiration where useful, but prioritize modularity and buildability for the real site.

### 1.1 Content pipeline

Build `src/content/loader.ts` using `import.meta.glob` to load all markdown and JSON files from `content/`. Create TypeScript types for the content schemas (`Project`, `Publication`, `ContactLink`, `Status`, etc.). Validate that the JSON files conform to the types at build time.

Build `src/content/markdown.tsx`: a component that takes raw markdown and renders it with `react-markdown` + `remark-gfm`, styled with a Tailwind prose class scoped to the current scale's typography.

**Verify:** Import a test markdown file and a test JSON file. Both render correctly in the dev server. TypeScript catches schema mismatches.

### 1.2 Scale section layout component

Build `src/components/ScaleSection.tsx`: a wrapper that handles the arrival-phase / content-phase layout pattern for each scale. Takes props for scale name, children (content), and arrival content (minimal overlay text). Applies the correct `data-scale` attribute for CSS theming.

Each section is a `<section>` with `id="tissue"`, `id="cellular"`, etc. The section has `min-height: 100vh` and is split into an arrival zone (first viewport height, mostly empty) and a content zone (remaining height, where HTML content lives).

### 1.3 Tissue/brain section (HTML only)

Build `src/scales/tissue/TissueContent.tsx`. Renders the hero content: name, subtitle/tagline, "currently working on" status line, and intro prose loaded from `content/sections/brain.md`.

This is the first real content on the page. No 3D. Just well-structured HTML with the warm-register typography (Lora headings, Inter body) and the tissue-scale color properties.

**Verify:** Screen reader reads the content correctly. Tab navigation works. `#tissue` URL fragment scrolls to this section.

### 1.4 Cellular section (HTML only)

Build the dendrite index content as flat HTML. Three labeled groups (epigenetics, structural biology, software) each listing their Tier 1 projects with title, one-liner, and tags. This is the non-interactive fallback for the FOV-focus dendrite interaction; the 3D interaction will enhance it later.

**Verify:** All Tier 1 projects are listed and linked. `#cellular` fragment works.

### 1.5 Chromatin section (HTML only)

Publications and Ferguson Lab research content. Loaded from `content/sections/chromatin.md` and `content/publications.json`. Publication entries link externally to papers.

### 1.6 Protein section (HTML only)

Amaro Lab work. Loaded from `content/sections/protein.md`.

### 1.7 Code/terminal section (HTML only)

Tier 1 software projects get featured blocks (title, description, tags, links). Tier 2 projects render as the terminal directory listing from `content/projects.json`. Personal workflow/tools prose from `content/sections/code.md`.

Build `src/scales/code/TerminalListing.tsx`: renders the `ls -la` styled output for Tier 2 projects. Fira Code font, Atom One Dark syntax colors, hover highlights, titles as links.

### 1.8 Expression/contact section (HTML only)

Contact links, socials, resume link. Loaded from `content/links.json`. Styled in the code/terminal register. Terminal mail contact form (`$ mail zara` trigger, green terminal popup, Formspree submission via `content/form.json` config). Form component: `src/scales/expression/TerminalMail.tsx`, logic hook: `src/hooks/useTerminalMail.ts`.

### 1.9 Navigation (HTML only)

Build `src/components/DepthIndicator.tsx` as a static version (no scroll animation yet). Shows all 6 scale dots. Clicking a dot scrolls to that section via `scrollIntoView`. Current scale highlighted based on Intersection Observer (no depth store yet, just basic viewport detection).

### 1.10 Accessibility audit

Test the complete HTML site with:
- VoiceOver (macOS) or NVDA: all content readable, heading hierarchy correct, links announced
- Keyboard: Tab through all interactive elements, Enter activates links
- URL fragments: each `#scale` loads correctly
- `prefers-reduced-motion`: no animations running (there shouldn't be any yet)
- Lighthouse accessibility score: target 95+

**Verify:** The entire portfolio is usable as a plain HTML page. Every project, publication, and contact link is accessible. The experience is complete (though not visually exciting) without JavaScript or WebGL.

### Phase 1 done criteria

- All 6 scale sections populated with real or placeholder content
- Content loaded from markdown and JSON files (not hardcoded in components)
- TypeScript types enforce content schemas
- Screen reader, keyboard, and URL fragment navigation all work
- Depth indicator shows section dots with click-to-jump
- Contact form functional with Formspree submission
- Lighthouse accessibility 95+
- All text meets WCAG AA contrast

---

## Phase 2: scroll engine and depth system

> **Goal:** Lenis smooth scroll, GSAP ScrollTrigger, and the Zustand depth store all wired together. Scroll drives the depth value (0 to 1). CSS custom properties update per scale. The warm-to-cool color gradient works. No 3D yet, but the atmospheric shift is visible in the HTML layer.
> **Estimate:** 2-3 days.

### Prerequisites

- Phase 1 complete

### 2.1 Scroll engine

Build `src/engine/scroll-engine.ts`. Singleton (module-level `initialized` flag for StrictMode safety, `import.meta.hot.dispose` teardown for HMR). Initialize Lenis, sync to GSAP ticker:

```typescript
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true, autoRaf: false });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);
```

Create a master ScrollTrigger that maps total scroll progress to the depth store. No `scrub` — depth is set directly via `onUpdate`, not through a tween. `onRefresh` re-measures section boundaries:

```typescript
ScrollTrigger.create({
  trigger: 'main',
  start: 'top top',
  end: 'bottom bottom',
  onRefresh: remeasure,
  onUpdate: (self) => {
    useDepthStore.getState().setDepth(rawProgressToDepth(self.progress, rawBoundaries));
  },
});
```

A `ResizeObserver` on `<main>` and `document.fonts.ready` trigger `ScrollTrigger.refresh()` to keep section measurements current after web font swap or image load.

### 2.2 Scale manager

Build `src/engine/scale-manager.ts`. Defines fixed canonical scale boundaries (`[0, 0.17, 0.33, 0.5, 0.67, 0.83, 1.0]`), computes `currentScale` from depth, manages transition state and blend zones. Wire into the Zustand store so `currentScale`, `previousScale`, `isTransitioning`, and `scaleProgress` update automatically when `depth` crosses a boundary.

**Piecewise-canonical depth remap:** Sections have content-driven unequal heights, so `measureSectionBoundaries` reads real section positions from the DOM. `rawProgressToDepth` performs a piecewise-linear remap so each section lands exactly on its canonical band. `depthToRawProgress` is the inverse (for round-trip tests and Phase 3 camera tooling). This keeps depth stable for camera keyframe authoring even when copy changes section heights.

**Hash mapping:** `hashForScale`/`scaleFromHash` live here (not in `url-scale-sync.ts`) so the node test suite never transitively imports gsap/lenis.

### 2.3 CSS theming from scroll

Build `src/engine/theme-bridge.ts`. When `currentScale` changes, update `data-current-scale` on `<html>` (NOT `data-scale` — that would fire the existing `[data-scale]::before/::after` atmospheric pseudo-elements on the root element). This attribute drives fixed chrome (depth indicator, motion toggle, html background).

For smooth cross-boundary color blending: `theme-bridge` reads each scale's resolved channel colors once from its `<section>` (via `getComputedStyle` — single source of truth is globals.css, no duplicated JS color table). During the transition zone (0.03 canonical units straddling each internal boundary), `gsap.utils.interpolate` writes blended channel values onto `<html>` inline style every tick (stateless, scroll-scrubbed, not time-tweened). Under reduced motion, blend snaps to the nearest scale (rounds `t`).

**Verify:** Scroll through the page. The background color shifts smoothly from warm (#2c2a28) at the top to cool (#21252b) at the bottom. Typography headings shift from Lora to Inter to Fira Code at the correct boundaries.

### 2.4 Depth indicator (animated)

Upgrade the Phase 1 depth indicator to read from the depth store. The active dot glows with the current scale's accent color. The intra-level fill height is driven imperatively via a store subscription (no React re-render per tick). The magnification label crossfades on scale transition (remounted via `key={currentScale}`). Click-to-jump uses Lenis (`lenis.scrollTo`), instant under reduced motion.

**Keyboard scale navigation:** Global `keydown` listener on `window` — Arrow keys and Page Up/Down jump between scales. Guards against firing in form fields (INPUT, TEXTAREA, SELECT, contentEditable). **Open a11y concern:** bare arrow-key hijack removes fine-grained keyboard scroll; revisit in Phase 7 a11y re-audit (consider softening to PageUp/Down only).

### 2.5 Reduced motion support

Build `src/stores/motion.ts`. Centralized reduced-motion state: `osReduced` (from `prefers-reduced-motion` media query, live-tracked) OR `userReduced` (on-page toggle, persisted to `localStorage`). `reduced = osReduced || userReduced` — the toggle only adds reduction, never overrides an OS preference. App reflects `reduced` onto `<html data-motion="reduced"|"full">` and sets Lenis lerp to 1 (instant). The depth pipeline keeps running (theming depends on it); only smoothing and color interpolation are disabled. CSS `[data-motion='reduced']` mirror blocks parallel the existing `@media (prefers-reduced-motion)` no-JS floor.

Build `src/hooks/useReducedMotion.ts` — thin store selector. Existing hooks (`useReveal`, `useGlitchCycle`) absorb the centralized `useReducedMotion` (live toggle, not mount-only `matchMedia`).

Build `src/components/MotionToggle.tsx`. Small button near the depth indicator.

### 2.6 URL fragment sync

Build `src/engine/url-scale-sync.ts`. `replaceState` on scale change (not `pushState` — no history pollution). `hashchange` listener handles manual hash edits. `jumpToInitialHash` at page load scrolls to the matching scale (instant, forced). Kept separate from `scroll-engine.ts` to avoid import cycles.

**Verify:** Scroll slowly through the entire page. Colors shift, typography shifts, depth indicator tracks correctly, URL updates. Enable reduced motion; scroll is instant, no animations. Reload with `#protein` in the URL; page loads at the protein section.

### Phase 2 done criteria

- Lenis + GSAP ScrollTrigger driving depth store (0 to 1) via piecewise-canonical remap
- CSS custom properties animate per scale (colors, fog, accent) via stateless per-tick interpolation
- `data-current-scale` on `<html>` for fixed chrome
- Typography shifts at scale boundaries (serif, sans, mono)
- Depth indicator animated with intra-level progress, keyboard scale nav
- Reduced motion toggle works, persists, and is live (mid-session flip)
- URL fragments sync bidirectionally
- Unit tests (scale-manager, depth store) and CI `npm test -- --run` step

---

## Phase 3: first 3D scene (tissue/brain)

> **Goal:** The Canvas renders a real 3D scene for the tissue/brain scale. The scene responds to scroll depth. Post-processing (bloom, grain, fog) is active and tuned for the warm register. The cortex-breakthrough transition to cellular is prototyped. The WebGL error boundary catches failures gracefully.
> **Estimate:** 5-7 days. This is the hardest phase technically because it establishes all the 3D patterns the other scales follow.

### Prerequisites

- Phase 2 complete

### 3.1 WebGL error boundary

Build `src/components/WebGLErrorBoundary.tsx`. Wraps the Canvas. If WebGL initialization fails or the GPU context is lost, renders the HTML content layer with a CSS atmospheric background instead of a black screen.

### 3.2 GPU detection

Build `src/engine/gpu-detect.ts`. Reads `WEBGL_debug_renderer_info` to classify the GPU. Exports a `gpuTier` value: `'full'` or `'fallback'`. When `'fallback'`, the Canvas doesn't mount at all.

### 3.3 Canvas setup

Mount the Canvas in `src/app.tsx` (conditionally, based on GPU tier). Configure: `frameloop="demand"`, `dpr={[1, 2]}`, dark clear color, perspective camera. Add the EffectComposer with the shared post-processing pass (bloom, noise, vignette, tone mapping) with all intensities driven by the depth store.

### 3.4 Camera controller

Build `src/engine/camera-controller.tsx`. A R3F component that reads `depth` from Zustand and sets the camera position/rotation. For now, a simple z-axis dolly from `z=50` (top) to `z=0` (bottom), with per-scale position keyframes.

If Theatre.js is enabled (`VITE_THEATRE_ENABLED`), mount the Theatre.js Studio and its `PerspectiveCamera` wrapper for visual keyframe editing. Otherwise, use the static keyframe data.

### 3.5 Tissue scene

Build `src/scales/tissue/TissueScene.tsx`. The scene shows a stylized cerebellar cross-section, evocative not anatomical.

Approach: a folded surface (Catmull-Rom spline extruded along a path, or noise-displaced plane geometry) with warm-toned fog, golden directional light, and heavy bloom. The geometry should suggest the folia (folds) of the cerebellum without being a biology textbook illustration.

The scene fades in during the tissue arrival phase and dims during the content phase.

### 3.6 Post-processing tuning (warm register)

Tune the tissue-level post-processing: high bloom threshold, golden bloom tint, film grain (noise effect with low opacity), warm fog color. These values are the "warmest" end of the gradient and will be interpolated toward zero as depth increases.

### 3.7 Tissue-to-cellular transition

Prototype the cortex breakthrough. The camera pushes through the folded surface, revealing the cellular scene on the other side. This can be achieved by:
- Modeling the cortex as a shell with an opening the camera flies through
- Using a depth-based alpha cutout that dissolves the cortex geometry as the camera passes through
- Fading the tissue scene out while simultaneously fading the cellular scene in, with a burst of particles at the transition point

The cinematic cortex breakthrough is the goal, not an optional upgrade. A basic crossfade-with-z-motion can serve as the initial rendering pass to get the transition zone wired up, but the same implementation session should build toward the full cinematic version (camera pushing through an opening in the shell, with particle burst or dissolve). The spec explicitly calls for this to be the standout transition. Don't settle for the crossfade as "good enough."

**Verify:** Scroll from top to bottom. The tissue scene renders with warm lighting and bloom. Scrolling past the tissue range triggers the breakthrough transition. The HTML content phases correctly (scene immersive, then dimmed with content overlay). Performance HUD shows under 100 draw calls.

### 3.8 Performance baseline

Enable `r3f-perf` in development. Record: draw calls, triangles, FPS, GPU memory. This baseline guides performance budgets for subsequent scales. If the tissue scene alone exceeds targets, simplify before adding more scales.

### Phase 3 done criteria

- Tissue scene renders with warm post-processing (bloom, grain, fog)
- Camera moves along z-axis driven by scroll depth
- Scene dims during content phase, HTML content readable
- WebGL error boundary catches failures gracefully
- GPU detection gates Canvas mounting
- Cortex breakthrough transition prototyped
- Performance baseline recorded (draw calls, FPS, memory)
- Theatre.js studio available in dev for camera tuning

---

## Phase 4: cellular scale (dendrites and interaction)

> **Goal:** The dendritic tree renders at the cellular scale. FOV-focus interaction works (click branch, camera pivots, project cards appear). This is the most interaction-heavy scale.
> **Estimate:** 5-7 days.

### Prerequisites

- Phase 3 complete

### 4.1 L-system generator

Build `src/utils/l-system.ts`. A recursive branching generator that produces: a tree of 3D points (position, radius, parent) representing a dendritic structure. Parameters: branching angle, depth, taper ratio, noise/curl. Output is a geometry-ready data structure.

### 4.2 Dendrite tree mesh

Build `src/scales/cellular/DendriteTree.tsx`. Takes the L-system output and renders it as Three.js TubeGeometry segments (or a single merged geometry for performance). Three major branches are visually distinct and labeled.

### 4.3 FOV-focus interaction

Build `src/scales/cellular/DendriteFocus.tsx`. Manages the branch-focus interaction:
- Raycasting to detect which branch is hovered/clicked
- GSAP-animated camera pivot toward the focused branch
- Opacity reduction on non-focused branches
- HTML project cards positioned near branch tips via `drei`'s `Html` component
- Project data loaded from `content/projects.json`
- Back-to-overview: clicking the active branch or a button returns to the full tree

### 4.4 Cellular post-processing

Adjust the EffectComposer parameters for this scale: moderate bloom (less than tissue), magenta-rose accent influence on bloom tint, slightly cooler fog.

### 4.5 Integration test

Scroll from tissue through the breakthrough into cellular. The tree renders. Click each branch. Cards appear with correct project data. Links work. Scroll past the cellular section. The tree fades.

**Verify:** All three branches show correct Tier 1 projects. The interaction feels snappy (camera pivot under 400ms). Performance stays under budget.

### Phase 4 done criteria

- L-system dendritic tree renders with 3 labeled branches
- FOV-focus interaction works (click, pivot, cards, back)
- Project cards load from content pipeline
- Post-processing adjusted for cellular register
- Tissue-to-cellular transition works end-to-end

---

## Phase 5: remaining scales

> **Goal:** Chromatin, protein, code, and expression scales all have their 3D scenes and HTML content wired up. All transitions between adjacent scales work.
> **Estimate:** 7-10 days (these are simpler than cellular since they have no complex interactions).

### Prerequisites

- Phase 4 complete

### 5.1 Chromatin/nuclear scene

Build `src/scales/chromatin/ChromatinScene.tsx`. Instanced nucleosome beads (sphere geometry) along a Catmull-Rom spline. The fiber structure gently rotates or undulates based on time/scroll. Blue accent lighting. Neutral post-processing (Atom One Dark "home base").

### 5.2 Protein/MD scene

Build `src/scales/protein/ProteinScene.tsx`. An abstracted protein structure. Options to evaluate:
- Procedural: noise-displaced blob with cyan accent lighting, pulsing to suggest dynamics
- Data-driven: load a PDB structure via Mol* or 3Dmol.js for a single "real data" moment, then fade to the abstract version

The MD trajectory aesthetic: subtle ribbon/tube geometry with time-animated position noise to suggest molecular motion.

### 5.3 Code/terminal scene

Build `src/scales/code/CodeScene.tsx`. This scale has the least 3D. The scene is atmospheric: a dark void with faint green grid lines or code-rain particles (think Matrix but subtle, low-opacity, background-only). The terminal listing and software content dominate the viewport as HTML.

### 5.4 Expression/contact scene

Build `src/scales/expression/ExpressionScene.tsx`. Continues the code register. Could be: outgoing data streams (thin lines radiating outward from center), a pulsing signal, or just atmospheric particles. The content (links, socials) is entirely HTML.

### 5.5 All transitions

Wire the standard crossfade-with-z-motion pattern between all adjacent scale pairs (cellular-to-chromatin, chromatin-to-protein, protein-to-code, code-to-expression). The tissue-to-cellular breakthrough was built in Phase 3.

Each transition: during the overlap zone (~2-3% of total scroll range at the boundary), the outgoing scene fades to 0 opacity while the incoming scene fades to 1, and the camera advances along z.

### 5.6 Post-processing gradient

Verify the full post-processing gradient works across all scales. Bloom intensity should decrease from tissue (heaviest) to code (minimal). Film grain follows the same curve. Fog color shifts with the palette. The code and expression scales should feel clean and sharp, with almost no post-processing artifacts.

**Verify:** Scroll from top to bottom in one smooth motion. All 6 scales render, transition, and display content correctly. The warm-to-cool gradient is perceptible and continuous. No jarring cuts.

### Phase 5 done criteria

- All 6 scales have 3D scenes
- All transitions work (including the cortex breakthrough)
- Post-processing gradient is continuous across the full descent
- All content phases show HTML content with dimmed 3D backdrop

---

## Phase 6: loading sequence and polish

> **Goal:** The typed intro and zoom-in sequence work. Depth indicator is fully polished. Favicon, OG tags, 404 page, and metadata are in place. The site feels finished.
> **Estimate:** 3-5 days.

### Prerequisites

- Phase 5 complete
- Typed intro text: use placeholder text initially (per the content constraint). Zara writes the real intro after seeing the loading sequence in action.

### 6.1 Loading sequence

Build `src/components/LoadingSequence.tsx`. On initial load:
1. Dark screen, typed text sequence (content from a config or content file)
2. Asset loading happens in parallel (React Suspense boundaries around scale components)
3. When 3D is ready AND the typed sequence is complete, crossfade to the zoom-in
4. Camera zooms from far exterior to tissue level (2-3 seconds)
5. Intro sequence fades, hero section revealed, scroll activated

The sequence blocks scroll until complete. It plays every visit (deliberate creative choice).

### 6.2 Favicon and metadata

Create a themed `favicon.svg` (simpler is better; an abstract neuron branch, initials, or a minimal brain silhouette).

Add meta tags to `index.html`: title, description, OG image, OG title, OG description, Twitter card, canonical URL. The OG image should be a static render or screenshot of the hero section.

### 6.3 404 page

Create a themed 404 route. Suggestion: "you've descended past the observable scale" with a link back to the top. Styled in the terminal register (Fira Code, dark background, green text).

### 6.4 Analytics stubs

Wire `useTrackEvent` to log scale transitions, dendrite branch clicks, and scroll depth milestones (25%, 50%, 75%, 100%). All calls go to a no-op by default. When a provider is configured, swap the no-op for the real SDK.

### 6.5 Polish pass

- Depth indicator mobile styling (dots only, no line)
- Keyboard focus indicators styled to match scale accent colors
- Scroll-to-top button at the expression/contact level
- External link icons on GitHub/paper links
- Resume link in the depth indicator area or expression section
- Print stylesheet (optional, but nice: the HTML content layer prints cleanly)

**Verify:** Cold load the site. Typed intro plays. Zoom-in to hero. Scroll through entire descent. All 6 scales, all transitions, all content, all interactions work. Sharing the URL on Twitter/LinkedIn shows a proper preview card. The 404 page renders for invalid routes.

### Phase 6 done criteria

- Loading sequence plays on every visit
- Favicon, OG tags, and social preview work
- 404 page themed and functional
- Analytics hooks stubbed and logging to console in dev
- Mobile depth indicator simplified
- Keyboard focus indicators visible and styled
- All external links open in new tabs

---

## Phase 7: performance, mobile, and ship

> **Goal:** Performance validated on real devices. Mobile fallback tested. Accessibility re-audited with 3D active. Bugs fixed. Ship.
> **Estimate:** 3-5 days.

### Prerequisites

- Phase 6 complete

### 7.1 Performance profiling

Test on target devices:
- Desktop: your dev machine + one Windows machine if available
- Mobile full 3D: iPhone 12+ or recent Android flagship
- Mobile fallback: an older phone (iPhone 8-11 range or ~2018 Android)

Use Chrome DevTools Performance tab and `r3f-perf` to measure: FPS, draw calls, GPU memory, frame time. If any scale exceeds the budget (100 draw calls, sub-60fps on desktop), simplify that scale's geometry or reduce instance counts.

### 7.2 Mobile fallback verification

Force the fallback path on a capable device (override GPU detection). Verify: all content is accessible, the color gradient works via CSS, typography shifts work, depth indicator works, no Canvas rendered, no WebGL errors in console.

### 7.3 Accessibility re-audit

Re-run the Phase 1 accessibility tests with the full 3D layer active:
- Canvas has `aria-hidden="true"`
- Screen reader still reads all content correctly
- Keyboard navigation isn't intercepted by the Canvas
- Reduced motion toggle disables all 3D animations
- Color contrast maintained at every scale

### 7.4 Cross-browser testing

Test in Chrome, Firefox, Safari (WebKit has some Three.js quirks). Verify WebGL context creation, font rendering, and scroll behavior in each.

### 7.5 Final deployment

- Verify production build size (`npm run build`, check `dist/`)
- Ensure cache headers are correct for hashed assets
- Run Lighthouse: target 90+ Performance, 95+ Accessibility, 100 Best Practices
- Test the production URL on multiple devices

### 7.6 Bug fixes and polish

Address anything found in 7.1-7.5.

### Phase 7 done criteria

- 60fps on target desktop hardware
- 30+ fps on capable mobile devices
- Static fallback verified on weak devices
- Accessibility audit passing with 3D active
- Cross-browser: Chrome, Firefox, Safari all working
- Lighthouse scores meeting targets
- Production URL live and stable

---

## Cross-cutting concerns

These apply throughout all phases.

### Testing strategy

This is a visual, interactive project. The testing approach is different from a CRUD app like Cleave.

**What gets automated tests:**
- Content pipeline: loader correctly parses markdown/JSON, types enforce schemas
- Depth store: boundary calculations, scale transitions, edge cases (0, 1, exact boundaries)
- Scale manager: correct scale returned for any depth value
- L-system generator: output is a valid tree structure, respects parameters
- Utility functions: lerp, clamp, remap, spline math
- URL fragment sync: correct fragment for each scale, round-trip

**What gets manual testing:**
- 3D scene visual quality (you have to look at it)
- Scroll feel (smooth, not janky)
- Transition aesthetics (timing, easing, crossfade)
- Post-processing tuning (bloom, grain, fog values)
- Mobile experience
- Typography and color at each scale

**Testing tools:** Vitest for unit tests. No E2E framework needed; manual testing with Chrome DevTools is more useful for a visual project.

### Content workflow

1. Edit files in `content/` (markdown or JSON)
2. Dev: Vite HMR reflects changes immediately
3. Prod: commit, push to main, Cloudflare Pages auto-deploys (~30s)

The "currently working on" status line (`content/status.json`) is the most frequently updated content. Everything else changes rarely.

### Performance monitoring (ongoing)

Keep `r3f-perf` enabled in development throughout all phases. Record a baseline after each phase. If a phase's additions push past budget, address it before moving on. Don't accumulate performance debt across phases.

### Key reference documents

| When you need... | Read... |
|---|---|
| Technical architecture, stack details | `SPEC.md` (this project) |
| Design system, visual language, anti-slop rules | `DESIGN.md` (this project) |
| Decisions and rationale from planning | Session logs (portfolio-session-log.md, session-2-log.md, portfolio-main-qa.md) |
| R3F ecosystem, precedent sites, camera options | Research reports (report1.md, report2.md) |
| Content for portfolio (what goes on the site) | Project prompt §6, resume.tex, repos.md |
| Cleave project details | SPEC.md (Cleave), PLAN.md (Cleave), LandingPage.tsx |
| Ferguson Lab research context | FERGUSON_LAB.md, CLAUDE.md, Methylation Paper.md |
| Amaro Lab context | biochemcore-syllabus.md, SUMMARY.md |
| Writing voice and anti-AI rules | anti-ai-writing-style-guide.md |

---

*End of PLAN.md.*

---
