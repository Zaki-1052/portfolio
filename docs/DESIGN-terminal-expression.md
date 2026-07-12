<!-- docs/DESIGN-terminal-expression.md — validated design for the code (terminal) and expression (contact) scales. Supersedes PLAN2-portfolio.md §Phase 7 and §Phase 8. -->

# DESIGN — Terminal & Expression Scales (Phases 7–8)

**Date:** 2026-07-11
**Status:** Validated with Zara in a brainstorming session; ready for an implementation plan.
**Supersedes:** `docs/PLAN2-portfolio.md` Phase 7 (§7.1–7.7) and Phase 8 (§8.1–8.7). PLAN2's Phase 8.5 (transition sweep), Phase 9 (loading/polish), and Phase 10 (perf/ship) still stand, with one exception: the `> surface_` control (§5.5) absorbs PLAN2 §9.5's "scroll-to-top button."
**Companion docs:** `docs/SPEC-portfolio.md` (architecture), `docs/DESIGN-portfolio.md` (global design system + anti-slop rules — all still binding).

**Build-order note:** Phase 6 (protein scene) is **not built yet** and Zara is deliberately doing 7–8 first. This design does not depend on protein specifics: the protein→code transition is an intentional aesthetic jump ("zooming past the molecular into the computational"), and the terminal's arrival-from-a-dark-void works regardless of what precedes it.

---

## 1. The core reframe: instrument, not cutscene

PLAN2 specified the code scale as a **choreographed terminal session scrubbed by scroll** — every visitor watches every command and every project README in a fixed order, character-by-character, with scroll velocity as typing velocity. That model was rejected for three reasons:

1. **It's structurally anomalous.** Every built scale follows the same shape: *fly in → linger on an interactive plateau → fly out*. The plateau has tappable, curiosity-driven targets anchored in the scene (dendrite tree-tips, coil drums); tapping one opens a detail card; scrolling away auto-releases it ("real scrolling always wins" — see `COIL_FOCUS_RELEASE_DELTA` in `src/stores/coil-focus.ts`). A wall-to-wall linear recording abandons that grammar for exactly one scale.
2. **Scrub physics are wrong for long text.** Scroll position driving every character means a fast flick sprays a screen of text in two frames and a slow drag stutters. Fine for a 20-char command; terrible for a 10-line README.
3. **It's passive.** Visitors should *use* the terminal to open the projects they're actually curious about, not sit through all of them.

**The reframe: the terminal is the code scale's annotation system, expressed in terminal idiom.** Same grammar as every other scale, new costume:

| Site grammar (built precedent) | Terminal idiom (this design) |
| --- | --- |
| Scene-native annotation targets (tree tips, coil drums) | Rows of the `ls -la` listing + completion chips |
| Tap target → focus card expands | Tap row/chip → project opens in a pager (`less`) |
| Scroll-away auto-releases focus | Pager closes when depth drifts past a release delta (`q` in terminal costume) |
| First-focus hint that retires after use | Terminal status bar hint (`-- tap a project to open --`) |
| Esc clears focus; Tab cycles targets | `q`/Esc closes pager; Tab/arrows move the selection bar |

Scroll choreography shrinks to the **edges** of the band (arrival and exit), where it belongs.

---

## 2. The two-clock text rule

A terminal session has two kinds of text on two different clocks. This rule governs every piece of text in both scales:

- **Commands are scroll-scrubbed.** Short strings (≤ ~30 chars) type character-by-character as a pure function of depth. Stop scrolling → freezes mid-word. Scroll up → backspaces. Reversible, deterministic, and charming *because* it's short.
- **Output prints event-driven.** When a command's execute threshold (a fixed depth) is crossed, its output flows out on a fast timer (~200–400 ms total), like a real shell. Output never scrubs. Rewinding above the threshold clears the output instantly and returns to scrubbing the command backward.
- **Responses to user action are time-driven.** When a visitor taps a chip/row, the resulting command completes and runs at real-terminal speed — it's a response to *them*, not to scroll.

All poses, envelopes, and character counts are pure functions of depth (except the two event-driven cases above, which are deterministic on thresholds) — so any programmatic scroll (depth indicator jump, `> surface_`) produces correct visuals for free, and reduced-motion can collapse everything to instant.

---

## 3. Phase 7 — the code scale

