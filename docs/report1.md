# State of the Art for a Scroll-Driven "Descent Through Biological Scale" Portfolio (Mid-2026)

## TL;DR
- **Yes, this is buildable today with mature, well-documented tools, and real precedents exist for every piece** — the canonical reference for your exact "descent" concept is the University of Utah's *Cell Size and Scale* (coffee bean → cell → virus → carbon atom) and Neal.fun's *Deep Sea* (vertical scroll descent); the technical blueprint is React Three Fiber + Drei + GSAP ScrollTrigger + Lenis, exactly as used in 2025–26 award-winners like The Monolith Project (Three.js/R3F/GSAP, 13-scene scroll-driven camera descent).
- **The single biggest design risk is not the 3D — it's committing the metaphor without losing navigability and mobile users.** The sites that work (vmfunc.re, Bruno Simon, The Monolith Project) make the metaphor *be* the content organization while still giving jump-navigation and a graceful 2D/reduced-motion fallback; the ones that fail trade narrative for spectacle and post 20+ second load times.
- **Recommended stack: Astro (content shell) + islands of React Three Fiber for the 3D, or Next.js if you want one React mental model; Lenis for smooth scroll, GSAP ScrollTrigger for the scroll timeline, Drei ScrollControls or Theatre.js for the camera, react-postprocessing for film grain/warmth, deployed to Cloudflare Pages or Vercel.** Build the warm→cool atmospheric shift with scroll-linked CSS custom properties plus shader uniform interpolation.

## Key Findings

### 1. The metaphor-as-descent concept has direct, live precedents
Your idea is essentially a "Powers of Ten" descent restricted to the biological register and driven by scroll. Verified live references:
- **University of Utah Genetic Science Learning Center — *Cell Size and Scale*** (learn.genetics.utah.edu/content/cells/scale/). A draggable slider continuously zooms through coffee bean → grain of salt → skin cell → red blood cell → E. coli → influenza virus → ribosome → carbon atom, with the magnification unit (mm → µm → nm → Å) updating live. This is the canonical scale-zoom interaction and is your closest content analogue.
- **Neal.fun — *The Deep Sea*** (neal.fun/deep-sea/): a vertical scroll-DOWN descent through ocean depth zones, widely cited as a scrollytelling gold standard and the closest existing model to a literal downward scroll descent.
- **Neal.fun — *The Size of Space*** (neal.fun/size-of-space/): arrow-key/swipe stepping through relative scales (scales up into space).
- **Nikon *Universcale*** and **Cary & Michael Huang's *Scale of the Universe 2*** (htwins.net/scale2/, ported to Pixi.js): slider-driven continuous zoom spanning cosmic→atomic, both explicitly inspired by the Utah Cell Size piece.

### 2. Biological 3D on the web: two distinct toolchains
There is a hard split between **scientifically accurate molecular viewers** and **portfolio-grade artistic 3D**, and you almost certainly want the latter as your primary engine with the former used sparingly for "real data" moments.

**Scientific viewers (accurate, but heavy and not art-directed):**
- **Mol\*** (molstar.org) is the modern standard, used by both PDBe and RCSB PDB; it can render cell-level models and offers lighting modes (matte, metallic, glossy, plastic), outlines, fog/depth cue, and ambient occlusion.
- **NGL Viewer** and **3Dmol.js** are lighter; 3Dmol.js is fast at building large molecules and embeds in two lines of code. NGL and GLmol are built on Three.js, so their output can in principle be composited into a Three.js scene.
- For **chromatin/DNA specifically**: ChromoSkein (web-based 3D chromatin fiber), geomeTriD (R/Bioconductor package rendering chromatin via Three.js), and Web 3DNA 2.0 (builds nucleosome/chromatin models) exist for accurate structures. Yoichi Kobayashi's particle-only DNA helix (ykob.github.io/sketch-threejs/sketch/dna.html) is a good *artistic* reference.

**Portfolio-grade / stylized 3D (your main path):**
- **React Three Fiber + Drei** is the dominant declarative stack. Drei provides loaders, camera controls, and ScrollControls out of the box.
- Stylized looks are achieved with `MeshToonMaterial` (cel/gradient shading), custom `ShaderMaterial` (procedural noise, wave deformation), and `EffectComposer` post-processing. A neuron, cell membrane, or chromatin fiber can be procedurally generated (instanced spheres + tube/curve geometry + noise displacement) rather than modeled — examples like Three.js neural-network visualizers and the BufferGeometry drawrange demo show the pattern.
- Pre-made GLB assets exist: "Cell Architecture Studio" ships Draco-compressed plant cell, animal cell, white blood cell, neuron, and DNA models (each ~6–11 MB) as a Vite + R3F + TypeScript app — a useful starting asset set.

