
---

# DESIGN.md

---

# Biological Scale Descent Portfolio: design specification

> Visual language, component patterns, and anti-slop rules for the portfolio. This document governs what the site looks like and how it feels. Apply with judgment: these are principles, not a prison.

---

## 1. Core visual principles

**The biology is the structure, not decoration.** Every biological element on the page must serve a navigational or organizational purpose. The dendritic tree is an index. Chromatin fibers mark the publications layer. The terminal is where code lives. If a biological element is "just a cool visual" with no structural role, cut it.

**Warm to cool is a gradient, not a switch.** The atmospheric shift from organic/warm (tissue) to digital/cool (code) should be continuous and perceptible across the full scroll range. A visitor should feel the temperature change without being able to point to a single moment where it "switched."

**Evocative abstraction over anatomical accuracy.** The biology should *feel right* without being scientifically literal. The people scrolling this site are not cerebellar specialists. The wow factor comes from atmosphere, motion, and craft, not from counting the correct number of folia on the cerebellum.

**Personality without performance.** The site should feel like a real person made it. Warm, specific, opinionated. But not trying too hard. The personality comes from the writing, the project selection, and the care in the craft. Not from wacky animations or ironic humor.

---

## 2. Anti-slop rules

These are things that make portfolio sites look AI-generated or template-derived. Avoid all of them.

**No centered-everything layouts.** The default AI-generated landing page centers every heading, every paragraph, every card grid. Real layouts have alignment variety. Left-aligned body text. Asymmetric hero compositions. Content that breathes to one side.

**No purple/blue gradients as primary decoration.** The "AI portfolio" look is a dark background with a purple-to-blue gradient blob. Atom One Dark's palette is the anchor here. The gradients are warm-to-cool atmospheric shifts, not decorative blobs.

**No uniform rounded corners on everything.** The Cleave landing page (LandingPage.tsx) uses `rounded-2xl` on every card, every section, every element. This reads as template. Vary corner radii, or use none. The tissue/organic scales can have softer radii; the code/terminal scale should be sharp (square corners, hard edges).

**No generic "hero with floating particles" opening.** The intro is the typed sequence followed by the cortex zoom-in. Not a dark screen with drifting dots.

**No icon grids.** The "tech stack" section with 12 little icons in a grid is a portfolio cliche. If specific tools are mentioned, they live in prose or in project descriptions, not in a separate "skills" grid.

**No "About Me" cards with a circular profile photo.** If a photo is used, it's integrated into the tissue/brain scene or the layout in a non-standard way. No centered circle crop with a name underneath.

**No hover-scale on every interactive element.** The `transform: scale(1.05)` on hover is the CSS equivalent of a stock photo. Use it sparingly or not at all. Prefer opacity shifts, color changes, or subtle position adjustments.

**No CSS `backdrop-filter: blur()` glass cards everywhere.** One or two glassmorphism elements can work (maybe the depth indicator or the project cards over the 3D scene). Using it on every surface is 2022 template territory.

**No numbered section markers (01 / 02 / 03).** Numbered decorative labels are only appropriate when the content is genuinely sequential, like a real process or timeline where order carries information. Using them to decorate unordered sections (projects, skills, about) is a common AI-generated pattern that signals template thinking.