Band: **[0.71, 0.86)** (`SCALE_BOUNDARIES`, `src/engine/scale-manager.ts`). New scene: `src/scales/code/CodeScene.tsx`.

### 3.1 Scale arc — three beats

Starting depth values (all tunable via dev panel; treat as v1 defaults, not gospel):

| Beat | Depth range | What happens |
| --- | --- | --- |
| **Arrival flight** | 0.710 – 0.735 | Terminal window flies in as a true 3D object — small, tilted, drifting in the void — and eases dead-on, near-fullscreen, flat by 0.735. Content during flight is shader-only (title-bar glow, blinking block cursor). No HTML yet. |
| **Boot command** | 0.735 – 0.755 | The prompt scroll-scrubs `cd projects && ls -la`. Execute threshold at 0.755: the listing prints (event-driven), title bar updates to `zara@macbook — ~/projects`, the live prompt + chips appear. |
| **Plateau** | 0.755 – 0.825 | Camera parked; window screen-locked; environment parallaxes behind it. The listing is fully interactive. Visitors dwell as long as they like — depth barely matters here except as the focus-release trigger. |
| **Exit command** | 0.825 – 0.845 | The prompt scroll-scrubs `exit`. Execute at 0.845: prints `logout` / `Saving session ...completed.` (the authentic macOS login-shell farewell). |
| **Window dissolve** | 0.845 – 0.860 | Window recedes/tilts away and dissolves across the band boundary. **The block cursor survives** as a lone blinking point in the void → it becomes the expression scale's signal origin (§5). |

Command choice note: `cd projects && ls -la` (not `ls ~/projects/`) so the working directory is honestly `~/projects` — which makes the later `less cleave/README.md` path-correct. The default macOS zsh prompt then reads `zara@macbook projects %`. CS visitors notice this kind of thing; the terminal must never lie.

### 3.2 Staging — cinematic flight, flat plateau

Decision (chosen over "always flat" and "fully matrix-matched 3D"):

- **During arrival/exit** the window is a real 3D object doing cinematic things. Its content is procedural shader only (glow, cursor) — nothing needs to be crisp or interactive, so no HTML compositing problem exists.
- **During the plateau** the window pose is defined in **camera space** (parented to the camera / recomputed from `getCameraPose()`), so it stays screen-locked while mouse-parallax moves the *environment* behind it. Depth is sold by background parallax + the frame's shadow, not by tilting the window.
- **HTML content only exists while the window is flat**, so compositing is a pure 2D transform: project the window plane's corners via `worldToScreen()` (`src/engine/screen-project.ts`) → scale/translate the HTML container. **No `matrix3d`, no CSS3DRenderer.**
- Window pose is a pure function of depth → scrubbing backward un-settles/re-tilts it deterministically.

### 3.3 Window geometry & chrome (kept from PLAN2)

