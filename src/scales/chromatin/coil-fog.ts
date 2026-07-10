// src/scales/chromatin/coil-fog.ts
// Band three's fog layer as a pure ADDITIVE delta over the blessed base curve
// (fog-density.ts is never edited — same contract as arbor-fog.ts). Two
// exports:
//   · a density delta with two terms (5.6): the hub-dive SPIKE that peaks
//     exactly at the camera's pass through the glowing hub (the fill beat's
//     haze — the arbor dissolves INTO it, the coil resolves OUT of it), and
//     a SUSTAINED plateau that holds through the band — the underwater
//     medium the cluster hangs inside — gone before the next scale;
//   · a color blend toward the band's deep-teal water anchor. Its real work
//     is the 0.43–0.455 crossover, pulling the fog off the arbor's navy and
//     into the water register while the theme is still blending.
// Both evaluate to exactly 0 outside their windows — the arbor band and the
// deeper scales are provably untouched. SceneAtmosphere (the sole fog owner)
// composes them; this module exports pure curves only.
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import { smoothstep } from '@/utils/math';

export const FOG_COIL_RISE_START = SCALE_BOUNDARIES[3]; // 0.43 — the hold ends, the push begins
export const FOG_COIL_PEAK = 0.458; // the hub-shell crossing — the fill beat's core
export const FOG_COIL_CLEAR = 0.52; // the spike drains as the spool stands resolved
export const FOG_COIL_SUSTAIN_RISE_START = 0.44;
export const FOG_COIL_SUSTAIN_RISE_END = 0.47;
export const FOG_COIL_SUSTAIN_FADE_START = 0.55;
export const FOG_COIL_GONE = 0.585; // all coil fog provably zero from here
export const FOG_COIL_TINT_RISE_END = 0.455;
export const FOG_COIL_TINT_FADE_START = 0.55;
export const FOG_COIL_TINT_FADE_END = 0.58;

/** Spike added to fogDensityFor's base at the hub crossing — thick enough
 *  that the glow-fill frame is pure light-in-haze. */
export const FOG_DENSITY_COIL_PEAK_DELTA = 0.02;

/** The sustained water-medium plateau held through the band. */
export const FOG_DENSITY_COIL_SUSTAIN = 0.006;

/** Sustained tint strength through the band. */
export const FOG_COIL_TINT_MAX = 0.55;

/** Deep-teal water anchor the scene fog leans toward while the coil owns
 *  the band — the 5.6 underwater register. */
export const COIL_FOG_TINT = '#20343a';

export function coilFogDensityDeltaFor(depth: number): number {
  const spike =
    FOG_DENSITY_COIL_PEAK_DELTA *
    smoothstep(FOG_COIL_RISE_START, FOG_COIL_PEAK, depth) *
    (1 - smoothstep(FOG_COIL_PEAK, FOG_COIL_CLEAR, depth));
  const sustain =
    FOG_DENSITY_COIL_SUSTAIN *
    smoothstep(FOG_COIL_SUSTAIN_RISE_START, FOG_COIL_SUSTAIN_RISE_END, depth) *
    (1 - smoothstep(FOG_COIL_SUSTAIN_FADE_START, FOG_COIL_GONE, depth));
  return spike + sustain;
}

export function coilFogColorBlendT(depth: number): number {
  return (
    FOG_COIL_TINT_MAX *
    smoothstep(FOG_COIL_RISE_START, FOG_COIL_TINT_RISE_END, depth) *
    (1 - smoothstep(FOG_COIL_TINT_FADE_START, FOG_COIL_TINT_FADE_END, depth))
  );
}
