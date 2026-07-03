# First-Scale Shell Rework — Sculpted Form + Flow-Aligned Ridges

> Language rule (project memory): all code, comments, and discussion refer to the object
> neutrally — "shell", "form", "ridges", "lobes", "cleft". No anatomical wording anywhere.

## Context

The first-scale hero object (`src/scales/tissue/`) currently renders as a lumpy bronze
blob: the ridge pattern is isotropic `abs(snoise)` (labyrinth rings/blobs, not directional
ropes), the ridges are painted as albedo darkening rather than shaded 3D relief, the
brown base + gold fresnel + heavy depth-0 bloom reads metallic/glossy, and the silhouette
is a wide ellipsoid with a soft dimple — no taper, no bottom lobes, no deep straight cleft.

Target (from the user's reference description):

- Compact mass ~as wide as tall; broad domed top tapering downward; bilaterally symmetric.
- Bottom swells into **two rounded pendulous lobes** side by side, small **notch** between
  them at bottom center.
- **One deep, continuous, straight cleft** down the middle, top to bottom — the deepest,
  darkest, straightest division; halves swell and press together along it (continuous over
  the crown, no fade at the apex).
- Surface covered in **fat rounded rope-like ridges**: thick softly-domed tubes, elongated,
  flowing in long arcs, locally roughly parallel, branching/merging; ~a few dozen across
  the object. Tighter coils near the top/center; longer straighter more vertical folds
  lower/outer.
- Narrow deep crevices between ridges that read as **shadow, not color**.
- **Pale uniform cream** albedo, essentially no color variation.
- **Matte, slightly moist** — faint broad sheen, no gloss/metal.
- Soft diffuse light from **above + front**; broad gentle crest highlights; soft crevice
  shadow; deep ambient shadow in cleft + bottom notch. Depth read via smooth rounded
  gradients + thin shadow lines.

This also returns to the DESIGN doc's warm register: cream object under warm golden light
on the dark warm bg, with depth-0 bloom kissing only the crests.

## Design

### 1. Shared height-field chunk — `src/shaders/shell-shape.glsl` (new)

One source of truth for the surface, prepended to BOTH stages in
`tissue-shell-material.ts` (`noise` → `shell-shape` → stage body), exactly like
`noise.glsl` today. Contains `uniform float uTime;` (moved out of the vert), plus:

- `float baseForm(vec3 dir)` — large-scale radial height over the unit direction:
  - **Taper**: base radius × `mix(1.0, ~0.82, smoothstep(0.5, -0.3, dir.y))` — broad domed
    top, narrower low waist (applied to the base radius in `toSurface`, not to the additive
    height).
  - **Paired swell + cleft**: current valley/mound cross-profile over
    `ax = abs(dir.x + tiny wobble)`, retuned: `CLEFT_WIDTH ~0.10`, `CLEFT_DEPTH ~1.8`
    world units, `MOUND ~0.55`. **No apex fade** — the cleft crosses the crown so the top
    silhouette dips at center and the two halves read as separate domes pressed together.
  - **Two lobes**: `pow(max(dot(dir, LOBE_DIR_{L,R}), 0.0), k)` bulges,
    `LOBE_DIR = normalize(±0.50, -0.82, 0.28)` (front-biased so they read from the site's
    straight-on camera), `k ~6`, height `~0.9`.
  - **Bottom notch**: extra cleft deepening `~+1.1` masked by `smoothstep` on `-dir.y`.
  - **Tiny broad undulation** only (`fbm2 · ~0.15`, slow `uTime` drift) — the current
    large random fbm mounds are REMOVED; nothing competes with the cleft.
- `float ridgeField(vec3 dir, vec3 p)` — flow-aligned anisotropic ridges replacing the
  isotropic field:
  - Across-flow coordinate: mirrored longitude `theta = atan(dir.z, abs(dir.x) + 1e-4)`
    (epsilon kills the 0/0 NaN risk at the poles; the `|x|` fold gives bilateral symmetry
    with the phase kink landing exactly in the cleft). Iso-lines are meridians → vertical
    parallel folds on the front/sides, converging near the top.
  - Stripe phase `RIDGE_N · theta + warp`, `RIDGE_N ~28` (≈14–18 visible crests per front
    face → "a few dozen" with branching).
  - **Two-band domain warp**: coarse `fbm` band whose amplitude GROWS toward the top
    (`mix(0.9, 2.4, smoothstep(0.3, 0.9, dir.y))`) → tight coils/swirls near the crown,
    long straight arcs lower; plus a small fine band for organic wiggle.
  - **Dual stripe system** for genuine branch/merge topology: second system at half
    density, blended by a slow patchy noise mask (`mix(sin(phaseA), sin(phaseB), mask·0.5)`)
    — ropes visibly fuse/split instead of just wiggling.
  - **Profile**: smoothstep of the sine shaped so ridges are broad rounded domes and
    grooves are narrow (`smoothstep(-0.6, 0.6, s)` + extra smooth-rounding pass).
  - Ridge amplitude fades only in a small cone at the exact poles (anti-singularity,
    ~3–8°, NOT a broad stylistic cap fade) and in a thin `abs(dir.x)` gap so the cleft
    floor stays clean.
- `float shellHeight(vec3 p)` = `baseForm` + `ridgeField · RIDGE_AMP` (`~0.35` world
  units — geometric, resolvable: wavelength ≈2.7 vs vertex spacing ≈0.22).

`noise.glsl` gains a non-breaking 2-octave `fbm2()` for the cheap warp band.

### 2. Vertex shader — `tissue-shell.vert.glsl`

- `toSurface` displaces along the ellipsoid normal by `shellHeight` over base radius
  `SHAPE ≈ (1.0, 0.95, 1.0)` × taper. Ridges are now IN the silhouette.
- Finite-difference normal (existing pattern, `EPS 0.2`) computed from the
  **baseForm-only** surface map — smooth coarse normal; the ridge tilt is added per-pixel
  in the fragment (avoids double-counting the ridge gradient).
- New varyings: `vDir` (unit direction) and `vObjPos` (pre-displacement position) so the
  fragment evaluates the same field in the same domain. `vFold` is replaced by
  `vCavity` = cleft/notch valley factor for the deep-shadow term. `vUv` stays.

### 3. Fragment shader — `tissue-shell.frag.glsl`

- **Per-pixel ridge normal**: tangent frame from `vDir`; evaluate the ridge profile at
  3 taps (small eps) — but evaluate the expensive `fbm` warp ONCE per pixel and reuse it
  across taps (warp is locally constant); only `atan`/`sin`/profile re-run per tap. Net
  cheaper than today's 15-snoise/pixel field. Tilt N by the gradient (existing trick).
- **fwidth anti-aliasing** on the stripe phase — fade ridges once ≥~½ cycle/pixel
  (mandatory: the camera passes through the shell and grazes the far wall).
- **Shading** (replaces brown/fresnel look; keeps all plumbing — uniform names, fog,
  `uOpacity` dimming, `uDissolve` discard — unchanged):
  - Albedo: `uBaseColor` → pale cream `#e9dfc8`, uniform.
  - Hemisphere ambient (warm sky above / dim warm ground) + **wrapped half-Lambert key**
    from above-front `normalize(0.12, 0.78, 0.61)` with a warm tint.
  - **Faint damp sheen**: Blinn-Phong, exponent ~8–16, intensity ~0.08.
  - **Cavity AO**: `vCavity` (cleft/notch → deep shadow) × per-pixel groove term (narrow
    dark crevices from the ridge profile) × mild top-down occlusion.
  - Fresnel reduced to a whisper (`power ~5`, additive ≤0.05, near-neutral warm tint).
  - RD mottle multiplier range shrunk to ~±5% (uniform color per the description;
    `TissueScene.tsx` still sets `uRDBlend 0.5` — no scene change needed).
  - **Bloom budget** (depth-0 threshold 0.6, ACES): diffuse envelope keeps the general
    surface ~0.45–0.55 linear luminance; only upper crests + sheen cross ~0.6 → soft
    golden halo on the ropes, no blowout. Tune via screenshots.

### 4. Material — `tissue-shell-material.ts`

- Prepend the new chunk to both stages; update `uBaseColor`/`uFresnelColor` defaults;
  set `precision = 'highp'` via the `shaderMaterial` onInit callback; refresh comments.

### 5. Geometry

- Keep `icosahedronGeometry [12, 6]` (~82k tris, 1 draw call). Escalate to detail 7 only
  if the notch/lobe silhouette shows faceting; check r3f-perf.

## Files

| File | Change |
|---|---|
| `src/shaders/shell-shape.glsl` | NEW — shared baseForm/ridgeField/shellHeight + uTime |
| `src/shaders/noise.glsl` | add `fbm2()` (2-octave) |
| `src/scales/tissue/shaders/tissue-shell.vert.glsl` | new shape map, baseForm-only FD normal, new varyings |
| `src/scales/tissue/shaders/tissue-shell.frag.glsl` | per-pixel ridge normal + AA, cream matte shading, cavity AO |
| `src/scales/tissue/tissue-shell-material.ts` | prepend chunk, new color defaults, highp, comments |
| `PLAN.md` (repo root) | copy of this plan for in-editor audit (user preference) |
| `logs/2026-07-03_shell-rework.md` | session log (project CLAUDE.md requirement) |

Untouched: `TissueScene.tsx`, `breakthrough.ts`, `tissue-preview.tsx`, `post-fx*` —
all existing plumbing (dissolve, dimming, fog, bloom curves) keeps working.

## Execution order

1. Write `PLAN.md` to repo root (this content).
2. `noise.glsl` `fbm2` → new `shell-shape.glsl` → rewrite vert → rewrite frag → material.
3. Typecheck (`npx tsc --noEmit`) — GLSL is runtime-checked, so immediately:
4. **Visual iteration loop** via Playwright against the running dev server
   (`localhost:5173/tissue-preview.html`): screenshot front (`?rx=0&ry=0`),
   three-quarter (`?ry=35`), top-down (`?rx=60`), back (`?ry=180`); compare point-by-point
   against the target description; tune GLSL consts (HMR picks up `?raw` edits); repeat
   until the form/ridges/material all read correctly. This loop is the bulk of the work —
   shader constants never land right first try.
5. Check the interior/pass-through read and dissolve aperture (`uDissolve` sweep or site
   scroll at depth ~0.15–0.2); retune `uDissolveRadius` if the deeper cleft clips it.
6. Gates: `npm run typecheck`, `npm run lint`, `npm test -- --run` (shader-adjacent unit
   tests: breakthrough, post-fx-curves must stay green), `npm run build`.
7. Session log to `logs/`.

## Verification checklist (visual, against the description)

- Silhouette: ~1:1 width:height, domed top, low taper, two bottom lobes + center notch,
  top-of-crown dip where the cleft crosses; no polygonal faceting.
- Cleft: single, deep, straight, darkest feature, continuous top→bottom into the notch.
- Ridges: few dozen fat rounded ropes, locally parallel, arcing, visible branch/merge;
  tighter coils near top, straighter vertical folds lower/outer; grooves read as thin
  shadow lines; crests show broad soft highlights.
- Material: cream, matte, faint sheen only — no metal/gloss, no color mottling.
- No NaN specks/seam flashes at `ry=180` or at the poles; interior pass-through free of
  stripe strobing (fwidth fade working).
- Bloom: soft halo on crests only; r3f-perf frame time ≥ baseline (field is net cheaper).

## Risks / fallbacks

- **Swirl zone at the crown** (stripe convergence + strong warp) may read as chaos rather
  than "small tight coils" — tune warp growth + pole fade cone first; if still messy,
  blend a torsional (rotational) warp around +y instead of raising fbm amplitude.
- **Lobes** may read as separate spheres if `k`/height are off — lower `k` widens the blend.
- **Bloom blowout** on the pale surface — lower the diffuse envelope before touching
  `post-fx-curves.ts` (that file only as last resort; it's unit-tested).
- Detail 6 faceting at the notch — fall back to detail 7 after r3f-perf check.
