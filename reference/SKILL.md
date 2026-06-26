---
name: biological-scale-descent-design
description: Use this skill to generate well-branded interfaces and assets for Zara Alibhai's "Biological Scale Descent" portfolio (zalibhai.com), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping a scroll-driven, warm-to-cool, dark-mode-only personal site rooted in the Atom One Dark palette.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Fast orientation

- **The concept**: a portfolio that descends through six biological scales (tissue → cellular → chromatin → protein → code → expression), shifting warm/organic at the top to cool/digital at the bottom. The biology is the structure, not decoration.
- **Foundations**: link `styles.css` (it `@import`s everything). Theme per scale by putting `data-scale="tissue|cellular|chromatin|protein|code|expression"` on a container; all `--accent`, `--bg`, `--font-heading`, and `--radius` tokens shift automatically.
- **Color**: Atom One Dark only. Gold → rose → blue → cyan → green accents as you descend. Dark backgrounds always (`#2c2a28` → `#282c34` → `#21252b`). See `tokens/colors.css`.
- **Type**: Lora (serif, top), Inter (sans, body + middle), Fira Code (mono, bottom). Switches at scale boundaries. See `tokens/typography.css`.
- **Voice**: first person, sentence case, specific numbers, contractions. NO em dashes, NO emoji, NO negative parallelism ("not X, but Y"), NO dead-AI vocab. Full rules in `readme.md` → CONTENT FUNDAMENTALS.
- **Components** (`components/`): `ScaleSection`, `ProjectCard`, `TerminalListing`, `DepthIndicator`, `Button`, `Tag`, `ScaleLabel`. Load `_ds_bundle.js`, read from `window.BiologicalScaleDescentDesignSystem_acc404`.
- **UI kit** (`ui_kits/portfolio/`): the full interactive scale-descent page to copy from.

## Hard nos (from the design brief)

No centered-everything layouts. No purple/blue gradient blobs. No uniform rounded corners (radius is a per-scale signal; code is square). No icon grids for tech stacks. No hover-scale on interactive elements (use opacity/color). No glass cards on every surface. No "About Me" card with a circular photo. No light mode. Keep prose ≤ 65–75ch. z-index < 100.
