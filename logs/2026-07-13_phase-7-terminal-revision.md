# 2026-07-13 — Phase 7 terminal: first-look revision (toolkit split pane, ls -laht)

Zara's feedback pass on the Stage A–D build, plus the preview verification
from the same session. All checks green: typecheck, ESLint, vitest (281),
production build. Plan addendum: `docs/PLAN-code-terminal.md` §Revision.

## What was done

- **Toolkit → terminal:** `content/toolkit.json` entries are now the
  chip-promoted `less` set (`[languages/] [web/]…`), rendered as drwx
  directories in the listing; the focus card shows key + stack chips (split
  from the value) + blurb. ExpressionContent lost its toolkit disclosure
  (comment explains why); CodeContent's no-WebGL doc gained it (details +
  holo popup markup moved over verbatim).
- **Split pane shipped:** `TerminalFocusCard.tsx` replaces TerminalPager —
  one DOM, two layouts. ≥760px: body flexes row, listing keeps 58%, card
  docks right behind a hairline (the typed `less` command stays visible at
  the prompt — the thing Zara couldn't see before). Narrow: full-body pager.
  `data-open` mirrored onto the body by a store subscription.
- **Honest `ls -laht`:** BOOT_COMMAND now `cd projects && ls -laht`; rows are
  perms · size · date · name (+ badge). New content slots: `size`/`date` on
  tier-1 code projects, tier-2, and toolkit entries (placeholders — Zara
  picks the metric: repo size, LOC, commit count; date doubles as the -t
  sort key, keep JSON date-descending).
- **Symlink click-expansion:** rows no longer navigate; they expand in place
  — the one-liner TYPES out (420 ms, gsap ticker + tapCommandCharsAt) beside
  the real `-> github.com/… ↗` anchor. Project dir rows still open their card.
- **Identity is content:** new `content/terminal.json` (user/host/projectsDir)
  + `getTerminalIdentity()`; prompts and title bar read it.
- **Fixes:** zebra-hover specificity bug (`:where()` so inverse-video always
  wins — even rows were unreadable on hover), `# ` dropped from card titles,
  close ✕ enlarged, terminal type bumped --text-sm → --text-base, status bar
  xs → sm.

## Decisions made

- Chips = toolkit only; projects stay row-openable (Zara: already featured in
  an earlier scale, don't re-bill them).
- `-t` in the command makes JSON order a curated date-sort — documented in
  terminal-beats + types.
- terminal.json's projectsDir must match the literal in BOOT_COMMAND (noted
  in types.ts).

## Second pass (Zara's follow-up, same day)

- Chips removed (toolkit lives in the listing only; rows complete `less `).
- Interactions reversed: cleave/metaencode → `.txt` FILES (`-rw-r--r--`)
  that expand in place (typed one-liner, GitHub after description, gold
  badge via new tier-1 stars/metric fields); tier-2 symlinks → split-pane
  cards (gold badge as `[★ 400]` bracket chip, GitHub after description).
  `highlights`/`readmeSize` schema retired — one-liners only.
- Card-switch bug: switching now backspaces the old command (150 ms, from
  the line's CURRENT text) and retypes; card swaps when typing lands;
  reduced motion writes the completed command instantly. Event kind
  'symlink' → 'external'; TerminalChips.tsx deleted.

## Third pass (correction — the second pass misread the feedback)

The second pass had it BACKWARDS: the toolkit was supposed to leave the
LISTING and stay as chips (not the reverse). Corrected model, all green:

- Listing = PROJECTS ONLY, 7 rows, every one a slash-suffixed directory
  (`cleave/`, `gptportal/` — no symlink arrows, no .txt files, all
  `drwxr-xr-x`). Main projects expand in place; tier-2 open the split card.
  Gold badges on both groups.
- Toolkit = CHIPS ONLY, as .txt documents (`[languages.txt]`), completing
  `less ~/.toolkit/<key>.txt`. Boot command is now `ls -lht` (NO -a), so
  the hidden ~/.toolkit is honestly absent from the listing — Zara's own
  "not the -a" catch. Row kinds renamed: main | project | toolkit(item).
- Print pacing: live prompt lands +200 ms after the listing finishes, chips
  +340 ms — sequenced, not simultaneous.
- ✕ visible at rest (green + accent-line border, not muted-until-hover).
- Listing gap removed (margin 0 — output sits flush under its command).

## Fourth pass (final polish round)

- Boot command restored to `ls -laht` (the -a is honest anyway: ~/.toolkit
  is HOME-level, not inside ~/projects, so it never shows regardless).
- Main projects wear distinct perms — `drwxrwxr-x` vs the others'
  `drwxr-xr-x` (MAIN_PERMS) — the visible cue for their different
  (expand-in-place) behavior.
- Expansion sequenced: description types first, the GitHub link PRINTS only
  when it lands. NOTE: cleave/metaencode one-liners are the placeholder "x"
  in projects.json — one char types instantly, so the effect only reads
  once real copy exists.

## Open items

- Zara's live pass on the revision (split pane feel, expansion, sizes).
- Real size/date/blurb/highlight copy (all placeholder).
- Stage E remainder: leva tune + bake, runway feel pass, r3f-perf baseline.

## Key file paths

`content/{terminal,toolkit,projects}.json`, `src/content/{types,loader}.ts`,
`src/scales/code/{terminal-rows,terminal-beats,TerminalFocusCard,TerminalInteractiveListing,TerminalChips,TerminalStatusBar,TerminalPromptLine,TerminalWindowContent,CodeContent}.*`,
`src/scales/expression/ExpressionContent.tsx`, `src/styles/globals.css`.
