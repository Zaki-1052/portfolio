Here's the full session 3 planning log with all decisions resolved and context preserved.

---

## Portfolio planning: session 3 log

**Date:** June 24, 2026 **Continuity:** Follows session 2 (June 23, 2026). Session 2 settled the architecture (single continuous descent with FOV-focus dendrites), content tiering, contact placement, light mode decision, depth indicator concept, and personal content distribution. This session resolves all remaining blocking decisions and most design work items from the future directions document.

---

### Decisions made

#### 1. Camera choreography: GSAP as production runtime, Theatre.js as dev-time authoring tool

**Decided:** The camera descent is driven by GSAP ScrollTrigger scrubbing a timeline that maps scroll progress (0 to 1) to camera position, rotation, and other animated properties. Lenis provides smooth scroll and syncs to GSAP's ticker. A Zustand store holds the current `depth` value (0 to 1). This is the production runtime. No dedicated camera choreography library is a runtime dependency.

Theatre.js (`@theatre/r3f`) is layered on during development as a visual keyframe editor for finding and tuning camera positions, easing curves, and transition timing. The workflow: use Theatre.js Studio to visually author the camera path, export the keyframe data to JSON, then use those values with GSAP in production. Theatre.js and its Studio are excluded from the production bundle (conditionally imported only in development builds).

**Why not the alternatives:**

- **Drei ScrollControls** creates an invisible HTML scroll container inside the R3F canvas context, meaning content lives in WebGL, not the real DOM. This conflicts with the accessibility requirement for semantic HTML sections alongside the canvas.
- **r3f-scroll-rig** from 14islands has the right progressive-enhancement model (real HTML, WebGL as enhancement), but it has roughly 241 weekly npm downloads, unanswered issues from early 2026, and its own docs warn that its SmoothScrollbar "is usually laggy" on mobile. Betting the architecture on a niche library with maintenance concerns is an unnecessary risk, especially since the planned architecture (real HTML sections + fixed canvas + GSAP ScrollTrigger) already achieves the same HTML-first content structure without the library.
- **Theatre.js** as a runtime dependency is risky because `@theatre/r3f` is still labeled "pre-release software" with docs last edited February 2024. As a dev-time tool that doesn't ship to production, the stability concern doesn't apply.

**Technical architecture (for implementation):**

The page is structured as real HTML `<section>` elements, each `min-height: 100vh`, representing the scrollable content. A single fixed, full-viewport `<Canvas>` sits behind them (CSS `position: fixed; inset: 0; z-index: -1` or equivalent). Lenis wraps the scroll and drives GSAP's ticker:

```
lenis.on("scroll", ScrollTrigger.update)
gsap.ticker.add((time) => { lenis.raf(time * 1000) })
gsap.ticker.lagSmoothing(0)
```

A GSAP ScrollTrigger instance maps total scroll progress to a `depth` value (0 to 1) stored in Zustand. Each scale level's R3F component reads `depth` and determines its own visibility, camera target position, opacity, and post-processing parameters. The camera position is driven by a GSAP timeline with `scrub: true`, keyframed at positions corresponding to each scale's scroll range.

#### 2. Transition design: hybrid z-motion crossfade with a special cortex-breakthrough moment

