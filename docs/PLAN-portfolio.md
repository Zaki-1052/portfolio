
---

# PLAN.md

---

# Biological Scale Descent Portfolio: build plan

> The build roadmap. Each phase produces a verifiable increment. Steps within a phase are ordered by dependency. The spec (SPEC.md) has the technical details; this document tells you what to build and when.

---

## Current status

**Phases 0-4 complete. Phase 5 ready.** Phases 0-2 (scaffolding, content layer, scroll engine) shipped the full HTML site with depth-driven theming. Phase 3 shipped the tissue/brain scene (sculpted shell with reaction-diffusion coils, atmosphere system, cortex breakthrough). Phase 4 shipped the cellular/arbor scene (procedural branching tree with fluorescence look, signal pulses, scene-native annotations). The Phase 4 arbor rework established the graphics-first content pattern: under WebGL, HTML document content is `display:none` and all content is scene-native annotations pinned to 3D anchors.

Phases 5-8 (coil, structure, code, expression) were revised on 2026-07-06 to match the quality bar and interactivity of the tissue and cellular scenes. Each scale is now its own phase with full specification. Ready for Phase 5 (coil).

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

## Phase 5: coil scale (third band)

> **Language convention (STRICT):** all code, comments, docs, and session logs use ONLY neutral geometric/design vocabulary — "coil," "fiber," "bead," "thread," "spool," "strand," "loop," "arc," "region," "locus," "cluster." The existing `'chromatin'` scale identifier stays (wired end-to-end in the engine). See `docs/p5-plan-coil-scene.md` for the full design specification.

> **Goal:** A polished, interactive threaded-bead coil scene in the same graphics-first register as tissue and cellular. Publication content is scene-native — luminous annotations anchored to 3D geometry, not HTML documents overlaying a dimmed backdrop. The cellular-to-coil transition works.
> **Estimate:** 5-7 days.

### Prerequisites

- Phase 4 complete

### Content display pattern (Phase 4 precedent, applies to all remaining 3D scales)

The Phase 4 arbor rework established the standing rule: under `[data-webgl='active']`, in-flow HTML document content is `display:none`. The visible content is scene-native — luminous annotations, hairline connectors, and interactive cards pinned to projected 3D anchor points. The no-WebGL fallback keeps the full document version untouched. This is the template. The coil and structure bands adopt it here. See `docs/p4-plan-arbor-scene.md` and `logs/2026-07-05_phase-4-scene-native-rework.md` for the full rationale and implementation reference.

### 5.1 Coil fiber geometry

Build `src/scales/chromatin/CoilScene.tsx`. The scene shows a dense coil — oblate disc beads threaded along a helical fiber path. The geometry:

- **Fiber path:** A Catmull-Rom spline defining the coiled trajectory of the fiber. The path should have enough length and curvature to fill the viewport with a section of fiber that feels like part of a larger structure extending beyond the frame.
- **Disc beads:** Instanced sphere geometry (InstancedMesh, one draw call) positioned along the spline at regular intervals. Each bead is an oblate spheroid — wider than tall, a flattened disc shape. Approximate dimensions: wider than tall, suggesting wrapped thread.
- **Linker threads:** Thin tube geometry connecting beads along the spline path. This is the visible backbone of the fiber.
- **Fiber topology:** The fiber should show a solenoid or zigzag packing — beads arranged in a helical pattern around a central axis, not strung flat like a necklace. Dense, tightly packed coiling is the visual target (evocative, not literal).

