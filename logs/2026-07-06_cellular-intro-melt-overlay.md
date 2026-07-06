# 2026-07-06 — Cellular intro prose surfaced in the melt-to-tree transition

## What was done

Put the cellular band's intro paragraph (`content/sections/cellular.md`) back into
the **WebGL register**, where it had been lost. In 3D the whole `.cellular-doc`
block is `display:none`'d, so the only cellular text was `ArborAnnotations` (the
project labels, revealing at depth 0.33). The intro prose now appears during the
tissue→cellular **melt**, resolving out of the haze with the tree and clearing
before the labels arrive.

- **New:** `src/scales/cellular/ArborIntro.tsx` — fixed, `pointer-events:none`
  overlay column. Opacity/blur/rise driven by a `smoothstep` depth **envelope**
  on the gsap ticker (no React re-render; early-outs when depth + reduced-motion
  are unchanged; `visibility:hidden` when faded). Reads the same
  `getSection('cellular')` prose via `MarkdownRenderer`. Mirrors the
  `ArborAnnotations` imperative-envelope pattern.
- **Modified:** `src/scales/cellular/CellularContent.tsx` — render `<ArborIntro />`
  beside `<ArborAnnotations />` (import added).
- **Modified:** `src/styles/globals.css` — new `.arbor-intro` block (WebGL-gated,
  `--z-overlay`), centered `.arbor-intro__col` (`min(620px,82vw)`, left-aligned,
  Lora serif title), and a self-contained centered radial scrim via
  `.arbor-intro__col::before`.

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
- **Placement:** centered column; per user, horizontal placement de-prioritized
  since the overlay fades out mid-descent and never has to dodge the tree.
- **A11y:** overlay is NOT `aria-hidden` — it carries the real prose in the WebGL
  register; the `visibility:hidden` gate keeps it out of the a11y tree except
  on-screen. No double-exposure (`.cellular-doc` stays `display:none` under WebGL).

## Verification

- `npm run typecheck` clean, `npm run lint` clean.
- Manual (pending, user checks UI): `npm run dev`, scroll the tissue→cellular
  seam — intro resolves from haze over the scrim, holds while lingering, clears
  before the project labels; scrubbing back reverses cleanly; reduce-motion drops
  blur+rise; no-WebGL fallback still shows the same prose in `.cellular-doc`.

## Open items

- Tune the four envelope constants in `ArborIntro.tsx` against the live scene if
  the reveal should start earlier/later relative to where the tree visibly
  resolves.

## Key file paths

- `src/scales/cellular/ArborIntro.tsx` (new)
- `src/scales/cellular/CellularContent.tsx`
- `src/styles/globals.css` (`.arbor-intro*` block)