**No cream-and-terracotta default.** AI-generated designs frequently cluster around a warm cream background (~#F4F1EA) with a high-contrast serif display and a terracotta accent. This palette is legitimate when the brief calls for it, but it has become an AI default rather than a deliberate choice. The Atom One Dark palette is the anchor here.

**No broadsheet newspaper layouts as decoration.** Dense columns with hairline rules and zero border-radius can look editorial, but they've become another AI clustering pattern. If the content doesn't warrant newspaper-density, the layout shouldn't impose it.

**Every design element must earn its place.** Before adding a visual element, ask: does this serve navigation, information hierarchy, or the biological metaphor? If the answer is "it looks cool," cut it. Decoration that doesn't serve structure reads as AI-generated filler regardless of how polished it is.

---

## 3. Typography

Three typeface families. The active heading typeface shifts at scale boundaries.

| Role | Typeface | Scales | Notes |
|---|---|---|---|
| Serif (warm headings) | Lora | Tissue, cellular | Brushed, calligraphic curves. Organic feel. If too heavy in context, test Crimson Text. |
| Sans-serif (body, UI) | Inter | All scales | Neutral, screen-optimized. Variable font with optical sizing. Never changes. |
| Monospace (terminal headings) | Fira Code | Code, expression | Zara's actual editor font. Programming ligatures add visual personality. |
| Neutral (intermediate headings) | Inter | Chromatin, protein | The sans-serif doubles as heading font for the middle scales, bridging serif and mono. |

**Type scale.** Use a modular scale (1.25 ratio or similar). Exact sizes tuned during prototyping. The type should feel generous at the tissue level (larger, more leading) and tighter at the code level (smaller, denser, more technical).

**Font loading.** Self-host woff2 files in `public/fonts/`. Subset to Latin + Latin Extended. Preload the most critical font (probably Inter, since it's on every scale). Use `font-display: swap` to avoid invisible text during load.

**Line length.** Cap at ~65-75 characters for body text. On wide screens, content doesn't stretch to full viewport width.

---

## 4. Color

Rooted in Atom One Dark. Per-scale accent emphasis creates the warm-to-cool gradient.

| Scale | Accent | Background | Atmospheric notes |
|---|---|---|---|
| Tissue | Warm gold-amber (#e5c07b pushed warmer) | #2c2a28 (warm) | Heavy bloom, golden light, soft fog, film grain |
| Cellular | Magenta-rose (between #c678dd and #e06c75) | Cooling from tissue | Moderate bloom, warm-to-neutral |
| Chromatin | Blue (#61afef) | #282c34 (true Atom One Dark) | Visual "home base." Neutral post-processing |
| Protein | Cyan (#56b6c2) | Slightly cooler than base | Sharper rendering, bloom decreasing |
| Code | Green (#98c379) with blue secondary | #21252b (darker) | Minimal post-processing, digital clarity |
| Expression | Continues code register | Same as code | Optional subtle warm return as bookend |

**Specific hex values are prototyping-phase decisions.** The direction and palette structure above are settled. The exact numbers get tuned when scenes are visible and can be evaluated in context. Don't waste time picking final hex values before the 3D scenes exist.

**Contrast requirement.** Every text/background combination must meet WCAG AA (4.5:1 body, 3:1 large). Check at every scale, especially the warm scales where gold-on-dark can get marginal.

---

## 5. Layout patterns

**Arrival phase:** 3D fills the viewport. Text, if any, is minimal and positioned to not compete with the scene. A scale label ("tissue · 1×") or section title, small and low-contrast, anchored to a corner or edge. No paragraphs of text over complex 3D.

**Content phase:** The 3D dims (opacity ~0.15-0.3, or pulled far back along z). HTML content appears, left-aligned or center-column (max-width ~720px for prose, wider for project cards or terminal listings). The background color from the CSS custom properties gives the atmospheric feel without needing the full 3D.

**Terminal listing:** Full-width (within a max-width container), monospace, no rounded corners, no card borders. Rows have horizontal rules or alternating subtle backgrounds. Hover highlights the row with a faint background shift. Star counts right-aligned.

**Dendrite project cards:** Positioned near branch tips via the `Html` component from drei (which pins HTML elements to 3D world positions). Cards are small, semi-transparent, and don't obscure the tree. They fade in/out with the focus interaction. Sharp corners (no rounded-2xl).

**Depth indicator:** The thinnest possible UI. 1-2px line, dots at 4-6px diameter. Low opacity when not hovered. The magnification label is 10-11px Inter, low contrast. This element should be noticeable when you look for it but invisible when you're reading content.

---

## 6. Motion design

**Scroll-driven, not time-driven.** Almost all animation on the site is driven by scroll position, not by time. The 3D scenes respond to where the user is, not to a clock. Exceptions: the loading sequence (timed), subtle organic movements like chromatin undulation (time-based but slow), and the FOV-focus camera pivot (interaction-driven, timed transition).

**Easing.** Prefer `power2.inOut` or `power3.out` for camera movements. Avoid linear easing (feels mechanical) and overshoot/bounce (feels playful in a way that doesn't match the tone).

**Transition speed.** Scale transitions should take ~300-500ms of scroll range. The cortex breakthrough can be slightly longer (600-800ms). FOV-focus camera pivot: 400ms.

**Reduced motion.** When active: all scroll-driven animations become instant (no interpolation). The 3D scenes are static or absent. CSS transitions set to 0. The site is fully usable as a static HTML page with a color gradient.

---

## 7. Component patterns for Claude Code / Claude Design

When generating UI components, follow these rules:

**Use CSS custom properties for anything that changes per scale.** Don't hardcode colors in components. Reference `var(--accent)`, `var(--bg)`, `var(--text)`. This is how the scroll-driven theming works.

**R3F components are functional, declarative, and stateless where possible.** Read from the Zustand store, don't manage local animation state. Let the depth value drive everything.

**HTML content components should work without the Canvas.** If you can't render the component on a page with no WebGL and have it make sense, the content/3D coupling is too tight.

**Avoid absolute positioning for content layout.** Use normal document flow for the HTML content layer. The only absolutely-positioned elements should be the Canvas (fixed), the depth indicator (fixed), and the dendrite project cards (positioned via drei's `Html`).

**Don't use `z-index` values above 100.** The Canvas is at -1, content at 0, UI overlays at 10-50. If you need z-index: 9999, the layering architecture is wrong.

**Self-closing tags, named exports, explicit return types.** Standard React/TypeScript conventions. No default exports (they make refactoring harder).

---

## 8. What the site is not

**Not a SaaS landing page.** No "features" section, no pricing table, no CTA buttons, no testimonials. The Cleave landing page (LandingPage.tsx) is the reference for what to avoid tonally, even though it's well-built technically.

**Not a dashboard.** No data grids, no charts, no metrics panels. If quantitative information appears (paper stats, project LoC counts), it's in prose, not in a KPI card.

**Not a template with a biology skin.** The biology is the structure. If you removed the biological metaphor and the site still made structural sense as a portfolio, the metaphor isn't doing its job.

**Not trying to be vmfunc.re.** The inspiration is the "metaphor-as-structure" principle, not the Windows 98 aesthetic or the irreverent hacker tone. Zara's tone is warm, confident, personal, and professional. Not edgy.

---

*End of DESIGN.md.*