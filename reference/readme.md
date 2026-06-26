# Biological Scale Descent — Design System

A design system for **Zara Alibhai's** personal portfolio (`zalibhai.com`): a scroll-driven
site that descends through biological scales of organization, from warm/organic tissue at the
top to cool/digital code at the bottom. The biology is the site's architecture, not decoration.

> One person, one product. This is a portfolio, not a SaaS app. Treat it as a crafted,
> opinionated personal site with a strong atmospheric concept, not a component warehouse.

---

## What this is

The site descends through six biological scales. Each scale hosts a category of portfolio
content rendered in that scale's visual language, and the whole thing shifts warm → cool as you
go down:

| Scale | Magnification feel | Content | Accent | Heading font |
|---|---|---|---|---|
| **Tissue** (brain/cerebellum) | 1× | Hero, identity, "currently working on" | gold-amber `#e5c07b` | Lora (serif) |
| **Cellular** (Purkinje neuron) | 100× | Project index — dendrite branches | magenta-rose `#d57aa5` | Lora (serif) |
| **Chromatin** (nucleosomes) | 10,000× | Publications, research writeups | blue `#61afef` (home base) | Inter (sans) |
| **Protein** (MD trajectory) | 1,000,000× | Amaro Lab / molecular dynamics work | cyan `#56b6c2` | Inter (sans) |
| **Code** (terminal) | — | Software projects, `ls -la` listing | green `#98c379` | Fira Code (mono) |
| **Expression** (contact) | — | Contact, socials, resume | green `#98c379` | Fira Code (mono) |

The warm-to-cool shift is a continuous gradient, never a hard switch. Backgrounds cool from
`#2c2a28` (warm) through `#282c34` (true Atom One Dark) to `#21252b` (deep). Corner radius goes
from soft (16px) at tissue to square (0) at code. Post-processing (bloom, grain) is heavy at the
top and stripped away toward the bottom.

The concept is "everything is the brain all the way down" — nearly all of Zara's research is
neuro-adjacent (cerebellar epigenetics, synaptic gene regulation, postsynaptic membrane
proteins), so the scales map cleanly onto her actual work.

---

## Sources

These informed the system. The reader may not have access; links and paths are recorded so they
can be re-opened if they do.

- **Planning + spec docs** (`docs/`, mounted read-only via File System Access):
  `DESIGN-portfolio.md` (visual language + anti-slop rules), `SPEC-portfolio.md` (technical
  architecture), `MAIN_planning-portfolio.md` (session 3 decision log), `portfolio_idea.md`
  (concept brainstorm), `anti-ai-writing-style-guide.md` (the voice DNA), `resume.tex` (CV /
  project list), `old-portfolio.md` (the previous portfolio, kept as a "what to avoid" reference).
- **Uploaded assets**: `uploads/Lora-VariableFont_wght.ttf`, `uploads/FiraCode-VariableFont_wght.ttf`,
  `uploads/z_dendrite_favicon_design.png` (the "Z"-as-dendrite favicon).
- **Live references** (not templates): `vmfunc.re` (metaphor-as-structure inspiration),
  the Cleave landing page in `docs/LandingPage.tsx` (the "well-made but not me" anti-reference).
- **Subject**: Zara Alibhai, 20, UCSD Y2 Bioinformatics. Ferguson Lab (chromatin/neurodev),
  Amaro Lab (MD simulations), Budin Lab (earlier yeast work). GitHub: `github.com/Zaki-1052`.
  Email: `zalibhai@ucsd.edu`.

Tech stack the real site targets (for context, not built here): Vite + React 19 + TypeScript,
React Three Fiber + drei + postprocessing, Lenis + GSAP ScrollTrigger, Zustand for the `depth`
store, Tailwind + CSS custom properties for the scroll-driven theming.

---

## CONTENT FUNDAMENTALS

How copy is written here. The single most important source is `docs/anti-ai-writing-style-guide.md`
(the "Voice DNA"). Follow it literally. Below is the working summary.

**Voice.** Warm, confident, personal, professional. A sharp human who happens to be typing. Not
corporate, not ironic, not edgy, not trying too hard. The personality comes from the writing and
the craft, not from wacky animations. Think "real person made this," not "agency built this."