**Decided:** Transitions between scale levels use a hybrid of camera z-motion (pushing forward/deeper) and opacity crossfade. Each scale is its own R3F scene component that mounts/unmounts based on scroll progress. In the transition zone (roughly 10 to 15% of each transition's scroll range), both the outgoing and incoming scale are partially visible, with the outgoing fading out and the incoming fading in while the camera moves forward along the z-axis.

The one exception: the tissue-to-cellular transition gets a special "breaking through the cortex" moment. The camera pushes through the folded cortex surface (modeled as a shell with an opening or breakable membrane), revealing the dendritic tree on the other side. This is the most cinematic beat in the descent and marks the shift from "welcome, this is who I am" to "here's my actual work." The extra art-direction effort is worth it because this is the transition visitors experience first after the hero section.

All other transitions (cellular to chromatin, chromatin to protein, protein to code, code to expression) use the standard crossfade-with-z-motion pattern. This gives a consistent rhythm with one standout moment.

**Precedent reasoning:** The crossfade-with-z-motion is essentially the Neal.fun Deep Sea pattern adapted for 3D (creatures fading in/out at depth zones, here applied as entire scale scenes). Pure continuous zoom (Cell Size and Scale style) was rejected because it requires all six scales of geometry rendered simultaneously at vastly different sizes, which causes floating-point precision issues and enormous computational cost. Geometry morphing was rejected because the topology between scales (brain surface to dendritic tree to chromatin fiber to protein) has no meaningful correspondence for morph targets.

#### 3. Typography system: three typefaces with scale-boundary switching

**Decided:** The site uses three typeface families. The active display/heading typeface shifts at scale boundaries (not gradually). Body text uses one consistent sans-serif throughout.

|Role|Typeface|Where it dominates|
|---|---|---|
|Serif (warm/organic headings)|**Lora** (primary) or Crimson Text (alternative to test)|Tissue and cellular scale levels|
|Sans-serif (body text, UI, nav)|**Inter**|All scales, consistent throughout|
|Monospace (code/terminal headings)|**Fira Code**|Code/terminal and expression scale levels|

**Why these specific typefaces:**

- **Lora** has brushed, calligraphic curves that feel organic and warm on screen. It's a Google Font (free, fast CDN delivery). Crimson Text is the backup to evaluate if Lora feels too heavy or too calligraphic in context. Both are prototyping-phase decisions: the choice between them depends on how they look against the 3D scenes.
- **Inter** is the standard screen-optimized sans-serif with optical sizing in its variable font. It's neutral enough to serve as body text across the warm-to-cool gradient without conflicting with either the serif or monospace register. It pairs naturally with the Atom One Dark aesthetic.
- **Fira Code** is Zara's actual editor font (VS Code with Atom Dark Pro theme, setup from Fireship.io). Using her real coding font at the terminal level is the most authentic choice for the "code is my medium" register. Fira Code also has programming ligatures, which add visual personality to any code snippets displayed.

**How the shift works:** At each scale boundary, a CSS class or custom property update switches the heading/display font family. The transition happens at the same scroll threshold as the scale transition itself, so the typography shift is part of the broader atmospheric change (color, post-processing, fog). The body font (Inter) never changes. Navigation, labels, and small UI text use Inter regardless of scale.

The intermediate scales (chromatin, protein) use Inter for headings as well, serving as a neutral bridge between the serif and monospace extremes. This means the serif appears at the top two levels, Inter handles the middle, and Fira Code takes over at the bottom two.

#### 4. Color palette: Atom One Dark with per-scale accent emphasis

**Decided:** The color system is rooted in the Atom One Dark palette, with each scale level emphasizing different colors from that palette to create the warm-to-cool gradient. The palette does not introduce colors alien to Atom One Dark; instead, it shifts emphasis and subtly adjusts the background and fog temperatures.

**Per-scale color registers:**

|Scale|Primary accent|Background shift|Atmospheric notes|
|---|---|---|---|
|Tissue/brain|Warm gold-amber (`~#e5c07b` pushed warmer)|Warmer than base (`~#2c2a28`)|Heaviest bloom, golden light temp, soft fog, film grain|
|Cellular/neuron|Magenta-rose (between `#c678dd` and `#e06c75`)|Slightly cooling|Moderate bloom, warm-to-neutral light|
|Chromatin/nuclear|Blue (`#61afef`)|True Atom One Dark base (`#282c34`)|Visual "home base" of the palette, neutral post-processing|
|Protein/MD|Cyan (`#56b6c2`)|Slightly cooler than base|Sharper rendering, bloom decreasing|
|Code/terminal|Green (`#98c379`) with blue secondary|Darker (`~#21252b`)|Minimal post-processing, digital clarity|
|Expression/contact|Continues code register, subtle warmth return possible|Same as code or slight warm return|Bookend effect optional|

**Implementation mechanism:** CSS custom properties (`--accent`, `--bg`, `--text`, `--fog-color`, etc.) are defined per scale and transitioned via GSAP as scroll progress crosses scale thresholds. The same scroll progress drives shader uniforms for the 3D scenes: fog color, directional light color/temperature, bloom intensity, film grain amount, and depth-of-field strength. Post-processing effects (bloom, grain, vignette, DOF) are heaviest at the tissue level and progressively stripped away toward the code level, where the rendering is clean and sharp.

This is explicitly a prototyping-phase decision in terms of exact hex values and tuning. The structure and direction are settled; the specific numbers will be refined when the scenes are visible and can be evaluated in context.

#### 5. HTML content positioning: arrival and content phases per scale

**Decided:** Each scale level has two scroll phases:

1. **Arrival phase:** The 3D scene fills the viewport. Any text is minimal and overlaid (a scale label, a section title, or nothing). This is the immersive moment. Transitions between scales happen during arrival phases.
    
2. **Content phase:** The 3D scene recedes to a background/atmospheric role (dimming, pulling back, or reducing opacity). Real HTML content scrolls into view, positioned center or offset in the viewport. This is where project descriptions, publication info, the terminal listing, etc. live.
    

The scroll progression within each scale goes: arrival (immersive 3D) then content (HTML-forward with 3D as atmospheric backdrop). This avoids the choice between "all overlay" (which makes text hard to read against complex 3D) and "all alternating" (which breaks the immersion by having the 3D disappear entirely between sections).

#### 6. FOV-focus dendrite interaction: medium-detail project cards

**Decided:** When a visitor clicks a dendritic branch at the cellular level, the camera pivots smoothly toward that branch. The other branches dim (reduced opacity/emissive). Project cards fade in as HTML elements positioned near the branch tips.

Card detail level is a middle ground: title (as link to GitHub/paper), one-sentence description, and a few tech/domain tags. Not a full paragraph, not just a bare title. This gives enough information to orient a visitor without making the dendrite interaction feel like a full project page.

The interaction is optional and lightweight. If a visitor scrolls past without clicking, they see the full tree, get a visual hint of interactivity (labels, maybe a subtle animation on first view), and continue to the next scale. Projects featured in the dendrite cards are the same Tier 1 projects that appear later in the descent at their respective scale levels. The dendrite cards are a navigation shortcut and overview, not the only place to find project information.

Clicking a different branch transitions the camera and swaps visible cards. Clicking the active branch again (or a "back to overview" control) returns to the full tree view.

#### 7. Depth indicator: right-edge vertical scale bar with magnification readout

**Decided (visual specifics):**

- **Position:** Right edge of the viewport, vertically centered. Offset slightly from the edge so it doesn't read as a scrollbar.
- **Visual treatment:** Thin vertical line (1 to 2px, low opacity) with small dots at each scale boundary. The active scale's dot is visually distinct (brighter, slightly larger, subtle glow matching current scale's accent color). The line segment between the previous and next scale dots fills or highlights as scroll progresses through the current scale, showing intra-level progress.
- **Magnification readout:** A small label next to or offset from the active dot, showing scale name and magnification (e.g., "cellular · 100×"). Low-contrast type that doesn't compete with content. Text crossfades on scale transition. Magnification numbers are evocative, not scientifically precise.
- **Click behavior:** Clicking any dot smooth-scrolls to that scale level (jump-nav).
- **Responsiveness:** On mobile, the indicator should shrink or simplify (possibly just dots, no line) to avoid occupying too much of the narrow viewport.