### 3. Scroll-driven 3D storytelling is a solved, well-tooled problem
The ecosystem has clearly converged in 2025–26:
- **Lenis** (Darkroom Engineering; ~3 kB gzipped, roughly 848K weekly npm downloads / 14.1K GitHub stars) is the de facto smooth-scroll library. The canonical GSAP integration drives Lenis from GSAP's ticker: `lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add((time)=>{ lenis.raf(time*1000) }); gsap.ticker.lagSmoothing(0)` (per the darkroomengineering/lenis README). Note that the older `@studio-freight/react-lenis` and `@studio-freight/hamo` packages were retired and replaced by the current `lenis` package (`lenis/react` import) when Studio Freight rebranded to Darkroom Engineering.
- **GSAP ScrollTrigger** handles scrubbing, pinning, and scroll-progress math; GSAP's tools are free as of recent releases.
- **Camera-on-scroll** has three main approaches:
  - **Drei `ScrollControls` + `useScroll`**: simplest; creates an invisible HTML scroll container in front of the canvas (pages = multiples of viewport height). Downside: layout is WebGL-only, so there's no semantic HTML for SEO/screen readers without react-three-a11y.
  - **Theatre.js** (`@theatre/r3f`): a visual keyframe editor for designing the camera fly-through, exported to JSON for production — ideal for a cinematic, art-directed descent.
  - **14islands `r3f-scroll-rig`**: built on progressive enhancement — you author real HTML/CSS content and *enhance* specific elements with WebGL, with easy mobile fallback. Best choice if accessibility and content indexing matter (they should for a researcher's portfolio).
  - The NYT's **three-story-controls** offers a camera-rig toolkit with scroll + 3DOF and storypoint schemes.
- **Real award-winning exemplars (2025–26):** The Monolith Project (themonolithproject.net) — a 13-scene scroll-driven film built on Three.js + R3F + GSAP with a custom shader framework and GPU particle system, moving from hand-drawn sketches into lit 3D worlds; Bilal El Moussaoui (bilal.show) — scroll-driven 3D character story; Sébastien Lempens — scroll-driven tour through 3D Paris with camera mode shifts; Equinox by Little Workshop (equinox.space) — scroll-paced space narrative.

### 4. Metaphor-as-structure portfolios: what works vs. what's gimmicky
Beyond vmfunc.re (a fully interactive Windows 98 desktop where the OS metaphor *is* the content tree — Start menu, Display Properties theme switcher with "98 + CRT scanlines" option, terminal, "Philes"), strong committed-conceit examples:
- **Bruno Simon** (bruno-simon.com): drive a car through a 3D world to reach each section; the navigation *is* the metaphor. Code is open-source (folio-2025).
- **JReyes MC** (jreyes-mc-portfolio.com): Minecraft-inspired circuit where each scroll visits a "house" section (Awwwards Honorable Mention).
- **Aimee's Papercraft World** / **Thibault Introvigne** / **WoraWork**: character-led journeys through hand-crafted worlds.

What separates "works" from "gimmick," synthesizing the source material:
- **The metaphor maps to real structure** (a desktop's folders = projects; a descent's layers = bio-scale = your work areas). If the conceit is decoration over a normal layout, it reads as gimmick.
- **Personality + restraint.** Award commentary (Readymag, Codrops) repeatedly credits "small finishing touches" and Easter eggs *on top of* a simple, clear foundation — not effects in place of one.
- **Navigation never gets held hostage.** The best sites add jump-navigation (vmfunc's Start menu; scrollytelling sidebars with chapter markers) so users aren't forced to scrub linearly.

### 5. Visual register shifting (warm/organic → cool/technical) is well-supported
This is central to your concept and entirely achievable:
- **CSS layer:** scroll-linked CSS custom properties (or a long multi-stop `linear-gradient` on the body, or fixed overlay gradients) shifting hue as scroll progresses. Several production sites (Intercom, Trello) crossfade section gradients smoothly on scroll.
- **Shader layer:** interpolate shader uniforms (fog color, light color, tint) against scroll progress. Three.js `fog`/`color` objects, a warm directional light up top fading to cool, and tone mapping (R3F defaults to ACES Filmic) carry most of the mood.
- **Film grain / golden-hour warmth:** Three.js `FilmPass` (grain + scanlines), the newer `filmHD` TSL node (blue-noise grain, scanlines, shadow weighting), or a custom single-pass GLSL combining grain + vignette + warm color LUT. Matt DesLauriers' "Filmic Effects in WebGL" and the Codrops Risograph grain tutorial are the reference implementations. Merge effects into a single pass for performance rather than stacking many EffectComposer passes.
- **Terminal/technical aesthetic at the bottom:** pure-CSS CRT looks (scanlines via `repeating-linear-gradient`, phosphor glow via `box-shadow`, flicker `@keyframes` at low opacity, disabled under `prefers-reduced-motion`), or libraries like terminal.css / WebTUI (themeable, CSS-only), or jQuery Terminal for an interactive command line. Joshua Tjhie's CRT terminal documents an accessible approach (role="log", aria-live, WCAG AA contrast, reduced-motion disabling flicker).

### 6. Tech stack recommendation for 2026
- **Framework:** For a content-light, visually heavy personal site, **Astro 5/6** is the consensus 2026 pick for portfolios — ships zero JS by default, Lighthouse 95–100, cheap/free on Cloudflare Pages (Astro was acquired by Cloudflare on January 16, 2026, per Cloudflare's press release, with CEO Matthew Prince noting "Protecting and investing in open source tools is critical to the health of a functioning, free, and open Internet" and Astro remaining open source), and lets you mount React Three Fiber as a hydrated island via `client:visible`/`client:load`. If you'd rather have one React mental model and richer client-side routing/state for a complex single continuous experience, **Next.js 15/16** is fully viable (the heavy 3D dominates payload either way). Plain Vite + React is the simplest if the whole site *is* the 3D experience with little static content.
- **3D:** three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing; Theatre.js for camera choreography; optionally r3f-scroll-rig for progressive enhancement.
- **Scroll/animation:** lenis + gsap (ScrollTrigger).
- **CSS:** Tailwind or vanilla CSS both pair cleanly with R3F (Tailwind for the DOM overlay/content, CSS custom properties for the scroll-linked color shift). CSS-in-JS works but adds runtime weight.
- **Assets:** GLB + Draco compression (90–95% geometry reduction), KTX2/Basis textures (~10× VRAM reduction vs PNG), gltf-transform pipeline.
- **Deploy:** Cloudflare Pages (cheapest/free for static Astro), Vercel (best Next.js DX), or Netlify — all fine.
- **WebGPU note:** Three.js WebGPURenderer is production-ready since r171 (September 2025) with zero-config import and automatic WebGL2 fallback, and Safari shipped WebGPU support in Safari 26.0 in September 2025 (macOS Tahoe 26, iOS 26, iPadOS 26) — per Utsubo's "What's New in Three.js (2026)," "you can now ship WebGPU to all users." Some 2026 portfolios (Samsy, Ameen Abdullah) already use it for 120 FPS scenes. Treat it as optional upside, not a requirement.

### 7. Performance and progressive enhancement: the make-or-break for mobile
Realistic expectations: a Three.js-heavy site can hit stable 60 FPS on modern desktops and recent (2–3 year-old) phones if disciplined, but older devices struggle, and a careless build produces 20-second blocking times that kill organic traffic.
- **Mobile strategy that the best sites actually use:** disable smooth-scroll/WebGL scroll effects on mobile (14islands explicitly recommends this — "it is usually laggy"), or serve a lighter 2D/reduced scene. Provide a true non-3D fallback (a WebGL error boundary catching context-loss is a known, recommended pattern).
- **Progressive enhancement:** lazy-load the 3D via React Suspense; respect `prefers-reduced-motion` and the `saveData` hint (skip heavy animation for users who signal either). r3f-scroll-rig's HTML-first model makes a mobile-friendly version almost free.
- **Performance levers:** keep draw calls under ~100/frame; use InstancedMesh/BatchedMesh for repeated geometry (cells, particles); cap pixel ratio; `frameloop="demand"` to render only when something changes; dispose geometries/materials/textures; bake lighting; one merged post-processing pass. A well-optimized scroll scene can ship at ~2 MB total assets at stable frame rate.
- **Why it matters for SEO/UX:** scroll-jank directly harms INP (Interaction to Next Paint), which became a Core Web Vital on March 12, 2024, replacing FID (per Google's web.dev). A janky scroll experience is both a UX and a ranking problem.

### 8. The specific aesthetic (Life is Strange warmth → retro-terminal → sleek dark)
Life is Strange's look is a *painterly hand-textured 3D* style: per the game's concept artist Edouard Caplain, the hard part was translating a painterly 2D look into 3D via stylized textures. To approximate in WebGL:
- **Hand-textured, not photorealistic:** bake painterly albedo textures (Substance 3D Painter "Stylized" filter, or hand-paint albedo and fake the other maps), low-poly geometry, warm directional "golden hour" lighting, soft fog, film grain. Aimee's Papercraft World (2D illustrated assets baked onto 3D geometry) and WoraWork show the hand-crafted-in-browser approach.
- **Atmospheric gradient down the page:** warm terracotta/amber/golden tones for the tissue/cell layers (organic, intimate) interpolating to cool frosted-blue/graphite/ultraviolet for the code/terminal layers, driven by scroll progress on both CSS and shader uniforms.
- **Terminal layer:** amber or green-phosphor CRT theme with scanlines and glow, echoing the vmfunc.re "98 + CRT scanlines" register and tying the bottom of the descent to the "code/terminal" payoff.

## Details

**Why R3F over raw Three.js for this project:** the declarative component model lets you express each scale-layer (tissue, cell, chromatin, DNA, terminal) as a React component, mount/unmount by scroll position, and reuse Drei helpers — much faster iteration than imperative Three.js for a solo builder with full code control.

**Camera choreography decision:** For a *continuous cinematic descent*, Theatre.js gives you a timeline editor to keyframe the camera path and export JSON, which is more controllable than hand-coding easing. Pair it with Drei ScrollControls (scroll position drives the Theatre playhead). If accessibility/SEO is a priority, prefer r3f-scroll-rig's progressive-enhancement model and keep real HTML content per section.

**Continuous scroll vs. page-based vs. hybrid:** A single continuous scroll is the right call for a *descent* metaphor — it physically embodies "going deeper." But pure continuous scroll breaks down on: (a) navigation (users can't jump to "Projects"), (b) mobile performance, (c) accessibility, and (d) users who feel a loss of control if animation is scrubbed away from their input. The proven fix is **hybrid**: continuous scroll as the spine, but with (1) a persistent jump-nav / chapter sidebar mapping scale-layers to content, (2) scroll-*synced* (not scroll-*hijacked*) animation so stopping your finger stops the motion, and (3) snap points at each scale boundary. Keep each section's content as real HTML in the DOM overlay so it's indexable and screen-reader navigable.

**Conflict / caveat in sources:** Marketing-style "scrollytelling" guides oversell engagement benefits; the more rigorous sources (Baymard, Codrops, 14islands) emphasize that scroll-jank harms INP and that mobile WebGL scroll is frequently laggy. Weight the engineering sources over the marketing ones.

## Recommendations

**Stage 1 — Prototype the spine (1–2 weeks).** Build a Vite + R3F sandbox: one continuous scroll (Lenis + GSAP ScrollTrigger), a camera that descends through 3–4 placeholder "scale layers," and a scroll-linked background color shift (warm→cool) via CSS custom properties. Success benchmark: smooth 60 FPS on your laptop and a mid-range phone with placeholder geometry. If the phone can't hold ~30 FPS even with placeholders, plan the 2D fallback now.

**Stage 2 — Choose the production framework.** If your portfolio has meaningful written content (publications, blog, about), build the shell in **Astro** and mount the 3D descent as a `client:load` React island. If it's essentially one immersive experience, stay in **Vite + R3F** or **Next.js**. Decision threshold: more than ~3 content-heavy static pages → Astro; otherwise Vite/Next.

**Stage 3 — Art-direct the descent.** Choose camera tooling (Theatre.js if you want a designed cinematic path; r3f-scroll-rig if accessibility-first). Build each layer: stylized tissue/cell membranes (toon + noise + warm light + grain), procedural chromatin/DNA (tube geometry + instancing), then the terminal payoff (CRT CSS). Use Mol*/3Dmol.js only for a single "real data" hero moment if you want scientific credibility.

**Stage 4 — Harden for mobile and accessibility.** Add: a WebGL context-loss error boundary with a 2D fallback; `prefers-reduced-motion` and `saveData` handling; a reduced/disabled-WebGL mobile path; a persistent jump-nav; Draco/KTX2 asset compression; lazy-loaded scenes. Benchmark: Lighthouse performance ≥ 90 on the static shell, total 3D assets ≤ ~3–5 MB, no layout shift, INP in the "good" range.

**What would change these recommendations:** If you decide mobile must have the *full* 3D experience (not a fallback), budget heavily for optimization and consider WebGPU. If you want zero build/maintenance overhead, the conceit can also be done largely in 2D/CSS with scroll-linked SVG/canvas — lighter, more robust, but less "wow."

## Caveats
- Several classic scale-zoom references are **Flash-based and likely dead** in 2026 browsers (FSU "Secret Worlds," possibly Cells Alive "How Big?"); treat them as conceptual inspiration, not working code. Nikon Universcale appears rebuilt in HTML5/JS (its landing page lists modern-browser requirements) but the inner runtime was not independently confirmed.
- Performance numbers (FPS, asset sizes, Lighthouse) are achievable targets from optimization guides, not guarantees — real results depend on scene complexity and device.
- The Astro-vs-Next.js framing comes substantially from vendor and SEO-oriented blogs; the core technical claim (Astro ships less JS by default, Next.js ships a React runtime) is well established, but specific percentage/cost figures vary by source and should be treated as directional.
- "Awwwards/FWA" recognition signals craft and peer esteem, not necessarily good UX or accessibility — several award-winners have poor mobile performance and load times.
- Your concept is ambitious for a solo build; the realistic risk isn't feasibility but scope. A polished 4-layer descent beats an unfinished 8-layer one.