**Person & address.** First person ("I"), direct address ("you"). Active voice. Contractions
always (don't, it's, can't). When uncertain, say so plainly ("I think," "probably," "kinda").

**Casing.** Sentence case everywhere, including headings and the depth-indicator labels
(`cellular · 100×`, not `Cellular · 100×`). Scale names are lowercase. The favicon "z" is
lowercase. Project names keep their real casing (GPTPortal, Hi-C, MetaENCODE).

**Rhythm.** Short paragraphs, 1–2 sentences. Vary sentence length: short punchy lines next to
one longer one. Get to the point, no warm-up. If the point's made, stop — no summary paragraph.

**Specificity is the whole game.** Real numbers, real names, real tools. "2,910 dysregulated
loops in BAP1-knockout mouse cerebellum," not "significant findings." "60k LoC, 600+ tests,"
not "a large codebase." "mariner/edgeR quasi-likelihood GLMs," not "advanced statistics."

**Punctuation.** NO em dashes (use commas, periods, colons, semicolons, parentheses).
Numbers as digits (3 years, 10 providers, 397 stars). Parenthetical asides are welcome (for
honest commentary or deflating your own seriousness). Bold sparingly, 1–2 moments per section.

**Emoji.** None. Not in copy, not in UI. Unicode is used functionally where it earns its place
(`·` separators, `★` star counts, `→` link affordance, terminal glyphs like `drwxr-xr-x`).

**The fatal tell — negative parallelism.** Never write "It's not X, it's Y." / "Not X. Y." /
"Less X, more Y." / "X isn't dead, Y is the future." If you catch one, delete everything before
the positive claim and just state what it is. This is the #1 thing that makes copy read as AI.
Also banned: the dead-AI vocabulary list (delve, leverage, seamless, robust, unlock, elevate,
showcase, intricate, vibrant, "serves as," "stands as," and the rest — see the style guide).

**Examples of the voice (in register):**
- Status line: `currently: molecular dynamics of a postsynaptic membrane protein at Amaro Lab`
- Project one-liner: `Replicate-aware differential loop calling on BAP1-knockout cerebellum.`
- Terminal row: `drwxr-xr-x  GPTPortal   Multi-provider AI chat interface   ★ 397`
- Contact: warm and plain. "I'd love to hear from you" over "Let's connect!"

---

## VISUAL FOUNDATIONS

**The anchor palette is Atom One Dark.** Nothing alien to it is ever introduced. The warm-to-cool
gradient is built by shifting *emphasis* within that palette plus subtle background/fog temperature
changes, not by adding new hues. See `tokens/colors.css`.

**Color.** Dark mode only, always. The page background is always dark. Per-scale accent: gold →
rose → blue → cyan → green as you descend. Backgrounds: `#2c2a28` (warm) → `#282c34` (base) →
`#21252b` (deep). Text: `#d7dae0` strong, `#abb2bf` body, `#828896` muted (all AA on the dark
backgrounds), `#5c6370` faint/decorative only. Every text/bg pair meets WCAG AA (4.5:1 body,
3:1 large) at every scale. Accent colors are used as filled fills sparingly and mostly as
hairlines, glows, and link color.

**No purple/blue gradient blobs.** That's the AI-portfolio look and it's banned. The only
gradients are the warm-to-cool atmospheric shifts (background temperature), never decorative
blobs floating behind content.

**Typography.** Three families, switched at scale boundaries, never gradually. Lora (serif) for
the top two scales — brushed, calligraphic, organic. Inter (sans) for body on every scale and for
headings on the two middle scales (the neutral bridge). Fira Code (mono) for headings on the
bottom two scales — Zara's real editor font, ligatures on. Type is generous and airy at the top
(larger, more leading, `1.72` line-height prose) and tighter/denser at the bottom (`1.55`,
smaller). Prose measure capped at 65–75ch; terminal listings and project cards go wider. Modular
scale ≈ 1.25.

**Backgrounds & texture.** Flat dark color from the CSS custom properties is the base. Over it,
at the warm scales, a soft golden bloom and faint film grain; at the code scale, clean and sharp
with no post-processing. No full-bleed photos, no stock imagery, no hand-drawn SVG biology as
decoration (decorative DNA helices and peak-landscape illustrations read as generic biotech and
are banned). The 3D scenes (procedural, R3F) are the atmosphere; the HTML content is the real page
and works with zero WebGL.

**Layout.** No centered-everything. Left-aligned body text, asymmetric compositions, content that
breathes to one side. Prose column ~720px max, wider for terminal listings and project cards.
Normal document flow only — the sole absolutely/fixed-positioned elements are the canvas
(`fixed, z -1`), the depth indicator (fixed, right edge), and dendrite cards pinned to 3D
positions. z-index never exceeds 100.

**Corner radius is a signal, not a default.** Soft at the warm scales (tissue 16px, cellular
10px), neutral in the middle (6px), and square (0) at the code/terminal scale. Never uniform
`rounded-2xl` on everything — that reads as template.

**Borders & cards.** Cards are quiet: a 1px hairline (`#3e4451` or a 12%-opacity foreground tint),
the scale background or one step above it, a restrained shadow. No colored-left-border-only cards.
At most one or two glass surfaces (the depth indicator, project cards over the 3D) using a light
`backdrop-filter` — never glass on every surface. Terminal listings have no card chrome at all:
rows with hairline rules and a faint hover background.

**Shadow & glow.** This is a dark canvas, not paper, so shadows are subtle (`0 6px 24px` at most
for raised cards). The "lift" at warm scales comes from an accent-tinted glow (the bloom),
`0 0 32px -6px` in the accent color, decreasing toward code where surfaces sit flat.

**Motion.** Scroll-driven, not time-driven — the scenes respond to scroll position. Easing is
`power3.out` / `power2.inOut` (defined as `--ease-out` / `--ease-in-out`). No linear (mechanical),
no overshoot/bounce (too playful for the tone). Scale transitions take ~300–500ms of scroll range.
`prefers-reduced-motion` makes everything instant and the site fully usable as static HTML.

**Hover & press.** No `transform: scale(1.05)` on anything — banned. Hover shifts opacity, color,
or a hairline/background tint. Links brighten or underline. Press uses a subtle opacity dip or a
1px nudge, never a shrink. Focus is a 2px accent ring offset from the element by the background
color (`--ring-focus`).

**Imagery vibe.** Where imagery exists it's the procedural 3D — warm and grainy with golden bloom
at the top, cool and sharp toward the bottom. No photography, no illustration library.

---

## ICONOGRAPHY

The site is deliberately light on icons. Iconography is **functional and sparse**, never a grid.

**No icon grids.** The "tech stack as 12 little logos" pattern is banned. Tools live in prose and
in project tags, not in a skills grid.

**Brand mark.** The one piece of custom iconography is the **"z"-as-dendrite** favicon
(`assets/z_dendrite_favicon_design.png`): the letter z drawn as a branching neuron in Atom One
Dark blue (`#61afef`) on the dark base, with dendritic branches at the terminals. It works down
to 16px. This is the only logo/mark.

**Line icons (UI affordances).** For the handful of real UI icons (arrows, external-link, copy,
close, chevrons, menu), use **Lucide** (`lucide.dev`) — thin 1.5–2px stroke, rounded caps, which
matches the system's restrained, hairline aesthetic. Load from CDN
(`https://unpkg.com/lucide@latest`) or `lucide-react` in the real app. *Substitution flag:* the
codebase didn't ship an icon set, so Lucide is a chosen match, not the original. Swap if Zara has
a preference.

**Unicode as icons.** Used where it reads better than an SVG: `·` (scale-label separator),
`★` (star counts, in `--syntax-star` gold), `→` / `↗` (link affordance, external link),
`drwxr-xr-x` and `~/` and `$` (terminal listing). Keep these monospace at the code scale.

**Social icons (contact/expression scale).** GitHub, LinkedIn, Bluesky, etc. — use each brand's
official simple-icons glyph (`simpleicons.org`) as a single-color SVG tinted to `--text-muted`,
brightening to `--accent` on hover. No colored brand fills; they'd fight the palette.

**No emoji as icons. Ever.**

---

## Index — what's in this folder

**Foundations (root + `tokens/`)**
- `styles.css` — the entry point consumers link. `@import` lines only.
- `tokens/colors.css` — Atom One Dark palette, semantic aliases, 6 per-scale theme scopes.
- `tokens/typography.css` — three families, modular scale, per-scale heading-font switch.
- `tokens/spacing.css` — spacing, radii (soft→square), borders, shadow/glow, motion, z-index.
- `tokens/fonts.css` — `@font-face` for Lora + Fira Code; Inter via Google Fonts (see caveat).
- `tokens/base.css` — element resets, `.prose`, `.eyebrow`, focus rings.

**Specimen cards** — small `.html` files tagged `@dsCard`, grouped Type / Colors / Spacing /
Brand. They render in the Design System tab and each links the real `styles.css`.

**Components (`components/`)** — reusable React primitives. Seven, in two groups:
- `core/` — `Button` (solid/ghost/text), `Tag`, `ScaleLabel`.
- `portfolio/` — `ScaleSection`, `ProjectCard`, `TerminalListing`, `DepthIndicator`.
Load `_ds_bundle.js` and read from `window.BiologicalScaleDescentDesignSystem_acc404`.

**Templates (`templates/`)** — starting points consuming projects can copy.
- `scale-page/ScalePage.dc.html` — one themed `ScaleSection`; swap the `scale` prop
  to retune accent, background, heading font and radius.

**UI kit (`ui_kits/portfolio/`)** — high-fidelity recreations of the real portfolio screens
(arrival hero, dendrite project index, chromatin publications, protein/MD, terminal listing,
contact). The `index.html` is an interactive scale-descent click-through.

**`SKILL.md`** — makes this folder usable as a downloadable Agent Skill.

---

## Caveats

- **Inter is not self-hosted.** No Inter binary was provided, so `tokens/fonts.css` loads it from
  Google Fonts. The SPEC wants self-hosted subset woff2 under 300KB total. Provide an Inter woff2
  (or confirm Google Fonts is fine) before production.
- **Hex values are first-pass.** The DESIGN doc flags exact per-scale hex as a prototyping-phase
  decision to be tuned against the live 3D scenes. The values here are sensible AA-checked
  starting points, not final.
- **The 3D is out of scope here.** This system covers the HTML/CSS content layer (which is the
  real, accessible page). The R3F scenes are described, not built.