#### 8. Terminal directory listing: pure terminal aesthetic for Tier 2 projects

**Decided:** Tier 2 projects appear at the code/terminal scale level as a styled `ls -la` directory listing. Pure terminal aesthetic: monospace font (Fira Code), Atom One Dark syntax coloring, terminal-style formatting with `drwxr-xr-x` permissions, project name as link, and one-line description.

Example format:

```
~/projects $ ls -la
drwxr-xr-x  GPTPortal        Multi-provider AI chat interface       ★ 397
drwxr-xr-x  WebReg           UCSD course enrollment auto-enroller
drwxr-xr-x  AO3-Explorer     Reading history exporter + explorer
drwxr-xr-x  YeastMSA         Reference-guided MSA, w303 genome
drwxr-xr-x  MPro-Analysis    SARS-CoV-2 protease MD analysis
drwxr-xr-x  Crime-Analysis   Political leaning vs. incarceration
```

Hover highlights the row, click follows the link to GitHub. Star counts included where notable (GPTPortal).

A possible `cat README.md` expansion (clicking a row shows a few more lines of detail) is a candidate for prototyping. It's a fun interaction that fits the terminal metaphor, but it should be evaluated in context to see if it adds value or is overengineering a secondary section.

#### 9. "Currently working on": brain/hero level status line