The fiber gently undulates on a slow time-driven oscillation (breathing motion, like the arbor's signal pulse but slower and more fluid). Scroll position controls the camera's relationship to the fiber, not the fiber's motion.

### 5.2 Coil shading and atmosphere

Follow the established material patterns: custom ShaderMaterial with hand-rolled lighting, manual exp2 fog, no scene lights.

- **Lighting:** Blue accent key (#61afef), cool hemisphere ambient. This is the Atom One Dark "home base" — the visual midpoint of the warm-to-cool gradient. Neutral compared to tissue's golden warmth and the next band's cyan chill.
- **Bead surface:** Subtle procedural texture suggesting wrapped thread — fine parallel grooves or a shallow helical ridge on each bead's surface. Enough to read as "wrapped" without being literal.
- **Linker threads:** Slightly emissive, thinner than the beads, glowing faintly blue.
- **Atmosphere:** Sparse blue-tinted drift motes (reuse the DriftField pattern from tissue/cellular). Fainter and cooler than the arbor's warm multicolor motes. A faint volumetric haze at distance.
- **Post-processing:** Neutral register — moderate bloom (less than tissue, comparable to cellular), minimal grain, blue-tinted fog. This is the visual equilibrium point of the descent.

### 5.3 Coil unwind interaction (the focus mechanic)

The interaction concept: **structural unwind**. The fiber's compact-to-open state IS the interaction. Clicking a publication locus opens the local region dramatically.

- **Default state:** The fiber is in a compact, tightly packed conformation. The two publication anchors are visible as luminous markers on specific regions of the fiber — subtle glowing loci that invite interaction.
- **Focus interaction:** Clicking a publication locus triggers an unwind — the fiber opens at that region, loop arcs forming between distant loci (thin luminous ribbon streams connecting bead positions). The unwinding animation reveals the publication card as a scene-native annotation pinned to the opened region. The camera pivots toward the focused region (same GSAP-animated focus pattern as the arbor's branch focus).
- **Loop visualization:** When a publication is focused, thick ribbon-like streams of light arc between specific bead pairs. Particles travel along each ribbon suggesting data transmission. These read as "connections between distant regions of the fiber."
- **Unfocused state:** Non-active regions dim (same opacity reduction pattern as the arbor). Clicking the active region or an escape control returns the fiber to its compact state.
- **Two publications:** Titles pulled from `content/publications.json`. Each anchored to a distinct region of the fiber.

### 5.4 Scene-native publication annotations

Build `src/scales/chromatin/CoilAnnotations.tsx`. Same architectural pattern as `ArborAnnotations.tsx`:

- Luminous pure-type labels + hairline connectors pinned to projected 3D anchor points on the fiber.
- Positioned imperatively on the gsap ticker (no React re-renders per frame).
- Publication cards on focus: title, venue, status (in preparation), description, and links. All real interactive elements (buttons, links).
- Keyboard-navigable (Esc to unfocus, Tab between publications).
- Scroll-release hint on first focus.

### 5.5 Coil intro overlay

Build `src/scales/chromatin/CoilIntro.tsx`. Same pattern as `ArborIntro.tsx` — a fixed overlay that resolves out of the haze with the fiber and clears before the publication annotations arrive. Reads prose from `content/sections/chromatin.md`. Cooled-lens legibility approach adapted for the blue register.

### 5.6 Cellular-to-coil transition

Wire the transition at the cellular/coil boundary. The arbor scene fades out via depth-enveloped opacity while the coil fiber fades in. The camera advances along z. Fog color shifts from the cellular palette toward the neutral Atom One Dark blue. No cinematic breakthrough here — this is a standard crossfade-with-z-motion, but tuned so the fiber's first beads emerge from the same haze the arbor dissolves into.

### 5.7 Integration and post-processing verification

Scroll from tissue through cellular into the coil band. The fiber renders with blue lighting and neutral post-processing. Click each publication locus — the fiber unwinds, loop ribbons appear, publication card anchors to the opened region. Links work. Scroll past the coil band; the fiber fades.

**Verify:** Both publications are accessible via scene-native annotations. The unwind interaction feels fluid (animation 400-600ms). The warm-to-neutral post-processing gradient is continuous through the transition. Performance stays under budget (target: under 15 draw calls for the coil scene — instanced beads 1 draw call, linker tubes 1, loop ribbons 1, atmosphere 2-3, annotations are HTML).

### Phase 5 done criteria

- Coil fiber renders with instanced disc beads, linker threads, and solenoid packing
- Unwind interaction works (click locus, fiber opens, loop ribbons form, card appears)
- Both publications accessible as scene-native annotations
- Coil intro overlay resolves from haze and clears before annotations
- Cellular-to-coil transition works end-to-end
- Post-processing at neutral midpoint of the warm-to-cool gradient
- No-WebGL fallback shows the full document version from Phase 1
- Performance baseline recorded

---

## Phase 6: protein scale

> **Goal:** A real molecular structure rendered from PDB data (9AS8, the 5-HT2A receptor system), with scroll-driven trajectory animation from actual MD simulation data. Scene-native content for the Amaro Lab and structural biology work.
> **Estimate:** 7-10 days. This phase includes a data pipeline step (PDB/DCD parsing) before scene construction.
>
> **Sub-plan:** `docs/PLAN-protein-scale.md` (session-phased implementation).
> **Design spec:** `docs/protein-scale-design.md` (authoritative, supersedes this section where they diverge).

### Prerequisites

- Phase 5 complete
- PDB file for 9AS8 (5-HT2A receptor, membrane-embedded)
- DCD trajectory files from OpenMM MD simulation of 9AS8
- Optionally: PDB file for 9LL8 (100ns trajectory, if available by this point)

### 6.1 PDB parser and geometry extraction

Build `src/utils/pdb-parser.ts`. Parse PDB files to extract atomic coordinates, residue information, and chain assignments. The parser needs to produce geometry-ready data structures:

- **Backbone trace:** C-alpha positions for each chain, ordered by residue number. This drives ribbon/tube geometry.
- **Secondary structure:** Helix and sheet assignments from the PDB HELIX/SHEET records (or DSSP if needed). These control ribbon width/shape — helices as wide ribbons or cylinders, sheets as flat arrows, coils as thin tubes.
- **Chain boundaries:** Separate chains for the receptor, G-protein subunits, and membrane lipids.
- **Ligand positions:** Psilocin coordinates for highlighting.

The parser runs at build time (Vite plugin or pre-build script) and outputs a compact JSON representation — not the raw PDB text. This JSON ships in the bundle; the PDB file does not.

### 6.2 Trajectory data pipeline

Build `scripts/process-trajectory.ts` (or Python script, whichever handles DCD format better). Process the MD trajectory:

- Read the DCD trajectory file (binary format — may require a Python script using MDAnalysis, which Zara already has installed).
- Cluster frames by RMSD to extract ~50-100 representative conformations. This condenses the full trajectory (potentially thousands of frames) to a manageable set that captures the essential motion.
- Export as a compact binary or JSON format: an array of frames, each frame an array of C-alpha positions. Strip solvent, keep protein + ligand + optionally lipid headgroups.
- The output file ships in `public/` and is loaded at runtime (or lazy-loaded when the protein scale mounts).

**This step produces a command and instructions for Zara to run** — the actual processing happens in Zara's environment where MDAnalysis and the trajectory files live. The output is committed to the repo.

### 6.3 Protein scene geometry

Build `src/scales/protein/ProteinScene.tsx`. The scene renders the 5-HT2A receptor complex from real structural data.

- **Receptor body:** Ribbon/tube geometry built from the parsed backbone trace. TubeGeometry segments along Catmull-Rom splines through C-alpha positions, with width modulated by secondary structure (wider for helices, narrow for coils). The seven transmembrane helices of the GPCR should be visually prominent. One merged geometry, one draw call.
- **Membrane:** A translucent disc or plane at the membrane boundary. Semi-transparent, with a subtle procedural ripple (vertex displacement noise). This contextualizes the receptor as membrane-embedded without dominating the scene. Rendered with alpha blending, behind the protein. 1 draw call.
- **G-protein complex:** The Gi/Gq subunits rendered as a simpler ribbon trace below the membrane. Slightly dimmer than the receptor to establish visual hierarchy. 1 draw call.
- **Ligand (psilocin):** A small glowing marker at the binding site. Bright cyan accent. Could be a sphere, a small ball-and-stick, or just a luminous point. 1 draw call.
- **Overall aesthetic:** The protein should feel like a high-quality molecular visualization — not a biology textbook illustration, but something that reads as real data rendered beautifully. Cyan accent lighting (#56b6c2). Cooler and sharper than the coil band.

### 6.4 Trajectory animation

The scroll position drives the trajectory frame. As the visitor scrolls through the protein scale's depth band, the protein conformation smoothly interpolates between the representative frames extracted in 6.2.

- Vertex positions lerp between adjacent keyframes based on `scaleProgress` (the local 0-1 progress through the protein band). This means scrolling forward advances the simulation in time, and scrolling backward rewinds it.
- The motion should be subtle — the overall fold is stable, but loops flex, helices shift slightly, the ligand wobbles in its binding pocket. This is what MD trajectories actually look like: not dramatic unfolding, but continuous thermal breathing.
- A slow time-driven ambient pulse layers on top of the scroll-driven frame (similar to the coil fiber's breathing). This keeps the protein alive when the user pauses scrolling.
- Under reduced motion: the protein is static at the middle frame. No interpolation, no pulse.

### 6.5 Protein shading and atmosphere

Custom ShaderMaterial following established patterns.

- **Lighting:** Cyan key light, cool hemisphere ambient. Sharper and colder than the coil band. The post-processing gradient continues its descent — less bloom than the coil band, less grain, colder fog.
- **Protein surface:** Per-residue coloring options (chain-based, or secondary-structure-based — helices one hue, sheets another, coils a third). All within the cyan register. Subtle fresnel rim.
- **Membrane:** Low-opacity, slightly warm-tinted (a hint of the lipid bilayer's organic nature against the cool protein). Procedural noise displacement for the ripple.
- **Atmosphere:** Sparse cyan drift motes. Fainter than the coil band's. The scene should feel clean and precise — a step toward the digital clarity of the code scale.

### 6.6 Scene-native protein annotations

Build `src/scales/protein/ProteinAnnotations.tsx`. Same pattern as coil/arbor annotations.

Two Tier 1 projects anchor to the scene:
- **5ht2a-md:** "Post-synaptic CNS membrane protein MD" — anchor near the receptor body or ligand binding site.
- **mpro-analysis:** "MPro allosteric pathway analysis" — anchor at the G-protein interface or a secondary position on the structure.

Focus interaction: clicking an annotation anchor pivots the camera toward that region of the structure. The trajectory animation could emphasize the focused region (e.g., when focused on the binding site, the ligand's motion is more prominent). Non-focused regions dim.

Publication cards show: title, one-liner, tags, links (GitHub where available). Same luminous annotation register as the arbor and coil scenes.

### 6.7 Protein intro overlay

Build `src/scales/protein/ProteinIntro.tsx`. Same resolve-from-haze pattern. Reads prose from `content/sections/protein.md`. Cyan-register lens treatment.

### 6.8 Chromatin-to-protein transition

Standard crossfade-with-z-motion at the coil/structure boundary. Fog shifts from neutral blue toward cyan. The coil fiber dissolves as the structure scene emerges from the haze.

### 6.9 Integration test

Scroll from the coil band into the structure band. The receptor complex renders from real PDB data. Scrolling through the band drives the trajectory animation — the protein breathes. Click each project anchor — camera pivots, card appears. Links work. The warm-to-cool gradient is continuous.

**Verify:** The protein is recognizably a real molecular structure (not an abstract blob). Trajectory animation is smooth and subtle. Both project annotations are accessible. Performance stays under budget (target: under 12 draw calls — protein body 1, membrane 1, G-protein 1, ligand 1, atmosphere 2-3, annotations are HTML).

### Phase 6 done criteria

- Protein structure rendered from real PDB data (9AS8)
- Trajectory animation driven by scroll position from processed DCD data
- Membrane rendered as translucent contextual element
- Scene-native annotations for both structural biology projects
- Protein intro overlay resolves from haze
- Chromatin-to-protein transition works
- Post-processing continues the cool-ward gradient
- PDB parser and trajectory processing pipeline documented and reproducible
- No-WebGL fallback shows the full document version from Phase 1

---

## Phase 7: code/terminal scale

> **Goal:** An interactive terminal scene rendered as 3D geometry in the macOS/iTerm2 aesthetic. Software projects are navigated through scroll-driven terminal commands, not HTML document sections. The terminal is the structure.
> **Estimate:** 5-7 days.

### Prerequisites

- Phase 6 complete

### 7.1 Terminal window geometry

Build `src/scales/code/CodeScene.tsx`. The scene is a 3D terminal window in the iTerm2/macOS aesthetic, rendered as geometry in the R3F canvas.

- **Window chrome:** A rounded-rect plane (or extruded shape) with macOS title bar — three traffic-light dots (close/minimize/maximize), a centered title ("zara@macbook ~ %"), and the characteristic dark title bar with subtle separation from the content area. Rendered as a ShaderMaterial with the chrome elements drawn procedurally in the fragment stage (no texture, no HTML).
- **Terminal body:** A dark plane below the title bar. This is the surface where terminal output renders. The green-on-dark Atom One Dark terminal palette (#98c379 text on #21252b background).
- **Window depth:** The terminal has slight 3D depth — a thin extruded edge giving it physical presence in the scene, not a flat card. Subtle shadow/ambient occlusion at the edges.
- **Scene environment:** The terminal floats in a dark void with faint atmospheric elements — sparse green-tinted grid lines receding into depth behind the window, or subtle code-rain particles at very low opacity in the background. The terminal window is the hero; the environment is secondary atmosphere.

### 7.2 Terminal text rendering

Terminal output needs to render inside the 3D window. Approaches (evaluate during implementation):

- **SDF text rendering:** Generate a signed-distance-field font atlas from Fira Code at build time. Render text as instanced quads with an SDF fragment shader. This gives crisp text at any camera distance and integrates with the post-processing pipeline (bloom on the text gives the authentic terminal glow).
- **Canvas texture:** Render terminal text to a 2D canvas, upload as a texture onto the terminal body plane. Simpler but less sharp at close camera distances and doesn't bloom per-character.
- **Hybrid:** Use drei's `Text` component (which uses troika-three-text / MSDF) for the terminal text, positioned as children of the terminal window group. This gives SDF quality with less custom infrastructure.

Whichever approach: text must be Fira Code, must support Atom One Dark syntax colors (green, blue, yellow, magenta, red, cyan, white for different token types), and must feel like a real terminal — not a screenshot texture.

### 7.3 Scroll-driven command sequence

The core interaction: **scrolling through the code scale's depth band plays a choreographed terminal session.** The visitor doesn't need to type — commands appear and execute as they scroll, like watching a recording of a terminal session at scroll speed.

The command sequence tells the story of the software portfolio:

```
zara@macbook ~ % ls ~/projects/
cleave/    metaencode/    gptportal/    ao3-explorer/    ...

zara@macbook ~ % cat cleave/README.md
# Cleave
Self-hosted CUT&RUN / RNA-seq analysis platform...
[tags: React, FastAPI, PostgreSQL]

zara@macbook ~ % cat metaencode/README.md
# MetaENCODE
Interactive search + exploration of ENCODE metadata...
[tags: SBERT, UMAP, search]

zara@macbook ~/projects % ls -la
total 6
drwxr-xr-x  gptportal/        400 ★   Multi-provider AI chat
drwxr-xr-x  ao3-explorer/     150 MAU  Fanfiction analytics
drwxr-xr-x  yeast-msa/        ---      S. cerevisiae alignment
drwxr-xr-x  crime-analysis/   ---      Chicago crime viz
drwxr-xr-x  webreg/           ---      UCSD enrollment alerts
```

- Each command appears character-by-character (typed effect) as the scroll position advances through a sub-range of the code band. The output appears below it line-by-line.
- The `cat` commands show Tier 1 software project details as terminal-styled output — title, one-liner, tags, links (rendered as `[GitHub]`, `[Demo]` terminal-style markers that are actually clickable).
- The `ls -la` command shows the Tier 2 directory listing — same data as `TerminalListing.tsx` but rendered in the 3D terminal, not as HTML.
- **Autocomplete suggestions:** Before each command types out, a brief autocomplete ghost appears (faint gray text suggesting the command), then the full command types over it. This is a familiar terminal UX detail.
- **Scroll pacing:** Each command+output block maps to a sub-range of the code band's scroll depth. The total sequence is paced so a smooth scroll reveals the full portfolio at a readable speed. Scrolling backward rewinds the session.

### 7.4 Interactive elements within the terminal

Project names and links within the terminal output are interactive:

- **Hover:** A project name highlights (brighter, underlined, cursor change). A faint glow emanates from the highlighted text (bloom pickup).
- **Click:** Opens the project's GitHub link or demo in a new tab. The terminal shows a brief `opening...` feedback line.
- **Keyboard:** Tab cycles through interactive elements within the visible terminal output. Enter activates.
- All interactive elements are accessible (proper roles, labels). The terminal aesthetic doesn't sacrifice usability.

### 7.5 Terminal atmosphere and shading

- **Terminal glow:** The text has a subtle bloom — green characters glow faintly, giving the CRT/phosphor feel without the heavy scanline cliche. Controlled via the post-processing bloom threshold: terminal text is rendered slightly above the HDR threshold so bloom picks it up naturally.
- **Window material:** The title bar has a subtle metallic/brushed finish. The terminal body is matte dark. The traffic-light dots are small, precise circles with correct macOS colors (red, yellow, green).
- **Cursor:** A blinking block cursor at the current input position. Blinks on a timer (standard 530ms period). Position advances as commands type out.
- **Post-processing:** Minimal bloom, no grain, no vignette. This is the digital clarity end of the gradient. The scene should feel clean, precise, and technical.

### 7.6 Protein-to-code transition

The protein structure dissolves as the terminal window emerges. The fog shifts from cyan to the dark, low-fog code register. The aesthetic jump here is intentional — this is where the descent crosses from biological to digital. The transition should feel like "zooming past the molecular into the computational."

### 7.7 Integration test

Scroll from protein into the code scale. The terminal window appears. Scrolling through the band plays the command sequence. Project names are clickable. The typing animation is smooth and well-paced. Scrolling backward rewinds cleanly.

**Verify:** All Tier 1 and Tier 2 software projects appear in the terminal sequence. Interactive links work. The terminal feels like a real macOS terminal, not a CSS mockup. Performance stays under budget.

### Phase 7 done criteria

- Terminal window rendered as 3D geometry with macOS/iTerm2 chrome
- Scroll-driven command sequence plays the full software portfolio
- Text renders in Fira Code with Atom One Dark syntax colors
- Autocomplete ghosts and typing animation feel authentic
- Project names and links are interactive and accessible
- Cursor blinks, output scrolls, the terminal feels alive
- Protein-to-code transition works
- Post-processing at digital-clarity end of the gradient
- No-WebGL fallback shows the Phase 1 HTML terminal listing

---

## Phase 8: expression/contact scale

> **Goal:** An outgoing-signal scene where contact information radiates outward from a central source. The `mail zara` terminal form is the anchor interaction. The descent concludes with a sense of signal leaving the system.
> **Estimate:** 3-5 days.

### Prerequisites

- Phase 7 complete

### 8.1 Signal origin geometry

Build `src/scales/expression/ExpressionScene.tsx`. The concept: the descent has gone from macro (tissue) to micro (protein) to digital (code), and now the signal goes outward — the visitor has reached the contact layer, where information radiates back out into the world.

- **Central node:** A small, bright emissive point or compact geometric form at the scene's center. This is the origin of the outgoing signals. Could be a stylized cursor, a pulsing dot, or a small terminal prompt glyph (the `%` or `$`).
- **Signal lines:** Thin luminous lines radiating outward from the central node in multiple directions. Each line represents a contact channel (email, GitHub, LinkedIn, Bluesky, resume). Lines extend outward and fade into the distance. They pulse periodically — a wave of brightness traveling from center to periphery, suggesting data transmission.
- **Signal aesthetics:** The lines use the green (#98c379) register, continuing the code scale's palette. Each line could carry a distinct secondary tint (GitHub's contribution green, LinkedIn's blue, email's amber) as a subtle color accent at its terminus, but the dominant palette stays in the code register.
- **Particle trails:** Sparse particles travel along the signal lines, moving outward. Small, fast, point-geometry. Like data packets leaving the system. One draw call (instanced points on the line paths).
- **CRT/scanline overlay:** The existing CRT scanline aesthetic from the HTML version carries into the 3D scene. Horizontal scanlines rendered as a full-viewport post-processing effect or a screen-space overlay plane. Very low opacity — a texture, not an obstruction.

### 8.2 Contact annotations

Build `src/scales/expression/ExpressionAnnotations.tsx`. Contact links are scene-native annotations anchored to the terminal endpoints of the signal lines:

- Each signal line terminates at a point where the contact annotation floats — "email" at one terminus, "GitHub" at another, etc.
- The annotations are in the luminous type register: label + icon (if appropriate) + the actual link/handle. All interactive.
- Focus interaction: clicking a signal line or its annotation brightens that line (the signal pulse intensifies) and dims the others. The annotation expands to show more detail (email address, GitHub handle, etc.).
- The camera pivots slightly toward the focused signal line.
- Keyboard-navigable: Tab cycles through contact links.

### 8.3 Terminal mail integration

The `mail zara` interaction from the Phase 1 HTML version is elevated into the scene register:

- A small terminal prompt anchored near the central node or floating below it: `$ mail zara`. This is a scene-native interactive element.
- Clicking it opens the terminal mail form. The form itself can remain as an HTML overlay (it has text inputs and a submit button — these are better as real HTML form elements for accessibility and mobile input). But the overlay should be styled to match the scene's aesthetic: dark background, green terminal text, Fira Code, scanline texture, sharp corners.
- The form triggers and submission logic (Formspree via `useTerminalMail.ts`) remain unchanged from Phase 1.

### 8.4 Expression intro and closing

Build `src/scales/expression/ExpressionIntro.tsx`. This is the closing statement of the portfolio. The intro overlay reads prose from `content/sections/expression.md`. It resolves from the scene haze and clears before the contact annotations arrive.

The closing should feel like an ending — a warm return after the descent. The prose occupies a brief depth window, then the contact channels radiate outward and the visitor has arrived at the bottom of the descent.

### 8.5 Code-to-expression transition

The terminal window from the code scale fades out. The signal lines emerge from where the terminal cursor was — the last command prompt becomes the origin point of the outgoing signals. This connects the two scales narratively: the code produced the signal, and now the signal goes out. Fog lifts slightly (the expression scale is the most open/sparse of the digital scales).

### 8.6 Scroll-to-top and portfolio loop

At the bottom of the expression scale, a subtle visual cue invites the visitor to scroll back up or click a "return to surface" control. This loops the descent — the visitor can re-ascend through all scales. The depth indicator already supports click-to-jump for any scale.

An optional warm color return at the very bottom — the accent hue shifts slightly back toward amber as a bookend, echoing the tissue scale's warmth. This is a single CSS custom property shift, not a new scene.

### 8.7 Integration test

Scroll from code into expression. Signal lines radiate outward. Contact annotations are visible and interactive. The `mail zara` form works. Links open correctly. The descent feels complete.

**Verify:** All contact links are accessible as scene-native annotations. The `mail zara` form submits successfully. The outgoing-signal aesthetic feels like a natural conclusion to the descent. Performance stays under budget (target: under 10 draw calls — central node 1, signal lines 1, particles 1, scanline overlay 1, atmosphere 2-3).

### Phase 8 done criteria

- Signal-origin scene renders with radiating contact lines
- Contact links are scene-native annotations at signal termini
- `mail zara` terminal form works in the scene register
- Expression intro overlay resolves and clears
- Code-to-expression transition connects terminal cursor to signal origin
- CRT scanline overlay is subtle and atmospheric
- Scroll-to-top / return-to-surface control present
- No-WebGL fallback shows the Phase 1 HTML contact section

---

## Phase 8.5: transitions and post-processing gradient verification

> **Goal:** All transitions between adjacent scales work end-to-end. The full post-processing gradient is continuous from tissue (warm, heavy bloom) to expression (cool, clean). A complete scroll from top to bottom feels like one unbroken descent.
> **Estimate:** 1-2 days.

### Prerequisites

- Phase 8 complete

### 8.5.1 Transition sweep

Scroll the full descent in one smooth motion. Verify each transition:

- Approach → tissue (overture zoom, already built)
- Tissue → cellular (cortex breakthrough, already built)
- Cellular → coil (crossfade, Phase 5)
- Chromatin → protein (crossfade, Phase 6)
- Protein → code (aesthetic jump, Phase 7)
- Code → expression (signal-origin emergence, Phase 8)

Each transition should feel distinct but part of the same system. No jarring cuts, no visible seams, no frames where both scenes are at awkward half-opacity.

### 8.5.2 Post-processing gradient

Verify the full gradient across the descent:

| Scale | Bloom | Grain | Vignette | Fog density | Color temperature |
| --- | --- | --- | --- | --- | --- |
| Tissue | Heavy, golden | Visible film grain | Strong | Dense, warm | Warm gold-amber |
| Cellular | Moderate, rose-tinted | Light grain | Moderate | Medium, warm-cooling | Magenta-rose |
| Chromatin | Moderate, neutral | Minimal grain | Light | Medium, neutral | Blue (home base) |
| Protein | Light, cyan | Near-zero grain | Light | Light, cool | Cyan |
| Code | Minimal, green | None | None | Very light | Green-digital |
| Expression | Minimal, green | None | None | Sparse | Green with warm bookend |

The values should interpolate smoothly within transition zones, not step between presets.

### 8.5.3 Reduced motion verification

Toggle reduced motion on. Scroll the full descent. Every scene should be static or absent, all transitions instant, all content accessible. The color gradient and typography shifts should still work (they're position-driven, not animation-driven).

**Verify:** The full descent reads as one continuous experience. The temperature shift from warm to cool is perceptible and smooth. Reduced motion provides a complete, dignified experience.

---

## Phase 9: loading sequence and polish

> **Goal:** The typed intro and zoom-in sequence work. Depth indicator is fully polished. Favicon, OG tags, 404 page, and metadata are in place. The site feels finished.
> **Estimate:** 3-5 days.

### Prerequisites

- Phase 8.5 complete
- Typed intro text: use placeholder text initially (per the content constraint). Zara writes the real intro after seeing the loading sequence in action.

### 9.1 Loading sequence

Build `src/components/LoadingSequence.tsx`. On initial load:
1. Dark screen, typed text sequence (content from a config or content file)
2. Asset loading happens in parallel (React Suspense boundaries around scale components)
3. When 3D is ready AND the typed sequence is complete, crossfade to the zoom-in
4. Camera zooms from far exterior to tissue level (2-3 seconds)
5. Intro sequence fades, hero section revealed, scroll activated

The sequence blocks scroll until complete. It plays every visit (deliberate creative choice).

### 9.2 Favicon and metadata

Create a themed `favicon.svg` (simpler is better; an abstract neuron branch, initials, or a minimal brain silhouette).

Add meta tags to `index.html`: title, description, OG image, OG title, OG description, Twitter card, canonical URL. The OG image should be a static render or screenshot of the hero section.

### 9.3 404 page

Create a themed 404 route. Suggestion: "you've descended past the observable scale" with a link back to the top. Styled in the terminal register (Fira Code, dark background, green text).

### 9.4 Analytics stubs

Wire `useTrackEvent` to log scale transitions, dendrite branch clicks, and scroll depth milestones (25%, 50%, 75%, 100%). All calls go to a no-op by default. When a provider is configured, swap the no-op for the real SDK.

### 9.5 Polish pass

- Depth indicator mobile styling (dots only, no line)
- Keyboard focus indicators styled to match scale accent colors
- Scroll-to-top button at the expression/contact level
- External link icons on GitHub/paper links
- Resume link in the depth indicator area or expression section
- Print stylesheet (optional, but nice: the HTML content layer prints cleanly)

**Verify:** Cold load the site. Typed intro plays. Zoom-in to hero. Scroll through entire descent. All scales, all transitions, all content, all interactions work. Sharing the URL on Twitter/LinkedIn shows a proper preview card. The 404 page renders for invalid routes.

### Phase 9 done criteria

- Loading sequence plays on every visit
- Favicon, OG tags, and social preview work
- 404 page themed and functional
- Analytics hooks stubbed and logging to console in dev
- Mobile depth indicator simplified
- Keyboard focus indicators visible and styled
- All external links open in new tabs

---

## Phase 10: performance, mobile, and ship

> **Goal:** Performance validated on real devices. Mobile fallback tested. Accessibility re-audited with 3D active. Bugs fixed. Ship.
> **Estimate:** 3-5 days.

### Prerequisites

- Phase 9 complete

### 10.1 Performance profiling

Test on target devices:
- Desktop: your dev machine + one Windows machine if available
- Mobile full 3D: iPhone 12+ or recent Android flagship
- Mobile fallback: an older phone (iPhone 8-11 range or ~2018 Android)

Use Chrome DevTools Performance tab and `r3f-perf` to measure: FPS, draw calls, GPU memory, frame time. If any scale exceeds the budget (100 draw calls, sub-60fps on desktop), simplify that scale's geometry or reduce instance counts.

### 10.2 Mobile fallback verification

Force the fallback path on a capable device (override GPU detection). Verify: all content is accessible, the color gradient works via CSS, typography shifts work, depth indicator works, no Canvas rendered, no WebGL errors in console.

### 10.3 Accessibility re-audit

Re-run the Phase 1 accessibility tests with the full 3D layer active:
- Canvas has `aria-hidden="true"`
- Screen reader still reads all content correctly
- Keyboard navigation isn't intercepted by the Canvas
- Reduced motion toggle disables all 3D animations
- Color contrast maintained at every scale

### 10.4 Cross-browser testing

Test in Chrome, Firefox, Safari (WebKit has some Three.js quirks). Verify WebGL context creation, font rendering, and scroll behavior in each.

### 10.5 Final deployment

- Verify production build size (`npm run build`, check `dist/`)
- Ensure cache headers are correct for hashed assets
- Run Lighthouse: target 90+ Performance, 95+ Accessibility, 100 Best Practices
- Test the production URL on multiple devices

### 10.6 Bug fixes and polish

Address anything found in 10.1-10.5.

### Phase 10 done criteria

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
- PDB parser: correct backbone extraction, chain boundaries, residue counts
- Trajectory processor: correct frame clustering, coordinate export, round-trip fidelity
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
