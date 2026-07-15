// src/scales/protein/protein-fog.ts
// Band four's fog layer as a pure ADDITIVE delta over the blessed base curve
// (fog-density.ts is never edited — same contract as coil-fog.ts / code-fog.ts).
// Two exports:
//   · a density delta: a moderate sustained plateau through the band — the
//     structure should be clearly visible, not fighting through haze (§9.6);
//   · a color blend toward the band's cool-cyan anchor. Its real work is the
//     0.585–0.62 crossover, pulling the fog off the coil's deep teal and
//     into the cooler, sharper protein register.
// Both evaluate to exactly 0 outside their windows — the coil band and the
// code scale are provably untouched. SceneAtmosphere (the sole fog owner)
// composes them; this module exports pure curves only.
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import { smoothstep } from '@/utils/math';

export const FOG_PROTEIN_RISE_START = 0.59;
export const FOG_PROTEIN_RISE_END = 0.62;
export const FOG_PROTEIN_FADE_START = 0.68;
export const FOG_PROTEIN_GONE = SCALE_BOUNDARIES[5]; // 0.71
export const FOG_PROTEIN_TINT_RISE_END = 0.62;
export const FOG_PROTEIN_TINT_FADE_START = 0.67;
export const FOG_PROTEIN_TINT_FADE_END = 0.71;

export const FOG_DENSITY_PROTEIN_SUSTAIN = 0.0035;

export const FOG_PROTEIN_TINT_MAX = 0.45;

export const PROTEIN_FOG_TINT = '#1e3038';

export function proteinFogDensityDeltaFor(depth: number): number {
  return (
    FOG_DENSITY_PROTEIN_SUSTAIN *
    smoothstep(FOG_PROTEIN_RISE_START, FOG_PROTEIN_RISE_END, depth) *
    (1 - smoothstep(FOG_PROTEIN_FADE_START, FOG_PROTEIN_GONE, depth))
  );
}

export function proteinFogColorBlendT(depth: number): number {
  return (
    FOG_PROTEIN_TINT_MAX *
    smoothstep(FOG_PROTEIN_RISE_START, FOG_PROTEIN_TINT_RISE_END, depth) *
    (1 - smoothstep(FOG_PROTEIN_TINT_FADE_START, FOG_PROTEIN_TINT_FADE_END, depth))
  );
}
