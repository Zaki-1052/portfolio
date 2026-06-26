# Building the "Biological Scale Descent" Portfolio: A 2025–2026 Technical & Design Research Report

## TL;DR
- **Build it as a Vite + React + TypeScript single-page app using react-three-fiber (R3F) with one persistent fixed `<Canvas>`, GSAP ScrollTrigger + Lenis for scroll choreography, and a virtual-scroll architecture** — this stack gives you the "wow factor" you want while remaining the AI-friendliest, lowest-friction path for a solo developer. Astro and Next.js add SSR/islands complexity that a 3D-canvas-dominated site does not benefit from.
- **The descent metaphor has strong, proven precedent** — "Powers of Ten"–style scale zoomers (Scale of the Universe, Utah's Cell Size and Scale, Nikon Universcale) and scroll-into-a-cell experiences (HHMI Beautiful Biology) all validate the concept; your novel contribution is using each biological scale as a *content container* rendered in that scale's visual language.
- **The single biggest risks are performance and accessibility**, not feasibility. Budget for: one shared WebGL context (never multiple canvases), GLTF assets compressed with Draco/Meshopt + KTX2, a hard `prefers-reduced-motion` fallback, real keyboard/URL-fragment navigation, and a static mobile fallback. Treat WebGPU/TSL as an optional progressive enhancement, not the foundation.

## Key Findings

### 1. The core stack is mature and AI-friendly
react-three-fiber is a thin React renderer over Three.js with essentially zero overhead and a large helper ecosystem (`@react-three/drei`, `@react-three/postprocessing`, `gltfjsx`). R3F v9 pairs with React 19; R3F v8 pairs with React 18. Three.js itself has reached r180+ with production-ready WebGPU since r171 (Sept 2025), but WebGL2 remains the safe default with automatic fallback.

### 2. Scroll-driven 3D is a solved pattern with known building blocks
The canonical architecture is: a fixed full-viewport canvas behind scrollable HTML, with GSAP ScrollTrigger mapping scroll progress (0–1) to camera position, and Lenis providing smooth scroll synced to GSAP's ticker. Lenis is at v1.3.x and is purpose-built to drive WebGL scroll scenes. The `@14islands/r3f-scroll-rig` library wraps this whole pattern (Lenis + R3F + DOM tracking) and is "100% compatible with the @react-three ecosystem."

### 3. There is rich biological-visualization tooling to borrow from
Mol* (molstar) and NGL are the dominant WebGL molecular viewers (both built on Three.js foundations); NeuroMorpho.org provides downloadable SWC neuron morphologies; reaction-diffusion and L-system shaders are well-documented for organic generative texture.

### 4. The metaphor is validated but underexploited as a portfolio structure
Multiple "scale zoom" experiences exist, but almost none use the scales as portfolio content containers — this is genuine whitespace, especially in computational biology where portfolios are overwhelmingly plain.

## Details

### Research Area 1 — Three.js / react-three-fiber for biological visualization

**The R3F ecosystem (current state).** react-three-fiber is "a React renderer for three.js… it must pair with a major version of React" — `@react-three/fiber@9` pairs with React 19, `@react-three/fiber@8` with React 18. There is no runtime overhead because components render outside React and it "merely expresses Threejs in JSX." The key ecosystem packages you'll use:
- **`@react-three/drei`** — a large helper library (cameras, controls, loaders, `useGLTF`, environment maps, text).
- **`@react-three/postprocessing`** — wraps the `postprocessing` library; provides Bloom, DepthOfField, Noise, Vignette, ToneMapping, N8AO ambient occlusion. Pin versions (e.g. `@react-three/postprocessing@3.0` + `postprocessing@6.37`) because the API changes between releases.
- **`@react-three/gltfjsx`** — converts GLTF models into editable JSX components.
- **`leva`** for GUI tweaking, **`r3f-perf`** for performance HUD, **Zustand/Jotai** for state.

**Biological 3D assets and viewers.**
- **Mol\* (molstar)** is the modern standard, used by RCSB PDB, PDBe, and AlphaFold DB. It is WebGL-based, open source, and per Sehnal et al., "Mol* Viewer: modern web app for 3D visualization and analysis of large biomolecular structures" (*Nucleic Acids Research* 2021, 49:W1, W431), can "render cell-level models at atomic detail with tens of millions of atoms, or display huge models obtained by I/HM such as the Nuclear Pore Complex" — its demo HIV capsid in blood serum "originates from cellPACK and includes more than 13 million atoms." It ships a React-based UI (`mol-plugin-ui`) plus embeddable web-component wrappers (`pdbe-molstar`, `rcsb-molstar`), and a Mesoscale Explorer for whole-cell models. This is your best bet for the molecular/protein layer.
- **NGL Viewer** is the older, lighter WebGL protein viewer ("This project would not be possible without… the three.js project"). Mol* was created by merging NGL (RCSB) and LiteMol (PDBe).
- **Neurons:** NeuroMorpho.org is the largest public repository of 3D neuronal reconstructions in SWC format (a plain-text tree of points: coordinates, radius, parent, type). SWC is trivially parseable into tube geometry in Three.js. The `xyz2swc` service converts 26 formats; `skeletor`/`trimesh` can mesh them. Allen Brain Atlas's web tools (NeuroXiv) use "Three.js (v0.134.0)… to handle the rendering of complex 3D visualizations, including brain regions and neuron reconstructions."
- For the cellular layer, CellScape (vector cartoon protein illustrations) and CellPACK/Mesoscale recipes are reference points for "mesoscale" cell interiors.

**Performance considerations (from the Codrops "SINGULARITY" optimization writeup and Three.js best-practices guides):** Use LOD (distant objects = simplified meshes/low-res textures); set `<Canvas gl={{ powerPreference: "high-performance", antialias: false, stencil: false, depth: false }} />` and re-enable only what you need; post-processing effects are expensive — disable dynamically on weak hardware. The "golden rule" is draw-call count over triangle count: below ~100 draw calls most devices hold 60fps; above ~500 even strong GPUs struggle. Check `renderer.info.render.calls`. Use instancing for repeated geometry (e.g. many cells).

**Biological/scientific creative web precedent:** Awwwards is full of organic Three.js worlds (Jordan Breton's floating island, Bruno Simon's folio-2025 island). Bruno Simon's 2025 portfolio is a key reference for "metaphor-as-structure" — it avoids traditional HTML UI entirely, building 3D models for the interface and recreating clicks/scroll/keyboard/touch in 3D, with weather and day-night systems.

### Research Area 2 — Scroll-driven 3D narrative (state of the art)

**The dominant pattern (well-documented in 2025 Codrops tutorials and the "Meet: Mira" case study):** HTML sections each `min-height: 100vh`; a fixed canvas behind them; iterate over sections creating a GSAP ScrollTrigger per section; in each `onUpdate(self)` read `self.progress` (0→1) and drive `camera.position`, `model.rotation`, lighting, or morph targets. A single GSAP timeline with `scrub` is the cleanest approach for a continuous descent.

**GSAP ScrollTrigger** maps scroll distance to an animation's 0–1 progress automatically, syncing to the browser's repaint cycle. Key props: `scrub` (ties animation to scroll, with optional smoothing lag), `pin` (holds an element fixed during a section), `start`/`end` (e.g. `"top top"` → `"bottom bottom"`). **As of 2025 GSAP's ScrollTrigger, ScrollSmoother, and SplitText plugins are free.** ScrollSmoother offers `normalizeScroll` to fix performance inconsistencies and `effects`/`data-speed` for parallax.

**Lenis (smooth scroll):** Current version is in the v1.3.x line; it "wraps the browser's own scroll, so position: sticky, anchor links, and accessibility keep working," supports a React adapter, scroll-snap plugin, and is built to "drive WebGL scroll scenes, GSAP ScrollTrigger, and parallax off one loop." Standard integration syncs Lenis to GSAP's ticker: `lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add((t)=>lenis.raf(t*1000)); gsap.ticker.lagSmoothing(0)`. Note Lenis's recommended CSS requires Safari >17.3, Chrome >116, Firefox >128.

**Apple-style scroll-zoom:** Apple's AirPods pages use a `<canvas>` image-sequence flip-book — hundreds of pre-rendered frames drawn to canvas and indexed by scroll progress. Per CSS-Tricks' "Let's Make One of Those Fancy Scrolling Animations Used on Apple Product Pages," the AirPods Pro hero sequence is "148 to be exact" (`frameCount = 148` in Apple's own source), and on slow/mobile connections Apple loads "a single fallback image instead of the entire image sequence." This is an alternative to live 3D: pre-render your descent in Blender, export a frame sequence, and scrub it. Far cheaper to run, but heavier to download and not interactive. Worth considering for the most complex transition moments. (Note: ScrollMagic is now legacy; use GSAP or native scroll-driven animations.)

**Scroll-as-descent/magnification metaphor — confirmed precedents (from targeted research):**
- **The Scale of the Universe 2** (Cary & Michael Huang) — the canonical "powers of ten" scrubber, "starting at human scale from which you can scrub downward smaller than quarks or upward to the scale of the entire universe." Originally Flash, **rewritten in JavaScript using pixi.js**, now at scaleofuniverse.com.
- **Cell Size and Scale** (University of Utah, Genetic Science Learning Center, learn.genetics.utah.edu/content/cells/scale/) — the closest direct precedent: a draggable slider zooms continuously from a coffee bean down through skin cell, red blood cell, E. coli, mitochondria, X chromosome, virus, ribosome, antibody, glucose, to a carbon atom. This 2008 tool reportedly inspired Scale of the Universe.
- **Nikon Universcale** — Flash-era "Powers of Ten style interactive" from universe to femtometer; flag as possibly defunct in modern browsers.
- **HHMI Beautiful Biology "Scroll and Explore"** (hhmi.org/beautifulbiology/scroll-and-explore) — a scroll-driven journey that zooms into a single HeLa cell built from "actual cellular data." Direct precedent for scroll-to-descend-into-a-cell.
- **EyeWire** (Sebastian Seung Lab) — browser 3D game where "players scroll through the cube and reconstruct neurons," a strong "descend into neural microstructure" reference.
- **Portfolio-specific:** the anatomyproject.com interactive 3D histology site (tissue specimens you "drop straight into," WebGL, drag-rotate/scroll-zoom) and Alexander Rubino's portfolio (alexanderrubino.com) which features "a cool looking DNA model using Three.js and Shaders."

**Mobile/performance for scroll-driven 3D:** The 14islands team recommends Progressive Enhancement — "consider disabling SmoothScrollbar and all scrolling WebGL elements on mobile - it is usually laggy." Either fall back to plain DOM content on touch, or, for a fully immersive site, enable Lenis `syncTouch` (can be unstable on iOS<16). The browser limits the number of simultaneous active WebGL contexts, so use ONE shared canvas, never one per section.

### Research Area 3 — Technical stack options

**Astro vs Next.js vs Vite+React for a heavy-3D portfolio.** The 2026 consensus: Astro wins for content/static sites (ships ~0 JS by default, islands architecture, ~40% faster loads, Lighthouse 98–100); Next.js wins for full-stack apps (auth, server actions, RSC, ISR). **But your site is neither — it is a single client-heavy WebGL canvas experience.** The defining characteristic of your site is one persistent 3D scene that must NOT unmount between "pages." Key implications:
- **Astro's Islands/View Transitions** are designed to ship minimal JS and hydrate small interactive components. A full-viewport persistent R3F canvas is the opposite of an island — you'd be fighting the framework, and Astro's zero-JS advantage evaporates because your site is essentially all JS. Astro is excellent if you later want a separate fast blog section.
- **Next.js App Router + RSC** is client-heavy-hostile for this use case: Three.js is strictly client-side (`'use client'` everywhere), so you lose RSC benefits, inherit App Router complexity and caching gotchas, and gain little. Next is justified only if you need server features.
- **Vite + React (SPA)** is the recommended path: simplest mental model, fastest dev feedback (HMR), no SSR/hydration mismatch headaches with the canvas, and the entire R3F/drei/Codrops tutorial ecosystem assumes it. The tradeoff is weaker SEO/initial-load metrics — acceptable for a portfolio whose value is the experience itself. Add `react-helmet`-style meta tags and a prerendered fallback for crawlers if needed.

**CSS:** For a highly custom design, Tailwind CSS is the pragmatic choice (fast iteration, great with AI codegen) but vanilla CSS / CSS Modules give finer control over the dramatic per-scale visual registers. A hybrid (Tailwind for layout utilities, CSS custom properties for the warm→cool color theming driven by scroll) works well. Drive the global palette shift with CSS variables updated from scroll progress.

**Deployment:** All three of Vercel, Netlify, and Cloudflare Pages serve a static Vite SPA with 3D assets well — it's just static files + a CDN. Cloudflare Pages is notably cheap/free for static output and has no Vercel-style pricing concerns; Vercel has the smoothest DX. For a 3D-asset-heavy site the deciding factor is CDN delivery of large GLB/KTX2 files and proper caching headers, not the host's compute model. Host the Draco/Basis decoder files on your CDN.

**Asset pipeline (critical for this site):**
- Convert everything to **GLB**. Use **`gltf-transform optimize`** for a one-command pipeline: `gltf-transform optimize in.glb out.glb --compress draco --texture-compress ktx2`.
- **Draco** compresses static geometry up to ~90%+; **Meshopt** (`EXT_meshopt_compression`) is preferred for morph targets/animations that Draco discards, and decompresses faster. **KHR_mesh_quantization + Meshopt** can take a 29MB model to ~2.5MB.
- **KTX2/Basis Universal** textures stay GPU-compressed (~10× VRAM savings vs PNG, which decompresses fully into VRAM — a 200KB PNG can occupy 20MB+).
- **Lazy-load** per scale: code-split each "level" and load its assets as the user approaches via Intersection Observer; show low-res then swap to high-res. In R3F use `useGLTF.preload()` and set the Draco decoder path globally.
- Consider Needle's `gltf-progressive` for automatic LOD streaming if assets get large.

**TypeScript with R3F:** Works well. Type meshes with `useRef<THREE.Mesh>(null!)` and props with `ThreeElements['mesh']`. Since React 19 you can drop `forwardRef` and read `ref` from props directly. Main gotchas: ensuring `three` types match the installed version, and WebGPU's async init (`gl={async (canvas)=>{const r=new WebGPURenderer({canvas}); await r.init(); return r;}}`) plus checking `gl.isWebGPURenderer` rather than `gl.capabilities.isWebGL2`.

### Research Area 4 — Biological/scientific creative inspiration

- **Generative organic texture:** Reaction-diffusion (Gray-Scott) WebGL shaders produce cell-division-like and Turing patterns — Amanda Ghassaei, Jason Webb's Reaction-Diffusion Playground, and Felix Woitzel's demos are reference implementations using ping-pong framebuffer rendering. These are perfect for the tissue/cellular membrane layers. L-systems generate dendrite/branching structures (also how you'd procedurally grow neuron trees). Nervous System (Jessica Rosenkrantz/Jesse Louis-Rosenberg) productizes reaction-diffusion generative design.
- **Science-comm interactive 3D:** Drew Berry's molecular animations are the gold standard for scientifically accurate cell/molecular motion (aesthetic reference, not code). HHMI BioInteractive and the Utah Genetic Science Learning Center are the leading interactive-bio education producers.
- **Life is Strange visual language:** Confirmed art-direction details — Art Director Michel Koch aimed for "animated concept art," with 3D artists translating Edouard Caplain's painterly concept art into 3D and hand-painting all textures for an "impressionistic rendering." References artists like Alberto Mielgo ("smooth blend of photorealism and abstraction"). The stylization was chosen to "convey emotions more powerfully by using colors or lighting which would be too subtle to capture in real life." **Web translation:** achieve this not with realistic PBR but with custom tone mapping (the AgX or ACES Filmic modes in postprocessing), warm directional "golden hour" lighting, gentle bloom, subtle film grain/noise, depth-of-field, and hand-painted-feel textures rather than photoscanned ones. This maps directly onto your "warm organic top" register.

### Research Area 5 — Design patterns for the descent concept

**Transitioning between radically different visual registers (organic → terminal).** Drive a global "depth" value (0→1) from scroll progress and feed it into: (a) CSS custom properties controlling background/text colors warm→cool; (b) post-processing parameters (more bloom/DOF up top, sharper/cooler/scanline-ish at the bottom); (c) fog color and lighting temperature. Use distinct typeface families per scale to signal register changes — the award-winning scrollytelling pattern noted that switching "typeface family to signal a change of scale (cosmic, scientific, personal)" turns font choice "itself into a storytelling device." Your bottom "code/sequence" layer naturally calls for a monospace terminal font.

**Depth / "you are here" indicators.** The strongest reviewed scrollytelling sites use "a small persistent 'scale indicator' (e.g. 10²⁶ m → 10⁰ m)" to help readers track the macro-to-micro journey, plus "a minimal chapter rail… to jump directly to a scale without re-scrolling." Implement a fixed vertical scale ruler showing current biological level (Tissue → Cell → Nucleus → Sequence) with the current level highlighted, doubling as jump-navigation. A "scroll to zoom" hint on first load helps users unfamiliar with the metaphor.

**Parallax/zoom-in feeling.** Layer elements at different z-depths and move them at different rates (the Codrops "layered zoom" technique scales + blurs layers and staggers them along Z). Combining scaling, blur, and smooth scroll "creates the impression of a 3D scene coming to life." In true 3D, simply dolly the camera forward through nested transparent shells (tissue shell → cell membrane → nuclear envelope → chromatin → helix).

**Navigability.** Provide: jump-to-section controls (the scale rail), keyboard navigation (arrow/Page keys advancing scenes), URL fragments per scale (`#cell`, `#nucleus`) that scroll-to on load, a back-to-top control, and preserved scroll position on back-navigation. Crucially, if you hijack scroll you "take on the responsibility of providing everything users expect — progress indicators, keyboard navigation, screen reader context, and respect for motion preferences."

**Mobile/touch.** Test on real devices (DevTools mis-simulates iOS viewport). Use `svh`/`dvh` units for the iOS viewport-height issue; passive event listeners for touch/wheel; consider a simplified or static-image descent on mobile rather than full live 3D.

**Accessibility (non-negotiable for a 3D site).** WebGL `<canvas>` content is invisible to assistive tech "out of the box" — there are "no declarative semantics," so the canvas exposes nothing to screen readers. Therefore: render a complete, semantic HTML version of all portfolio content in the DOM (the canvas is decorative enhancement layered behind/over it); use `aria-hidden` on purely decorative canvas; ensure every piece of real content (projects, bio, links) is reachable and readable without WebGL. Honor `prefers-reduced-motion: reduce` — for scroll-driven 3D, set damping/smoothing to instant (Lenis lerp → 1) and replace camera animations with instant cuts or simple fades. Provide an on-page motion toggle (persisted in localStorage) since many users don't know the OS setting exists. Maintain WCAG color contrast across every scale's palette (the reviewed "Scale of the Universe"-style sites lost accessibility points on low-contrast chapters). Keep keyboard focus visible and logical.

### Research Area 6 — Portfolios with exceptional craft & strong metaphor

- **Bruno Simon's folio-2025** — the benchmark immersive 3D portfolio (island world, full 3D UI, weather/seasons, multiplayer, WebGPU/TSL). Demonstrates "metaphor-as-structure" at the highest level.
- **Strong-metaphor sites:** the Windows 98 / retro-OS desktop portfolio genre is popular (the vmfunc.re reference and many DEV/GitHub clones). A cautionary critique ("YAPOS — Yet Another Portfolio Operating System") warns these can sacrifice obviousness, accessibility, and mobile-friendliness for novelty — a direct lesson for your descent concept: keep navigation obvious, support mobile, and don't bury content in the metaphor.
- **Scroll-driven WebGL story sites** (not portfolios but structurally similar): The Monolith Project (13-scene scroll story in R3F + GSAP), Equinox (Little Workshop), Messenger (Abeto) — references for sustaining a long narrative without losing users.
- **Bioinformatics/comp-bio portfolios** today are overwhelmingly plain (GitHub Pages, Streamlit/Shiny dashboards, README-style project case studies — e.g. William Guesdon's, Antonio Ortega's). This confirms your concept would stand out dramatically in the comp-bio hiring space, where the norm is a clean list of RNA-seq/variant-calling projects. The standard advice (frame each project as Challenge → Approach → Insight) should still structure the *content* inside each scale.

## Recommendations

**Stage 1 — Prototype the spine (validate before investing in art).**
1. Scaffold `npm create vite@latest` → React + TypeScript. Add `three`, `@react-three/fiber@9` (React 19), `@react-three/drei`, `@react-three/postprocessing` (pin versions), `gsap`, `lenis`, `zustand`.
2. Build ONE fixed `<Canvas>` behind scrollable sections. Wire Lenis → GSAP ticker → a single scrubbed ScrollTrigger timeline driving a forward-dolly camera through 4 nested placeholder shells (sphere-in-sphere). Add a Zustand `depth` (0–1) store updated on scroll.
3. Add the scale-rail UI, URL fragments, keyboard nav, and a `prefers-reduced-motion` branch from day one. **Benchmark:** if you can't hold 60fps with placeholder geometry on your target laptop and a mid-range phone, simplify the concept before adding art.

**Stage 2 — Build the four scales with real assets.**
4. Tissue/Cell (warm): reaction-diffusion shader membranes + instanced cells; golden-hour directional light, bloom, AgX/ACES tone mapping, grain — the Life-is-Strange register.
5. Nucleus/Chromatin: procedural L-system/instanced chromatin fibers.
6. Sequence/Code (cool): transition to monospace/terminal aesthetic; render DNA via a Three.js+GLSL helix (cf. Rubino) or embed **Mol\*** for a real protein/structure moment.
7. For any pre-authored complex transition, consider a Blender-rendered image sequence scrubbed on canvas (Apple's ~148-frame technique) as a performance escape hatch.
8. Run all GLB through `gltf-transform optimize --compress draco --texture-compress ktx2`; lazy-load per scale; host decoders on your CDN.

**Stage 3 — Harden & ship.**
9. Full semantic-HTML content layer for screen readers; motion toggle; mobile fallback (static or simplified descent).
10. Deploy to Cloudflare Pages or Vercel with long-cache headers on assets. Add meta/OG tags.
11. Use AI assistance heavily for boilerplate (R3F components, shader scaffolds, GSAP timelines) but verify performance and accessibility manually — these are where AI-generated 3D code most often falls short.

**Thresholds that change the plan:**
- If you can't sustain 60fps on mobile → ship mobile as the Apple-style image-sequence or a static scroll.
- If asset sizes balloon past a few MB per scale → adopt progressive LOD streaming (`gltf-progressive`).
- If you want a blog/CV section later → add it as a separate Astro-built static area rather than bolting it onto the SPA.
- Only adopt WebGPU/TSL if you hit a CPU draw-call bottleneck or want compute-shader particle systems. It is production-ready — Three.js r171 (Sept 2025) introduced zero-config WebGPU via `import { WebGPURenderer } from 'three/webgpu'` with automatic WebGL2 fallback (per the official mrdoob/three.js r171 release notes and migration guide), and Apple shipping WebGPU in Safari 26 made it Baseline across browsers in January 2026 — but it adds async-init complexity and some postprocessing effects need TSL rewrites.

## Caveats
- **Version churn is real.** `@react-three/postprocessing` and `postprocessing` have breaking changes between minor versions; pin exact versions. GSAP plugins going free is recent (2025) — verify current licensing before relying on ScrollSmoother in any commercial context.
- **WebGPU is "production-ready" but not universally faster.** Community benchmarks report WebGL can outperform WebGPU on some scenes; WebGPU wins specifically on high-draw-call/compute-heavy workloads. Don't assume a free speedup, and measure your own scene before migrating.
- **Several cited precedents are Flash-era** (Nikon Universcale, the original htwins.net Scale of the Universe) and may be defunct or emulator-only; treat them as conceptual, not technical, references.
- **Performance figures are situational.** The "<100 draw calls = 60fps" and compression ratios (29MB→2.5MB) are illustrative from specific models/devices; your mileage will vary — measure with `r3f-perf` and Chrome DevTools.
- **Accessibility for WebGL is genuinely hard** and often skipped on award-winning sites; budget real time for the parallel semantic-HTML content layer, or the site will exclude screen-reader users and tank on audits. A substantial share of users enable reduced-motion (figure varies by source; design as if it's significant).
- **The metaphor can hurt you if it obscures content.** The OS-portfolio critique applies directly: recruiters skim. Make sure your actual projects, skills, and contact info are obvious and fast to reach — don't force a hiring manager to "scroll to the nucleus" to find your résumé.
- I was unable to independently confirm the exact tech stack of every cited inspiration site (some Awwwards entries and the HHMI page resist inspection); these are included as design precedent, not verified implementation blueprints.