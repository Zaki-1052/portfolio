// src/scales/chromatin/coil-fog.ts
// Band three's fog layer as a pure ADDITIVE delta over the blessed base curve
// (fog-density.ts is never edited — same contract as arbor-fog.ts). Two
// exports:
//   · a density delta — the materialization haze that thickens right at the
//     band handoff (the arbor dissolves INTO it, the cluster resolves OUT of
//     it) and clears as the orbital sweep settles;
//   · a color blend toward the band's blue-slate fog anchor. Its real work is
//     the 0.42–0.47 crossover, pulling the fog onto the home-base register
//     while the arbor's navy fades and the theme is still blending; sustained
//     through the band, gone before the next scale.
// Both evaluate to exactly 0 outside their windows — the arbor band and the
// deeper scales are provably untouched. SceneAtmosphere (the sole fog owner)
// composes them; this module exports pure curves only.
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import { smoothstep } from '@/utils/math';

export const FOG_COIL_RISE_START = SCALE_BOUNDARIES[3] - 0.01; // 0.42
export const FOG_COIL_PEAK = 0.44; // first beads glimmer in the haze
export const FOG_COIL_CLEAR = 0.5; // clear as the cluster stands resolved
export const FOG_COIL_TINT_RISE_END = 0.445;
export const FOG_COIL_TINT_FADE_START = 0.55;
export const FOG_COIL_TINT_FADE_END = 0.58;

/** Added to fogDensityFor's base 0.014 → ~0.028 total at the haze peak —
 *  a shade lighter than the arbor's mist: the descent is thinning out. */
export const FOG_DENSITY_COIL_PEAK_DELTA = 0.014;

/** Sustained tint strength through the band. */
export const FOG_COIL_TINT_MAX = 0.5;

/** Blue-slate anchor the scene fog leans toward while the coil owns the
 *  band — the home-base register's quiet equilibrium. */
export const COIL_FOG_TINT = '#2b3038';

export function coilFogDensityDeltaFor(depth: number): number {
  return (
    FOG_DENSITY_COIL_PEAK_DELTA *
    smoothstep(FOG_COIL_RISE_START, FOG_COIL_PEAK, depth) *
    (1 - smoothstep(FOG_COIL_PEAK, FOG_COIL_CLEAR, depth))
  );
}

export function coilFogColorBlendT(depth: number): number {
  return (
    FOG_COIL_TINT_MAX *
    smoothstep(FOG_COIL_RISE_START, FOG_COIL_TINT_RISE_END, depth) *
    (1 - smoothstep(FOG_COIL_TINT_FADE_START, FOG_COIL_TINT_FADE_END, depth))
  );
}