- Rounded-rect plane with macOS title bar: three traffic-light dots (correct macOS red/yellow/green, small precise circles), centered title (`zara@macbook — ~/projects` once booted), dark title bar with subtle separation, subtle brushed/metallic title-bar finish, matte dark body.
- Thin extruded edge for physical presence; soft shadow/AO at the edges. Chrome drawn procedurally in a ShaderMaterial fragment stage — no textures, no HTML for the frame itself.
- **Exception to the site-wide sharp-corners-at-code rule** (`DESIGN-portfolio.md`): the *window* keeps macOS's rounded corners because it is depicting a macOS object; everything *inside* it (rows, chips, pager, status bar) is sharp/square.
- Body palette: `--aod-bg-deep` `#21252b` background, `--aod-green` `#98c379` primary text, Fira Code (already `@font-face`'d; `--font-mono`). Syntax accents from the existing tokens `--syntax-*` (`src/styles/globals.css:84-91`).
- Blinking block cursor, 530 ms period, shader-drawn during flight and CSS-drawn (same rhythm) once HTML is live.

### 3.4 The register decision: terminal content is HTML

PLAN2 §7.2 proposed SDF/troika 3D text. **Rejected.** Nothing in the built site renders text in-canvas; every built scale treats HTML as the real interactive interface, projected over the 3D scene (the `CoilAnnotations` pattern: real `<button>`s, native Tab/Esc/focus, `worldToScreen` anchoring). An interactive TUI — hover states, a selection bar, tap targets, selectable text — makes 3D text strictly worse: raycast hit-targets, synthetic focus, a from-scratch a11y story.

- Terminal **content** (listing, prompt, chips, pager, status bar) = an HTML layer glued to the flat window plane (§3.2).
- Terminal **frame + environment** = canvas geometry/shaders.
- The lost per-character bloom doesn't matter: the code scale is the digital-clarity end of the post-fx gradient (grain already reaches 0 at depth 0.67 in `src/engine/post-fx-curves.ts`; bloom is minimal). Phosphor glow is faked in CSS: `text-shadow: 0 0 6px rgba(152,195,121,0.35)` (tunable) on green text.

### 3.5 The listing — hyperlinked output

Rendered from `content/projects.json` via the existing loader (`getProjects()`). Two tiers, two file types — **the file type teaches the behavior**:

- **Tier 1 = directories** (`drwxr-xr-x`, trailing `/`): projects with in-terminal content. For the code scale that's `cleave/` and `metaencode/` (tier-1 entries with `scale === 'code'`; the other tier-1 projects belong to the chromatin/protein scales).
- **Tier 2 = symlinks** (`lrwxr-xr-x`, `name -> …`): projects that live elsewhere. Tapping opens the GitHub repo in a new tab. The `->` announces "external" before anyone taps.

```
zara@macbook ~ % cd projects && ls -la
total 7
drwxr-xr-x  cleave/            Self-hosted CUT&RUN / RNA-seq analysis platform
drwxr-xr-x  metaencode/        Interactive search + exploration of ENCODE metadata
lrwxr-xr-x  gptportal ->       Multi-provider AI chat                       ★ 400
lrwxr-xr-x  ao3-explorer ->    Fanfiction analytics                     ◇ 150 MAU
lrwxr-xr-x  yeast-msa ->       S. cerevisiae alignment              Itay-Budin Lab
lrwxr-xr-x  crime-analysis ->  Chicago crime viz                                R
lrwxr-xr-x  webreg ->          UCSD enrollment alerts                        Rust
zara@macbook projects % less ▊   [cleave/]  [metaencode/]
─────────────────────────────────────────────────────────
 -- tap a project to open --                        (status bar)
```

Column layout follows the existing `TerminalListing.tsx` (perms · name · one-liner · right-aligned `★ stars` / metric, `--syntax-perm` dim perms, `--syntax-star` gold stars, alternating row backgrounds). Symlink targets (full GitHub URLs) do **not** clutter the rows — they surface in the status bar (§3.7).

**Row interaction (the "hyperlinked output" idiom — OSC 8 / iTerm2 Cmd+click, real terminal behavior):**

- Every row is a real `<button>` (dirs) or `<a target="_blank" rel="noopener">` (symlinks), full row width (mobile tap target ≥ 44 px).
- Hover/touch: underline + faint glow on the name, and an **inverse-video selection bar** (background `--aod-green`, text `--aod-bg-deep`) follows the pointer/focus. Pure TUI. No hover-scale (anti-slop rule).
- Tap a directory row → the pending command completes itself at terminal speed (`less cleave/README.md` fills in fast, time-driven) and the pager opens.
- Tap a symlink row → GitHub opens in a new tab; the terminal prints a one-line `opening gptportal ↗` feedback line that fades.

### 3.6 The live prompt & completion chips

Below the listing sits a live prompt: `zara@macbook projects % less ▊` with **completion chips** rendered beneath it in zsh menu-select style — `[cleave/] [metaencode/]` — **tier-1 directories only**, because only directories have in-terminal content. Chips mean "readable here"; symlinks are reachable only via their rows. Two affordances, one mental model.

- Tapping a chip = tapping the corresponding directory row (identical result).
- Desktop keyboard: Tab/arrow keys move an inverse-video highlight across chips and rows; Enter opens; the same keys real zsh menu-select uses.
- Chips are real `<button>`s; the highlight is `:focus-visible`-driven so keyboard and pointer share one visual.

**Minor affordance (optional accelerator, never required):** while the boot or exit command is mid-scrub, tapping the in-progress command line completes and runs it by smooth-scrolling (Lenis) to that beat's execute threshold — so scroll position and session state never disagree. Swiping alone always plays everything; Enter/taps are garnish. **Mobile is first-class: no keyboard is ever required.**

### 3.7 The status bar

A single bottom row inside the terminal body (vim/ranger/lf idiom). States:

- Idle, pre-first-open: the discoverability hint `-- tap a project to open --`. Retires permanently after the first open (coil first-focus-hint precedent).
- Row hovered/selected: details for that row — a symlink shows `-> github.com/Zaki-1052/GPTPortal`; a directory shows `cleave/README.md · 2 kB`.
- Pager open: the pager owns it (§3.8).

### 3.8 The pager — this scale's focus card

Opening a tier-1 project runs `less <name>/README.md`. The content fills the terminal body (real `less` uses the alternate screen buffer and restores on quit — the metaphor is exact: listing state is untouched underneath).

**Content is a project card in pager costume, not a fake full README** (the data per project is title, one-liner, tags, links):

```
# Cleave
Self-hosted CUT&RUN / RNA-seq analysis platform.

· <placeholder highlight bullet — lorem>
· <placeholder highlight bullet — lorem>

[React] [FastAPI] [PostgreSQL]

→ [GitHub ↗]

cleave/README.md (END) — q to close                 (status bar)
```

- Short enough to fit the terminal body without internal scrolling on desktop; at most one swipe on mobile.
- 2–3 highlight bullets per project are a **new content slot** — lorem placeholder now, Zara writes real copy after seeing it (established content workflow).
- `[GitHub ↗]` links to the real repo README.
- **Close paths:** `q` key, a `✕` affordance in the pager's top-right, Esc, or **scroll-away auto-release** — when depth drifts more than a release delta (~0.012, same order as `COIL_FOCUS_RELEASE_DELTA`) from the depth at open, the pager closes itself. Real scrolling always wins.
- Focus management: on open, move focus into the pager (non-modal region, `role="region"`, labelled); on close, restore focus to the row/chip that opened it.

**Desktop experiment — tmux split-pane** (dev-toggle, not v1 default): on wide viewports, opening a project splits the terminal tmux-style — listing stays left, project card opens right, a 1-px `--hairline` divider between, tmux-ish status line at the bottom. Mobile always uses the pager. Zara uses tmux daily; she wants to *see* both variants before choosing. Build the pager first (mobile needs it regardless).

### 3.9 State: `useTerminalFocusStore`

A per-scene Zustand store in the `coil-focus.ts` mold: `openProject: string | null`, `selection` (row/chip highlight for keyboard), `openDepth` (for the release delta), `hintRetired: boolean`, plus a `shouldReleaseTerminalFocus()` helper. Beat math (depth → beat, depth → characters typed) lives in a pure, unit-testable module (e.g. `terminal-beats.ts`).

### 3.10 Environment & post-fx

- The terminal floats in a dark void. Behind it: **sparse green-tinted grid lines receding into depth** and/or very faint drifting glyph particles at low opacity. **Explicitly avoid Matrix-style code-rain** — it's the terminal equivalent of the purple-gradient slop the design doc bans. The window is the hero; the environment is atmosphere that exists mainly to parallax.
- Post-fx (per `post-fx-curves.ts` and the PLAN2 gradient table): minimal green-tinted bloom, **zero grain, zero vignette**, very light fog. This is the digital-clarity end of the descent. No scanlines at this scale (scanlines belong to expression, §6.1).
- Draw-call budget: window frame 1–2, grid 1, particles 1, atmosphere 1–2 — the HTML layer costs zero. Well under the per-scale share of the 100-call budget.

### 3.11 Accessibility

- Canvas stays `aria-hidden="true"`. The HTML terminal layer **is** the real interface (site precedent) — listing container `role="group"` with a label, rows/chips real buttons/links, external links `target="_blank"` + `rel="noopener"` + `↗`.
- Keyboard: Tab/arrows traverse rows and chips, Enter opens, `q`/Esc closes, focus restored on close. Nothing intercepted by the canvas.
- Reduced motion: no flight (window appears settled, opacity envelope only), commands appear fully-typed at their thresholds (no scrub), output instant, cursor static, pager opens/closes instantly. All content reachable.
- No-WebGL fallback: the existing Phase 1 HTML (`CodeContent.tsx` + `TerminalListing.tsx`) — unchanged. Integration seam: add `code` to the `[data-webgl='active']` reveal selector (`globals.css` ~425–444) and give the document register a `.code-doc` display-none pattern, exactly as chromatin did.

---

## 4. The handoff — code → expression

The exit beat (§3.1) is the narrative hinge: scroll types `exit`, the shell prints its authentic farewell (`logout` / `Saving session ...completed.`), the window recedes and dissolves — **and the cursor outlives the window.** A single blinking block cursor persists alone in the void across the band boundary and becomes the origin of the expression scale's signals. The prompt glyph literally becomes the transmitter: the code produced the signal, and now the signal goes out. Fog lifts slightly (expression is the sparsest, most open scale).

---

## 5. Phase 8 — the expression scale

Band: **[0.86, 1.0]**. New scene: `src/scales/expression/ExpressionScene.tsx`. Unlike the terminal, PLAN2's expression concept already fits the site grammar (scene + annotations + focus) — it keeps its shape; this section pins the mechanics and designs the seams.

### 5.1 Signal-origin scene

- **Central node:** the surviving cursor — a small, bright, emissive blinking point. It carries a tiny live prompt beneath it: `% mail zara ▊` (§5.3).
- **Signal lines:** thin luminous lines radiating outward, one per contact channel from `content/links.json` — email, GitHub, LinkedIn, Bluesky, resume. Lines extend and fade into distance; brightness pulses travel center → periphery on slow randomized-phase timers (data transmission).
- **Palette:** dominant `--aod-green` register continuing from code; each line may carry a subtle secondary tint at its terminus (contribution-green, LinkedIn blue, amber for email) — accents only, never dominant.
- **Particle packets:** sparse instanced points traveling outward along the lines. One draw call.
- **CRT scanline overlay:** the HTML register's scanline texture carries into the scene as a very-low-opacity screen-space overlay. Texture, not obstruction. This is the one scale that gets it.

### 5.2 Contact annotations

`src/scales/expression/ExpressionAnnotations.tsx`, built on the `CoilAnnotations` pattern (worldToScreen projection, viewport clamping, real buttons, Esc clears, per-scene focus store, e.g. `useSignalFocusStore`):

- Each line terminates at a floating annotation: label + handle (`github.com/Zaki-1052`, `zalibhai@ucsd.edu`, …), luminous type register, all interactive.
- **Focus:** tapping a line *or* its annotation focuses that channel — the line brightens, its pulse intensifies, others dim, the camera pivots slightly toward it, and the annotation expands with the full handle/detail. One grammar everywhere: tapping a line = tapping a drum.
- Tab cycles the contact links; scroll-away releases focus (same release-delta pattern).
- Resume is a channel; its target is `cv.pdf` (URL currently `#` in `links.json` — real URL is a content TODO for Zara).

### 5.3 `mail zara`

- The trigger is the scene-native prompt at the central node: `% mail zara ▊` — a real button in terminal costume ("commands are things you tap to run", continuous with the plateau).
- The form itself stays the existing HTML overlay (`TerminalMail.tsx` + `useTerminalMail.ts`, Formspree config in `content/form.json`) — unchanged logic, already styled to register (dark, green, Fira Code, sharp corners, focus trap, Esc, rate limit).
- **Submit spark:** on successful submission, a distinct bright pulse fires down the *email* line — the visitor's message visibly leaves the system as a packet. Implementation seam: a `signalBurst` counter in the expression store, incremented by the form's success handler; the scene watches it. Reduced motion: skip the pulse, keep the form's existing success state.

### 5.4 Expression intro

`ExpressionIntro.tsx` on the established envelope pattern (`CoilIntro`/`ArborIntro` twins): prose from `content/sections/expression.md` (frontmatter title `$ whoami --contact`; body currently lorem — Zara writes it later), resolving from the haze in a depth window (~0.87–0.90) and clearing before the annotations arrive (~0.90).

### 5.5 The closing movement (depth ~0.95 → 1.0)

The site opened by booting up; it closes by signing off.

1. **The broadcast winds down.** Pulses grow sparser, lines dim toward embers, fog at its thinnest. The stillest, sparsest moment of the site. Descents end in stillness.
2. **The cursor speaks once more.** The surviving cursor scroll-scrubs one final short sign-off line into the void (two-clock rule: it's short, so scrubbing is right). Prose slot in `expression.md` — placeholder now.
3. **The last pulse carries the warmth.** One final bright packet travels out the email line; as it goes, the palette warms — amber (`--aod-gold` / tissue warmth) bleeding back in from the edges. This is PLAN2's planned CSS-custom-property warm bookend, now *motivated* by a visible cause.
4. **`> surface_`.** Beneath the sign-off, the return control fades in — sibling of the existing `> skip_` overture control (same family: mono, warm-gold `--skip-text`/`--skip-accent`, blinking caret, quiet). On tap: fade to dark (~0.5 s) → `lenis.scrollTo` top (immediate, under cover of darkness) → **replay the overture's camera push-in** (flight only, no typed lines) → fade in at the hero. This follows the skip-control decision precedent exactly (instant-jump-plus-fade over fast-scroll, which was rejected as chaotic blur). Seam: extract/reuse the push-in flight from `LoadingSequence.tsx`. This control **absorbs** PLAN2 §9.5's "scroll-to-top button."
5. **Idle garnish (optional, cut freely):** if the visitor lingers at the very bottom, after a long pause the cursor types `% nothing further down. scroll to ascend.`

**Parked experiment (dev-toggle only):** a cinematic *reverse flight* to the surface — the scrub-everything architecture theoretically plays the whole descent backward from a single long `scrollTo` — but rapid scene mount/unmount across all bands is a real perf risk. The fade + push-in is the shipping behavior.

### 5.6 Accessibility & fallbacks

- Same rules as §3.11. Annotations and `% mail zara` are real buttons; Tab order: intro → contact links → mail → `> surface_`.
- Reduced motion: lines static, no pulses, sign-off instant, `> surface_` does an instant cut (matching skip behavior).
- No-WebGL fallback: existing `ExpressionContent.tsx` (contact links, toolkit disclosure, mail trigger) — unchanged. Same CSS reveal seam as §3.11 for `expression`.

---

## 6. Cross-cutting

### 6.1 Post-processing gradient (end of the descent)

| Scale | Bloom | Grain | Vignette | Fog | Temperature |
| --- | --- | --- | --- | --- | --- |
| Code | Minimal, green | None | None | Very light | Green-digital |
| Expression | Minimal, green | None | None | Sparsest | Green, warm amber bookend at the very bottom |

Values interpolate smoothly in transition zones (`post-fx-curves.ts`); scanline overlay is expression-only.

### 6.2 Dev toggles (leva)

Zara iterates visually; ship variants behind toggles so she can flip them live. **Slider ranges must include the shipped defaults (leva clamps out-of-range values → dev silently diverges from prod).**

Pager vs split-pane · chip styling/visibility · typing scrub rate (chars per unit depth) · beat boundary depths · execute-threshold output speed · phosphor `text-shadow` intensity · selection-bar style · environment variant (grid / glyphs / both) · pulse frequency & packet density · warm-bookend onset depth · reverse-flight ascent (experiment) · idle-garnish on/off.

### 6.3 Verification workflow

Isolated previews, per project convention (scenes are verified via `*-preview.html`, never the live site): add `code-preview.html` and `expression-preview.html`. Review shaders at dpr 2. `r3f-perf` baselines recorded after each phase.

### 6.4 Testing

Unit-test the pure logic (Vitest, established pattern): beat math (depth → beat / chars typed / window pose phase), command scrub slicing, focus-release deltas, projects.json → dir/symlink mapping, closing-movement envelopes. Manual: the previews, scroll feel, both pager/split variants, mobile.

### 6.5 New content slots (all lorem/placeholder first — Zara writes after seeing them)

1. 2–3 highlight bullets per tier-1 code project (Cleave, MetaENCODE) — `projects.json` or per-project markdown.
2. Final sign-off line — `expression.md`.
3. Expression intro prose — `expression.md` (existing slot, still lorem).
4. Real resume URL in `links.json` (currently `#`).
5. Optional idle-garnish line (default provided above).

### 6.6 Open questions (deliberately deferred to implementation/iteration)

- Exact beat boundaries and release deltas (dev-panel tuning).
- Environment flavor: grid vs. drifting glyphs vs. both (decide in preview).
- Split-pane: keep or kill after desktop experiment.
- Cross-scale symlinks (idea, unscoped): the chromatin/protein tier-1 projects could appear in the listing as `hic-pipeline -> ../chromatin/` symlinks that scroll-jump *up* to their scale. Cute, possibly confusing; revisit after the core works.
- Whether the exit beat's dissolve should overlap the expression intro window or hand off cleanly at 0.86.

---

*End of design doc.*
