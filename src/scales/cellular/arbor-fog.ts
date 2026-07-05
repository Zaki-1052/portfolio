// src/scales/cellular/arbor-fog.ts
// Band two's fog layer as a pure ADDITIVE delta over band one's blessed curve
// (fog-density.ts is never edited — the breakthrough.ts precedent for owning
// a transitional blend in the module that needs it). Two exports:
//   · a density delta — a mist that peaks just after the band handoff
//     (the structure resolves OUT of it) and clears across the orbital sweep;
//   · a color blend toward the band's navy fog anchor, sustained through the
//     index beat, gone before the next scale.
// Both evaluate to exactly 0 outside [rise, fade] — band one and the deeper
// scales are provably untouched. SceneAtmosphere (the sole fog owner)
// composes them; this module exports pure curves only.
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import { smoothstep } from '@/utils/math';

export const FOG_ARBOR_RISE_START = SCALE_BOUNDARIES[2] + 0.02; // 0.30
export const FOG_ARBOR_PEAK = 0.335; // the resolve-out-of-mist beat
export const FOG_ARBOR_CLEAR = 0.395; // clear by the front curl of the sweep
export const FOG_ARBOR_FADE_START = SCALE_BOUNDARIES[3]; // 0.43
export const FOG_ARBOR_FADE_END = 0.47;

/** Added to fogDensityFor's base 0.014 → ~0.03 total at the mist peak. */
export const FOG_DENSITY_ARBOR_PEAK_DELTA = 0.016;

/** Sustained tint strength through the index beat. */
export const FOG_ARBOR_ROSE_MAX = 0.65;

/** Deep navy the scene fog leans toward while the arbor owns the band —
 *  the fluorescence register's dark-field backdrop. */
export const ARBOR_FOG_TINT = '#232c40';

export function arborFogDensityDeltaFor(depth: number): number {
  return (
    FOG_DENSITY_ARBOR_PEAK_DELTA *
    smoothstep(FOG_ARBOR_RISE_START, FOG_ARBOR_PEAK, depth) *
    (1 - smoothstep(FOG_ARBOR_PEAK, FOG_ARBOR_CLEAR, depth))
  );
}

export function arborFogColorBlendT(depth: number): number {
  return (
    FOG_ARBOR_ROSE_MAX *
    smoothstep(FOG_ARBOR_RISE_START, 0.345, depth) *
    (1 - smoothstep(FOG_ARBOR_FADE_START, FOG_ARBOR_FADE_END, depth))
  );
}
