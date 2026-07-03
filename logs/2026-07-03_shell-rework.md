# 2026-07-03 — First-scale shell rework (sculpted form + flow-aligned ridges)

## What was done

Replaced the first-scale hero shell's blobby bronze look with a sculpted, cream,
matte form covered in flow-aligned rope ridges.

- **New shared GLSL chunk** `src/shaders/shell-shape.glsl` — one source of truth for
  the surface, prepended to both shader stages (after `noise.glsl`). Holds `uTime`,
  `baseForm` (tapered dome + deep central cleft + paired lower lobes + notch),
  `ridgeProfile`/`ridgeFlow` (mirrored-longitude stripe field → fat rounded ropes,
  branch/merge via dual-density blend, warp-driven arcs), `detailHeight` (fine
  sub-striations), `poleCapFade`, `cleftCavity`, `shellHeight`.
- `src/shaders/noise.glsl` — added 2-octave `fbm2()` for cheap warps.
- Rewrote `tissue-shell.vert.glsl` (geometric ridge displacement, base-only FD normal,
  new `vDir`/`vObjPos`/`vSmoothNormal` varyings) and `tissue-shell.frag.glsl`
  (per-pixel ridge normal + `fwidth` AA, cream matte shading, warm-shadow cavity AO,
  damp sheen, golden crest streaks + rim, cavity smooth-normal blend).
- `tissue-shell-material.ts` — cream `uBaseColor`, prepend chunk, `precision='highp'`.
- `tissue-preview.tsx` — added `?z`/`?fov`/`?dpr` params for reviewing at the real
  site framing and retina resolution.

## The load-bearing bug (root cause of "melty on site, crisp in Playwright")

`IcosahedronGeometry` `detail` is **linear**, not exponential: `tris = 20·(detail+1)²`.
So detail 6/7 is only ~1k triangles — the vertex-displaced ridges rode on huge
triangles and smeared. Two compounding reasons it hid for so long:

1. My Playwright screenshots were DPR 1; a 1× capture **aliases coarse geometry into
   fake crispness**. The user's retina browser (DPR 2) showed the honest softness.
   Confirmed by forcing the canvas to `setPixelRatio(2)` and reproducing "melty".
2. Early previews were framed at z=40 (object small); the site establishes at z=26
   (object fills frame), magnifying the coarseness.

**Fix:** shell geometry `detail: 64` (≈84.5k tris, still 1 draw call), verified live
via a temporary `window.__r3f` handle + `gl.info.render`. Then a crispness pass tuned
against a **2× preview**: near-black tight groove AO, key light pulled under the 0.6
bloom threshold so bloom accents crests (not a flat wash), punchier crest streaks,
RD mottle cut to ±3%.

## Decisions

- Ship-framing is straight-on at z=26 (all camera keyframes are head-on at x=0), so the
  front view is the primary review target; always review at **dpr 2**.
- Cleft is deep in the mid-body, faded toward both poles (`crownEase`/`notchEase` +
  pole-widened slot) so the crown is a smooth dome and the lobes carry the notch —
  removes the pole starburst and the hard notch facets.

## Open items

- **Breakthrough dissolve** not yet re-verified against the deeper cleft + detail-64
  mesh (`uDissolveRadius` may need a nudge). The discard logic is tri-count independent
  so unlikely to break, but wants an eyes-on scroll check at depth ~0.15–0.2.
- **Perf**: 84.5k tris + heavy vertex shader (3× `baseForm` w/ fbm per vertex, ~253k
  non-indexed verts) at dpr 2 — fine on Apple Silicon; confirm 60fps on a real scroll
  and dial detail toward ~48 if a weaker GPU struggles.
- Comparison PNGs (`shell-*.png`, `preview-*.png`, `site-*.png`, `website.png`,
  `melty.png`, `panel.png`) left in repo root — safe to delete.

## Key files

- `src/shaders/shell-shape.glsl` (new), `src/shaders/noise.glsl`
- `src/scales/tissue/shaders/tissue-shell.vert.glsl`, `tissue-shell.frag.glsl`
- `src/scales/tissue/tissue-shell-material.ts`, `TissueScene.tsx`
- `src/dev/tissue-preview.tsx`
