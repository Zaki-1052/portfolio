# 2026-07-11 — Skip control for the overture (`> skip_`)

## What was done
Added a terminal-styled skip affordance to the opening overture so returning
visitors and keyboard/AT users can bypass the typed intro **and** the cinematic
descent, landing straight at the hero (`#tissue`).

- **`src/components/LoadingSequence.tsx`**
  - New `skip()` handler: `lenis.start()` → `lenis.scrollTo('#tissue', {immediate,force})`
    to land the hero instantly underneath, then a ~0.5s GSAP dissolve of the overlay
    (`onComplete → useIntroStore.finish()`). Reduced motion / no-overlay path calls
    `finish()` straight away (hard cut).
  - `revealed` state (800ms entrance fade-in) and `skipping` state (fade the label out
    in lockstep with the overlay dissolve).
  - Global **Escape** key listener (active while `phase !== 'done'`) → same skip.
  - Return wrapped in a fragment; `<button className="skip-intro">` rendered as a
    **sibling** of the `aria-hidden` overlay (not inside it), at `--z-nav`, with
    `aria-label="Skip intro and jump to content"`. Visible glyph is `> skip_`.
- **`src/styles/globals.css`** — new `.skip-intro` block by the overture CSS: warm-gold
  mono, top-right `clamp()` inset, `--skip-text`/`--skip-accent` locally re-declared
  (overlay's scoped vars don't cascade to a sibling), `.skip-caret` reuses the existing
  `intro-blink` keyframe, `:focus-visible` outline, exit rules (`[data-phase='push']`,
  `[data-skipping]`) placed last for source-order precedence. Extended the two
  reduced-motion rules so the caret stops blinking alongside `.intro-cursor`.

## Decisions made
- **Land at `#tissue`, not top of `#approach`** — user chose the full escape hatch over
  skip-typing-only. Label kept aesthetic (`> skip_`); the honest action lives in `aria-label`.
- **Scroll instantly + crossfade the overlay** rather than a fast-forward scroll through
  the descent (avoids a chaotic blur; the fade also masks tissue scene warm-up).
- **No store change / no new component** — reused the idempotent `finish()`; the handler
  needs the overlay ref, so it stays inside `LoadingSequence` rather than prop-drilling.
- **No auto-focus** — Escape covers keyboard users without disorienting SR users mid-type.
- **No unit test** — `LoadingSequence` is DOM/imperative (vitest node env forbids DOM
  tests); the pure `intro-typing` math and intro store remain the tested surface, untouched.

## Open items
- None functionally. `font-size: var(--text-xs)` and the 800ms/0.5s timings are tunable if
  Zara wants the label bigger/quieter or the dissolve faster.
- Not yet eyeballed in-browser (Zara verifies UI herself) — see checklist below.

## Verification
- `npm run typecheck` ✅  `npm run lint` ✅ (both clean).
- Manual: reload base URL → `> skip_` fades in top-right; click or **Esc** → overlay
  dissolves to the hero, URL becomes `#tissue`; reduced-motion → instant cut, static
  caret; Tab reaches the button with a focus ring; letting it play through fades the
  label out as the push begins.

## Key file paths
- `src/components/LoadingSequence.tsx`
- `src/styles/globals.css` (overture section, ~L1481+)
