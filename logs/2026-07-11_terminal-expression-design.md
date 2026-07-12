# 2026-07-11 — Terminal & expression scales: UX brainstorm → design doc

Brainstorming session on PLAN2 Phases 7–8. Outcome: a validated, standalone
design doc — **`docs/DESIGN-terminal-expression.md`** — superseding PLAN2
§Phase 7 and §Phase 8. No code written; implementation happens in a later
session (Phase 6 protein is also still unbuilt, deliberately deferred).

## What was done

- Audited PLAN2's terminal-scale UX against the built site and rejected its
  core model (linear scroll-scrubbed session recording) as structurally
  anomalous, physically awkward (scroll speed = typing speed), and passive.
- Reframed with Zara: **the terminal is the code scale's annotation system in
  terminal idiom** — ls rows = tree-tips/drums, pager = focus card,
  scroll-away release = q. Scroll choreography only at arrival/exit beats.
- Wrote the design doc covering both scales end-to-end.

## Decisions made

- **Two-clock text rule:** commands scroll-scrubbed (short, reversible);
  output event-driven at terminal speed; tap-responses time-driven.
- **Three-beat arc** for code band [0.71, 0.86): arrival flight →
  `cd projects && ls -la` boot → interactive plateau → `exit` → dissolve.
- **Interaction:** all listing rows clickable (hyperlinked-output idiom,
  inverse-video selection bar); zsh-style completion chips for tier-1 dirs
  under a live `less` prompt; status bar (vim/ranger idiom) for hints + URLs.
- **Tier mapping:** tier 1 = directories (open in-terminal pager card),
  tier 2 = symlinks `-> github` (external). The `->` teaches the behavior.
- **Pager = focus card** (project card in `less` costume, not a fake README);
  tmux split-pane as a desktop dev-toggle experiment. Mobile: pager only.
- **Staging:** cinematic flight at edges (shader-only content), window settles
  flat + camera-space-locked for the plateau; environment parallax sells
  depth. Terminal content is **HTML** composited on the flat plane — no
  troika/SDF text, no matrix3d.
- **Handoff:** `exit` prints `logout` / `Saving session...`; the cursor
  survives the window and becomes the expression scale's signal origin.
- **Closing movement:** broadcast winds down → scrubbed sign-off line → final
  pulse carries the amber warm bookend → `> surface_` control (sibling of
  `> skip_`; fade + instant scroll + overture push-in reuse) → optional idle
  humor line. Mail submit success fires a visible packet down the email line.
- Mobile first-class throughout: swipe alone plays everything; taps optional;
  Enter never required.

## Open items

- Zara reviews the design doc in a fresh session; implementation plan after.
- Deferred to iteration: beat boundaries, environment flavor (grid vs
  glyphs), split-pane keep/kill, cross-scale symlink idea, dissolve overlap
  at the 0.86 boundary.
- New content slots (lorem first): tier-1 highlight bullets, sign-off line,
  expression intro prose, real resume URL.

## Key file paths

- `docs/DESIGN-terminal-expression.md` (new — the deliverable)
- `docs/PLAN2-portfolio.md` (Phases 7–8 now superseded)
