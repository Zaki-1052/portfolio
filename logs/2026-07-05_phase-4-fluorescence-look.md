# 2026-07-05 — Phase 4 iteration: the fluorescence look, disintegration handoff, crackle

Fourth session of the day, from the user's eye-pass + two attached references:
the band goes MULTICOLOR (electric blue body, green sheaths, warm bead lights
on deep navy — the microscopy reference), the broken handoff becomes a wall
disintegration, and the pulse becomes electricity.

## What was done

- **Palette swap (user-directed)** — cellular band accent → blue
  (`--aod-blue`), chromatin inherits rose; band bg/fog → deep navy
  (`#23283a` / `#232c40`); section washes swapped; `ARBOR_FOG_ROSE` →
  `ARBOR_FOG_TINT '#232c40'`. Look defaults: blue-slate body `#356487`,
  icy tips, cyan rim, green strand sheath `#8be3b4`.
- **The bead layer** (`buildPunctaGeometry` + `ArborPunctaMaterial` +
  `arbor-puncta.{vert,frag}.glsl`) — multicolor glowing dots strung along
  EVERY member at ~0.85u spacing, perched just off the surface, per-bead
  palette color (`PUNCTA_PALETTE`: gold/coral/red/green/cyan), individual
  shimmer, glint when the member's signal wave passes, hue-dominant core
  (white cores would launder the multicolor under bloom). One Points draw.
