# 2026-07-14 — Protein Stage A: Loader, params, fog, store, scene registration

## What was done

- Wrote `src/utils/protein-loader.ts` — fetch + decode binary trajectory data
  (protein-meta.json + gq/gi .bin files), typed interfaces mirroring the JSON,
  `decodeTrajectory` / `frameSlice` (zero-copy subarray views), `loadProteinData`
- Wrote `src/scales/protein/protein-params.ts` — PROTEIN_ORIGIN `[-4, -28, -42]`,
  cross-section profiles (helix/sheet/coil per §6.2), reveal envelope, RMSF range,
  breathing amplitude, uniform interface + writer stub
- Wrote `src/scales/protein/protein-fog.ts` — additive density delta (0.0035 sustain)
  + cool-cyan tint (#1e3038, 0.45 max) for [0.59, 0.71), non-overlapping with coil
  (gone 0.585) and code (starts 0.71)
- Wrote `src/stores/protein-focus.ts` — Zustand store: activeSystem (gq/gi),
  toggleBlend (clamped [0,1]), focusedAnnotation, shouldReleaseProteinFocus
- Created `src/scales/protein/ProteinScene.tsx` — placeholder `<group />`
  with acquireAmbientRendering
- Registered protein in `scene-manager.tsx`: SCENE_REGISTRY + SCENE_KEYS ('receptor')
- Composed protein fog into `scene-atmosphere.tsx` between coil and code
- Added 3 camera knots at depths 0.59, 0.64, 0.69 (PLACEHOLDER, reduced anchor at 0.59)
- Updated CSS: theme tokens rose → cyan, WebGL reveal selectors, protein-doc yield rule,
  scroll runways (120vh + 150vh)
- Reshaped ProteinContent.tsx: hideBadge, .protein-doc wrapper, runways

## Decisions made

- **CSS theme**: updated protein accent from rose (`--aod-rose`) to cyan (`--aod-cyan`)
  to match design spec's cool-cyan register — user confirmed
- **Fog timing**: protein rises at 0.59 (after coil gone at 0.585), sustains 0.0035
  (lighter than coil's 0.006), fades by 0.71 (code boundary)
- **Camera knots**: 3 placeholder knots continuing the descent line from coil settle
  through code arrival; all PLACEHOLDER for dev-panel tuning
- **Scene key**: 'receptor' (naming by primary subject, matching shell/arbor/coil)
- **PROTEIN_ORIGIN**: [-4, -28, -42], interpolating the descent line

## Open items

- Session 4 (Stage B.1: ribbon geometry + materials + static render) is next
- Camera knot positions are PLACEHOLDER — need dev-panel tuning
- Runway heights (120vh + 150vh) are PLACEHOLDER — need camera timing alignment
- No blockers — all pure-logic modules tested

## Key file paths

**New (8):**
- `src/utils/protein-loader.ts` + `.test.ts`
- `src/scales/protein/protein-params.ts`
- `src/scales/protein/protein-fog.ts` + `.test.ts`
- `src/stores/protein-focus.ts` + `.test.ts`
- `src/scales/protein/ProteinScene.tsx`

**Modified (6):**
- `src/engine/scene-manager.tsx`
- `src/engine/scene-atmosphere.tsx`
- `src/engine/camera-keyframes.ts` + `.test.ts`
- `src/styles/globals.css`
- `src/scales/protein/ProteinContent.tsx`
