# Phase 1d: Hero Identity (pfp + role glitch) & Pre-Phase-2 Toolchain Rescue

**Date:** 2026-06-29 → 2026-07-01

## Scope

Reconstructed from two feature commits made across separate sessions — `af61f5c` (add pfp)
and `b40e92c` (glitch) — plus a pre-Phase-2 cleanup pass done this session. The contact form
(`073fb0c`) and HTML-gap fixes (`733f5c3`) are logged separately (terminal-mail log /
phase-1c log) and are not repeated here.

## What was done

### Hero profile photo (af61f5c, 2026-06-29)
- Tissue hero became a two-column layout: prose column (left, max 760px) + a 420×420 profile
  photo (right), with `gap: var(--space-8)`.
- `ScaleSection` gained an optional `maxWidth` prop; tissue widened to `min(1400px, 100%)` to
  fit the two-column composition.
- Photo served from `/pfp.png`, rounded 16px, accent-line border, accent glow. New `.pfp`
  hover state brightens + intensifies the glow (oklch-derived from `--accent`).

### Role glitch cycle + visual refinement (b40e92c, 2026-06-30)
- New `src/hooks/useGlitchCycle.ts`: a scramble-and-resolve headline cycler (RAF-driven) that
  holds each item, then glitches into the next on a loop.
- Hero subtitle replaced with a cycling role in mono type:
  `bioinformatics → computational biology → epigenomics research → full-stack development`,
  each suffixed `@ UCSD`. Subtitle font shifted sans → mono, `text-sm` → `text-md`.
- `ProjectCard` + `Tag` restyle: accent-soft fills, accent-line borders, deep surface,
  3px accent left-border on cards.
- Publication left-border/padding moved from inline styles into the `.publication` CSS class.
- Atmospheric intensity pass in `globals.css`: per-scale radial-glow opacities raised, section
  boundary fade widened (85%→75%), grain opacity re-tuned per scale (tissue 0.055 down to 0 at
  code/expression), branch dim 0.4→0.55, contact-row accent left-border on hover, asymmetric
  content grid 1.4fr→2.2fr.

### Pre-Phase-2 cleanup & toolchain rescue (this session, 2026-07-01)
`main` was found in a broken state; fixed before proceeding to Phase 2:
- **Build was broken.** `useGlitchCycle.ts` failed `tsc -b` under `noUncheckedIndexedAccess`
  (`items[i]` is `string | undefined`). Fixed with nullish fallbacks + `.charAt()`; the
  scramble behavior is preserved exactly.
- **`typecheck` script was a false green.** `tsc --noEmit` ran against the root *solution*
  tsconfig (`"files": []`) and therefore checked nothing — which is why the broken build
  slipped past. Changed to `tsc -b --noEmit` so it checks the real project graph.
- **Lint was broken (144 errors).** `old.js` (a 1717-line dump of the old portfolio) sat at
  the repo root and got linted (d3/Alpine globals, unused vars). Moved to
  `docs/old-portfolio-source.js` (docs/ is eslint-ignored) — declutters root and clears lint.
- **Untracked 3 committed `.DS_Store` files** (`.DS_Store`, `reference/.DS_Store`,
  `reference/components/.DS_Store`). Already in `.gitignore`; they were committed before the
  ignore existed and showed up as noise in every diff.
- **Removed root `pfp.PNG`** — a byte-identical duplicate of `public/pfp.png` (the copy
  actually served), 584KB of dead weight.
- **Fixed `brain.md` corruption** — the pfp commit left `"...computational biLorem ipsum..."`,
  a half-typed intro merged into the lorem placeholder. Restored to clean placeholder per the
  placeholder-first workflow.
- **Accessibility:** `useGlitchCycle` now respects `prefers-reduced-motion` (holds the first
  role statically, no scramble, no cycle) — the project treats reduced-motion as non-negotiable.

## Verified
- `npm run typecheck` — clean (now actually checks `src/`)
- `npm run lint` — clean (0 errors, was 144)
- `npm run build` — passes

## Decisions made
- `useGlitchCycle` reduced-motion guard is a self-contained `matchMedia` check for now;
  Phase 2.5's centralized `useReducedMotion` (which also carries the on-page toggle + localStorage)
  should later absorb it.
- `old.js` was moved, not deleted — kept as reference alongside `docs/old-portfolio.md`; can be
  deleted later if unwanted.
- Root `pfp.PNG` removed outright (safe: proven byte-identical to `public/pfp.png`).
- typecheck fix uses `tsc -b --noEmit` (verified working on TS 5.9.3) to match what `build` compiles.

## Open items (flagged, not addressed)
- **Bundle size:** production JS is ~1.24MB (346KB gzip) — an empty R3F Canvas already pulls in
  all of three.js. Expected; resolved by per-scale code-splitting / lazy mounting in later phases.
- **`pfp.png` is 584KB** for a 420×420 display slot — optimize (resize + WebP) in the Phase 7 perf pass.
- **`icons/` at repo root (~3.7MB of PNG exports)** — only `public/favicon.svg` ships; the source
  PNGs could move to `reference/` or be dropped. Left as-is pending a call.
- **Glitch cycle + screen readers:** the scrambling text is not in a live region (won't spam SR
  announcements), but Phase 2.5 should confirm and consider `aria-hidden` on the animated span.
- Reduced-motion guard checks at mount only (doesn't react to a live OS toggle) — fine until
  Phase 2.5 unifies motion handling.
- CI was red on `main` before this pass; green locally now — confirm the Actions run passes on next push.

## Key file paths
- `src/hooks/useGlitchCycle.ts` — new hook; made type-safe + reduced-motion aware (this session)
- `src/scales/tissue/TissueContent.tsx` — two-column hero, profile photo, glitch role subtitle
- `src/components/ScaleSection.tsx` — new `maxWidth` prop
- `src/components/ProjectCard.tsx`, `src/components/Tag.tsx` — accent-soft restyle
- `src/scales/chromatin/ChromatinContent.tsx` — publication inline styles → `.publication` class
- `src/styles/globals.css` — atmospheric pass, `.pfp`, `.publication`, grid ratio
- `content/sections/brain.md` — corruption fixed (restored placeholder)
- `package.json` — `typecheck` now `tsc -b --noEmit`
- `docs/old-portfolio-source.js` — moved from root `old.js`