**Decided:** A short status line at the brain/hero level, positioned below or near the intro text. Format like: "currently: molecular dynamics of 5-HT2A at Amaro Lab" or similar. Updated manually when focus shifts.

This is at the brain level because it's core identity information: "who is this person and what are they doing right now" is the first question any visitor has. Burying it at the code level would require scrolling through the entire descent to find it. The vmfunc.re `.plan` file is the precedent: status information belongs at the identity layer.

#### 10. Loading/intro sequence: typed intro then zoom-in animation

**Decided:** The site opens with a brief typed text sequence that covers loading time and sets the tone, then transitions into a cinematic zoom-in that brings the visitor to the tissue/hero level.

**Sequence:**

1. On initial load, a dark screen with a typed intro appears. This could be styled as a microscope calibrating, a terminal booting, or a simple typed name/title/tagline sequence. The aesthetic should bridge the warm and cool registers (it's the entry point before the visitor is "at" any scale level). The typing covers asset loading time.
2. When the 3D scene is ready, the typed text fades or dissolves, and the camera zooms in from an exterior view of the brain to the tissue level. This is 2 to 3 seconds of cinematic camera motion that introduces the descent mechanic and delivers an immediate wow moment.
3. The visitor arrives at the hero section. Scroll is now active.

If assets load very quickly (faster than the typed intro finishes), the intro still plays through to completion. The intro is not a loading screen that disappears when content is ready; it's a deliberate opening sequence that happens every visit. This is a creative choice: the portfolio is a curated experience, and the first moments are part of the curation.

**Why not immediate content (Option B from the previous discussion):** Getting to content immediately is the right default for most websites, but this is not most websites. The whole premise is an immersive experience where the descent metaphor is the point. An immediate start without a cinematic opening would undercut the ambition. If someone wants to skip to content, the depth indicator (which appears after the intro) provides jump-nav.

#### 11. SWC vs. L-systems for neuron geometry: start with L-systems

**Decided:** Start with procedural L-system branching for the dendritic tree at the cellular level. This gives total control over the aesthetic (branching angle, depth, taper, curvature) without needing to download, parse, or clean external datasets. Real neuron morphologies from NeuroMorpho.org don't always look "good" in the artistic sense, and the design direction is evocative abstraction, not anatomical accuracy.

If the L-system result feels too generic or artificial, real SWC data from NeuroMorpho.org can be imported as reference geometry, potentially blending real morphology with procedural smoothing. But L-systems are the starting point.

#### 12. Mobile capability detection: GPU-tier classification with static fallback

**Decided:** Use the `WEBGL_debug_renderer_info` WebGL extension to read the GPU name, then classify devices into tiers:

- **Full 3D:** Apple A14+ (iPhone 12+), Qualcomm Adreno 640+ (Snapdragon 855+, roughly 2019 and later), and equivalent.
- **Simplified fallback:** Older devices get a static or lightly animated version of the descent. The same HTML content sections, with CSS-animated atmospheric backgrounds (gradients, subtle noise textures, warm-to-cool color shift) and no canvas. This preserves the descent concept and all portfolio content without WebGL.

The 3D is a progressive enhancement for capable devices, not a requirement for the experience.

#### 13. Accessibility audit pattern: HTML-first, one scale level before 3D

**Decided:** The first implementation task is building the complete HTML structure for one scale level (tissue/brain is the candidate) with no 3D. Validate it with: screen reader testing, keyboard navigation, URL fragment (`#tissue`), and `prefers-reduced-motion` disabling all animations. Then layer the 3D on top without breaking any of those behaviors.

This is a day-one task, not a late-stage hardening step. The semantic HTML layer is the foundation, and the 3D is the enhancement.

---

### Confirmed from session 2 (still holds)

These decisions from sessions 1 and 2 were not revisited and remain in effect:

- **Architecture:** Single continuous scroll descent with FOV-focus dendrites as interactive index
- **Tech stack:** Vite + React + TypeScript SPA, R3F + Drei + postprocessing, Lenis + GSAP ScrollTrigger, Zustand for depth state
- **Content tiering:** Tier 1 (Hi-C, methylation, 5-HT2A, Cleave, MetaENCODE, publications), Tier 2 (GPTPortal, WebReg, AO3, YeastMSA, MPro, Crime Analysis), Tier 3 omitted
- **No Blender:** Procedural generation only
- **Dark mode only:** No light toggle
- **Evocative abstractions:** Not anatomical accuracy
- **External links:** Resume/publications open in new tabs, no embedding
- **Zara writes all copy:** Claude helps with structure, not prose
- **No blog initially**
- **Scale levels:** Tissue (brain/hero) then cellular (neuron/dendrites) then nuclear (chromatin) then protein (MD) then code (terminal) then expression (contact)
- **Contact info:** Expression layer at the bottom of the descent
- **Personal content:** Woven throughout, strongest at brain level and code/terminal level

---

### Remaining open items

These are items that are either explicitly deferred to prototyping, need Zara's input on content, or are smaller design details that don't block implementation.

**Prototyping-phase decisions (resolve during build):**

- **Lora vs. Crimson Text** for the serif typeface. Both should be tested against the actual 3D scenes. Lora is the starting choice.
- **Exact color hex values** per scale. The direction and palette structure are settled, but the specific tuning happens when scenes are visible.
- **`cat README.md` expansion** for Tier 2 terminal listing. Fun concept, worth prototyping to see if it adds value or overcomplicates the section.
- **Dendrite card detail balance.** The middle ground is defined (title + one sentence + tags), but the exact layout and density should be evaluated in context.
- **Expression/contact layer warmth return.** Whether the final scale level adds a subtle return to warmer tones as a bookend, or stays fully in the cool register.
- **Intermediate scale typography.** The chromatin and protein levels use Inter for headings (the neutral bridge). Whether this needs any additional typographic personality is a prototyping question.
- **Snap points at scale boundaries.** The research reports mention scroll-snap at each scale boundary. Whether this feels good or interrupts the continuous flow needs to be tested.

**Content work (Zara's side):**

- **Write all copy.** The structure for each scale level's content is now defined. Zara writes to fit the arrival/content phase pattern.
- **Define the typed intro text.** What does the opening sequence actually say? This sets the tone for the entire experience. Zara writes this.
- **Define "non-research interests."** The prompt says personality and non-research interests are included, but doesn't specify what those are. This affects the brain/hero level content.
- **Define the "currently working on" status line text.** The placement is decided (brain/hero level), but the content is Zara's.
- **Gather all assets.** GitHub URLs for all Tier 1 and Tier 2 projects, publication links (when available), resume PDF, social links, profile photo if used.

**Smaller design details (can resolve during prototyping):**

- **Depth indicator mobile treatment.** The desktop design is specified. Mobile may need a simplified version (dots only, no line, smaller footprint).
- **Typed intro aesthetic.** Which visual register does the intro use? Terminal-style typing, microscope calibration, or something else. This sets the first impression before the warm/cool gradient begins.
- **"Back to overview" control for dendrite FOV-focus.** How does a visitor return to the full tree view after focusing a branch? A small button, clicking the same branch again, or both.
- **Tier 1 project featured moments at their respective scales.** The dendrite cards provide an overview, but each Tier 1 project also gets a visual moment at its scale level (Hi-C and methylation at chromatin, 5-HT2A at protein, Cleave and MetaENCODE at code). The exact format of those featured moments hasn't been designed yet.
- **Performance profiling on target devices.** The targets (under 100 draw calls, under 5 MB assets, 60 fps) need real measurement once geometry is in the scene. Procedural generation helps, but validation is needed.

---