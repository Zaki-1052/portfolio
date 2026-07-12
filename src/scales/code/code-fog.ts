// src/scales/code/code-fog.ts
// Band five's fog layer as a pure ADDITIVE delta over the blessed base curve
// (fog-density.ts is never edited — the arbor-fog/coil-fog contract). The
// code band is the digital-clarity end of the descent (§3.10: zero grain,
// zero vignette, VERY light fog), so unlike the coil there is no spike —
// only a whisper of sustained atmosphere that gives the void a medium for
// the environment grid to recede into, plus a color blend pulling the fog
// toward the terminal's green-leaned dark. Both evaluate to exactly 0
// outside the band — the coil band and the expression scale (the sparsest;
// §4: the fog lifts as the cursor survives) are provably untouched.
// SceneAtmosphere (the sole fog owner) composes them; pure curves only.
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import { smoothstep } from '@/utils/math';

export const FOG_CODE_RISE_START = SCALE_BOUNDARIES[5]; // 0.71 — rises with the window's flight
export const FOG_CODE_RISE_END = 0.735; // settled by the boot beat
export const FOG_CODE_FADE_START = 0.835; // draining as the window dissolves
export const FOG_CODE_GONE = SCALE_BOUNDARIES[6]; // 0.86 — expression starts sparsest
export const FOG_CODE_TINT_RISE_END = 0.74;
export const FOG_CODE_TINT_FADE_START = 0.825;

/** The sustained whisper of medium through the band — light enough that the
 *  window chrome at the 10-unit standoff stays effectively untouched. */
export const FOG_DENSITY_CODE_SUSTAIN = 0.004;

/** Sustained tint strength through the band. */
export const FOG_CODE_TINT_MAX = 0.4;

/** Green-leaned dark the scene fog leans toward while the terminal owns the
 *  band — the phosphor register's void, never a saturated green. */
export const CODE_FOG_TINT = '#1f2b22';

export function codeFogDensityDeltaFor(depth: number): number {
  return (
    FOG_DENSITY_CODE_SUSTAIN *
    smoothstep(FOG_CODE_RISE_START, FOG_CODE_RISE_END, depth) *
    (1 - smoothstep(FOG_CODE_FADE_START, FOG_CODE_GONE, depth))
  );
}

export function codeFogColorBlendT(depth: number): number {
  return (
    FOG_CODE_TINT_MAX *
    smoothstep(FOG_CODE_RISE_START, FOG_CODE_TINT_RISE_END, depth) *
    (1 - smoothstep(FOG_CODE_TINT_FADE_START, FOG_CODE_GONE, depth))
  );
}
