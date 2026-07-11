
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