- **Transition fix (the user's screenshot)** — the dimmed-but-opaque interior
  kept depth-occluding the new scene (limbs sliced through floating wall
  fragments). New `uExitDissolve` on the shell material: past the first
  content beat the walls DISINTEGRATE (noise-keyed discard + glowing edges,
  driven by `1 - interiorExitFade`), stalk mirrors it. Verified: the handoff
  now reads as the golden interior shattering while the cool structure
  emerges through the gaps.
- **Lights-first reveal** — glow layers (strands/tips/beads) use softened fog
  extinction (×0.35 in the exponent) so the lights read through the mist
  BEFORE the solid body, whose uOpacity now rises 0.315→0.35 (BODY_REVEAL
  constants in ArborMesh).
- **Electricity** — the pulse is now a crackle: high-frequency flicker +
  hard sputter segments at the wave front, white-hot front tint, and the
  strand VIBRATES (vertex jitter gated by the front). Tips spark rather than
  swell. All frozen under reduced motion (gain forced 0).
- **Hub rework** — granular two-hue inner glow (`uHubGlowA/B/Strength`,
  fine-grained fbm field ×5.2 freq), bark relief damped ×0.35 on the hub
  (aLimb −2 tags hub vertices), 20×32 tessellation, hubScale 2.35, brighter
  blue register lighting (cool ambient/key).
- **Annotation legibility** — near-white 13px/600 labels with accent-halo
  text-shadow (color-mix, palette-agnostic), a glowing anchor bead at each
  projected tip, brighter entry text; the scale badge is hidden in the
  scene-native register (kept in the fallback document via ScaleBadge).
- **Fluid arms** — `waviness` param: per-limb lateral bow peaking mid-spine;
  minorLimbs default 4; wider spread (50°), curl 0.45.
- Dev panel: waviness, punctaSpacing, punctaSize, hubGlowA/B/Strength sliders.

## Verified live (Playwright, dpr 2)

Disintegration beat: golden islands breaking apart, blue-green structure +
colored beads emerging through the gaps (58 FPS, both scenes). Dwell: the
reference look — blue limbs off the glowing hub, a crown firing white, beads
and warm field dots on navy, labels clearly legible, neighbors at frame edge
(61 FPS). Gate: typecheck · lint · **134 tests** · build.

## Same-day follow-up round (user eye-pass: "limbs dull/homogeneous, hub reads
## as a 2D ellipse, splits too uniform, spines rigid, more/bigger beads")

- **Limb encrustation (trunk frag)** — green sheath patches
  (`uSheathColor/uSheathAmount`, fbm-thresholded, stronger toward the
  reaches), bright speckle grains (high-freq snoise), and a per-member tint
  drift — members only; the trunk/hub keep the clean blue core register.
- **Hub 3D form (trunk vert)** — low-frequency lump displacement (`uHubBump`)
  with a numerically recomputed normal (tangent-plane FD of the lump field,
  vertex-stage branch — no taps), fine grain stays damped: an organic mass,
  not a tacked-on disc.
- **Fractional fine splits** — `fineSplits` is a float (default 2.4): each
  split rolls floor/ceil stochastically, breaking the uniform-binary read.
- **Momentum meander** — the limb bend direction random-walks slowly instead
  of jittering per step; consecutive steps curve the same way → flowing arcs.
- **Beads** — spacing 0.55, size 0.52, density crowds toward the reaches
  (spacing × (1.25 − 0.65·t)).
- New sliders: fineSplits (0.1 step), hubBump, sheathColor, sheathAmount.
- Verified at the dwell: encrusted limbs + warm beads + firing crowns on navy,
  60 FPS. Gate re-run green (typecheck · lint · 134 · build).

## Second same-day follow-up (user round: freezes + deep-link bug + integration)

- **User-blessed freezes** (2026-07-05): strandOpacity 0.65 · pulseGain 1.0 ·
  hubGlowStrength 2.0 · hubBump 0.1 · punctaSize 0.65 → LOOK_DEFAULTS.
- **Deep-link intro bug FIXED** — refreshing with any section #hash locked the
  visitor into the typed overture at the top. New pure
  `shouldSkipIntroForHash` (stores/intro.ts, +3 tests): any valid scale hash
  except #approach finishes the intro at boot; LoadingSequence's landing
  effect then honors the hash instantly. Verified: /#cellular lands in-band
  in <2s, no overlay; base URL still plays the overture (visual check).
- **Strand↔limb integration** (the "hologram" seam): ribbon half-width capped
  at 0.13 (the first edge inherited the member's fat radius → glowing sheet),
  and a per-vertex `aLevel` attachment ramp — strands emerge dim and
  hue-locked to the sheath, reaching full luminance by generation ~3.
- **Reframe** — sweep/settle knots aim lower and stand further back (targets
  y −3…−6) so the hub never clips the frame bottom and the trailing
  filament's fall is visible on the live site; the C1 test caught
  exactly-stationary axes in the new knots (zero tangent = FD noise = honest
  flag) — nudged so every axis keeps moving knot-to-knot.
- **Flanks** — canopy drift widened (count 210, rOuter 24): sparse warm dots
  inhabit the frame edges without crowding.

## Third same-day follow-up (final polish round of the session)

- **Framing** — user called the reframe overcorrected; knots moved to the
  midpoint between the two versions (settle [-11.5,-2.5,5.5] → [1,-3.5,-24]).
- **Root closed** — spine sweeps now cap BOTH ends (the trunk's root ring was
  an open pipe mouth visible under the hub from the new lower angles).
- **Trailing filament** — tailLength 13 → 6.5, segments 6: its end wisps now
  live inside the settle frame.
- **Longer dwell** — runways arrival 180vh / index 200vh (~1 extra viewport
  of sweep time before the next band covers).
- **Entries always open LEFT when focused** — enforced in CSS
  (`[data-focused] .arbor-annotation__body`) so no imperative side-write can
  race it (a stale-side race was reproduced live: the focused panel flipped
  when parallax pushed the anchor past the hysteresis band); focused
  annotation stacks at z-index 2 so overlapping dim labels can't intercept
  its links; React no longer owns data-side (JSX prop removed, CSS default).
- **Click affordance** — anchor beads pulse (2.4s breathe, stops when its
  branch is focused, off under reduced motion).
- **Attachment gradient brightened** — the dim ramp read as a murky film
  between members: floor 0.28 → 0.5, full luminance by generation ~2.2.
- **Waviness 0.55 → 0.7.**
- Verified live: /#cellular deep link → dwell → focus opens left (computed
  style asserted) → release; final frame arbor-27-final.png. Gate: typecheck
  · lint · **137** · build.

## Closing round (focus-exit UX + wrap)

- **Focus exit flow made discoverable** (user UX question: "how do I get out?"):
  a "✕ back to overview" button heads the focused entries panel (luminous
  register, no box; `.arbor-annotation__back`), **Esc** releases focus as its
  keyboard twin (window keydown in ArborAnnotations), and a one-time teach —
  "scroll to continue the descent" — shows under the entries on the FIRST
  focus only (`hintRetired` state; retires once any panel is closed). The
  pre-existing exits remain: re-click the focused label, click another label
  (direct A→B glide), or scroll past ±0.012 depth.
- **User hand-tuned `tailLength: 2.0`** in arbor-generator defaults (kept);
  the decorative-members test now derives its descent threshold from
  `tailLength` (≥ half its length below the hub), so tail tuning can never
  fail it.
- Gate run by the user (gate.txt): typecheck · lint · tests · build all green
  (the && chain gates each step; build ✓ at 462 kB gzip).
- Ember/drift dials for self-tuning: `CANOPY_DRIFT` in
  `src/scales/cellular/arbor-atmosphere.tsx` (count/size/0.55 brightness/
  color/radii) + `NEIGHBORS[].dim`; band one's fields in
  `src/scales/tissue/atmosphere-motes.tsx` + the moteOpacity/emberOpacity
  panel sliders.

## Open items

- User slider session on the new register (hub granularity, bead density/size,
  crackle cadence, waviness) → bless → freeze into defaults.
- Crackle/vibration judged live (static shots can't).
- Focus-state legibility re-check over the brighter canopy.
- 4.3 tail: final knot/fog passes; chromatin's rose adoption lands with its
  own scene (Phase 5).

## Key file paths

`src/styles/globals.css` · `src/scales/cellular/{arbor-params,arbor-geometry,
arbor-glow-material,arbor-trunk-material,ArborMesh,arbor-atmosphere,arbor-fog}.ts[x]` ·
`src/scales/cellular/shaders/arbor-{trunk.vert,trunk.frag,strand.vert,strand.frag,
tip.vert,tip.frag,puncta.vert,puncta.frag}.glsl` · `src/utils/arbor-generator.ts` ·
`src/scales/tissue/{tissue-shell-material.ts,TissueScene.tsx,stalk-mesh.tsx,
shaders/tissue-shell.frag.glsl}` · `src/engine/scene-atmosphere.tsx` ·
`src/dev/arbor-dev-tools.tsx`
