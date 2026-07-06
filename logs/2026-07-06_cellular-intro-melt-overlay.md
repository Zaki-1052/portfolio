# 2026-07-06 — Cellular intro prose surfaced in the melt-to-tree transition

## What was done

Put the cellular band's intro paragraph (`content/sections/cellular.md`) back into
the **WebGL register**, where it had been lost. In 3D the whole `.cellular-doc`
block is `display:none`'d, so the only cellular text was `ArborAnnotations` (the
project labels, revealing at depth 0.33). The intro prose now appears during the
tissue→cellular **melt**, resolving out of the haze with the tree and clearing
before the labels arrive.

- **New:** `src/scales/cellular/ArborIntro.tsx` — fixed, `pointer-events:none`
  overlay. `.arbor-intro` (container) → `.arbor-intro__col` (static centered box,
  holds the lens `::before`) → `.arbor-intro__inner` (the text that
  resolves-from-haze). Opacity + the resolve blur/rise + the lens crush amount all
  driven by one `smoothstep` depth **envelope** on the gsap ticker (no React
  re-render; early-outs when depth + reduced-motion are unchanged;
  `visibility:hidden` when faded). Reads the same `getSection('cellular')` prose
  via `MarkdownRenderer`. Mirrors the `ArborAnnotations` imperative-envelope pattern.
- **Modified:** `src/scales/cellular/CellularContent.tsx` — render `<ArborIntro />`
  beside `<ArborAnnotations />` (import added).
- **Modified:** `src/styles/globals.css` — new `.arbor-intro` block (WebGL-gated,
  `--z-overlay`), centered `.arbor-intro__col` (`min(620px,82vw)`, left-aligned,
  Lora serif title), the **cooled-lens** `.arbor-intro__col::before`, the
  ink-halo `.arbor-intro__inner`, a brightened `.arbor-intro .prose`, and a
  matching `[data-scale='tissue'] .prose` brighten for the hero.

## Decisions made

- **Depth window (the one tuning knob):** reveal 0.25→0.285, hold, fade
  0.305→0.33. Clears exactly as `ArborAnnotations` starts its reveal (0.33) — a
  clean baton-pass, no two-text-layer fight. Sits over the ember drain
  (0.28→0.31) and wall disintegration (0.30→0.335).
- **Effect = resolve-from-haze:** `opacity: e`, `blur((1-e)*5px)`,
  `translateY((1-e)*14px)` — echoes how the arbor materializes out of the mist.
  Reduced motion drops blur+rise; the scrubbed opacity fade stays (it's a
  scroll-position mapping, not a timed animation).
- **Legibility (reworked after first pass):** a flat radial `--bg` scrim failed —
  the melt is a bright-cream / dark-navy checkerboard, so light text vanished over
  the cream patches and cranking the scrim's opacity/blur just rebuilt the hero's
  heavy box (which the user rejected). Replaced with a box-free **cooled lens +
  ink**: the `::before` is now a feathered `backdrop-filter: brightness(0.55)
  saturate(0.85)` (no opacity fill) with a radial `mask-image` so it dissolves
  into the scene instead of reading as a rectangle — it crushes the bright lava
  behind the text toward navy so light text reads everywhere, texture/tree still
  visible. An inherited `text-shadow` ink halo on `.arbor-intro__inner` backstops
  the glyphs. The resolve-from-haze blur/rise moved off the column onto
  `.arbor-intro__inner` so it can't fight the backdrop filter.
- **Lens develops (not pops):** the lens crush is eased with the envelope, not
  held at full strength — `ArborIntro` writes two inherited custom props per frame
  (`--lens-b` brightness 1→0.55, `--lens-s` saturate 1→0.85, via `lerp`) that the
  `::before` reads. Early in the reveal the lens is ~invisible (brightness ~1) and
  deepens in lockstep with the text, so the box no longer arrives as an abrupt
  fixed-strength shape ahead of the text.
- **Prose brightness:** the overlay body was stepped from `--text-body` (#abb2bf,
  dull over the warm melt) up to `--text-strong` (#d7dae0) via a scoped
  `.arbor-intro .prose` rule. The global `.prose` token is untouched. The tissue
  **hero** prose was brought to the same level (`[data-scale='tissue'] .prose`) so
  the two match; other scales keep the standard body color.
- **Placement:** centered column; per user, horizontal placement de-prioritized
  since the overlay fades out mid-descent and never has to dodge the tree.
- **A11y:** overlay is NOT `aria-hidden` — it carries the real prose in the WebGL
  register; the `visibility:hidden` gate keeps it out of the a11y tree except
  on-screen. No double-exposure (`.cellular-doc` stays `display:none` under WebGL).

## Verification

- `npm run typecheck` clean, `npm run lint` clean (re-run after each refinement).
- Manual (user checked UI iteratively via screenshots across the session): intro
  resolves from haze, holds while lingering, clears before the project labels; the
  cooled lens keeps text legible over both cream and navy patches and now develops
  gradually rather than popping in; brightened prose reads better over the melt.

## Open items

- Tune the four envelope constants in `ArborIntro.tsx` if the reveal should start
  earlier/later vs. where the tree visibly resolves. Related knobs now live at the
  top of the file too: `MAX_RISE_PX`/`MAX_BLUR_PX` (haze resolve) and
  `LENS_BRIGHTNESS`/`LENS_SATURATE` (full-strength lens crush).
- If the lens should trail the text even more deliberately, give it its own
  slightly-later envelope instead of sharing the text's `REVEAL_START/END`.

## Key file paths

- `src/scales/cellular/ArborIntro.tsx` (new)
- `src/scales/cellular/CellularContent.tsx`
- `src/styles/globals.css` (`.arbor-intro*` block)
