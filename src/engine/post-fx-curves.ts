// src/engine/post-fx-curves.ts
// Depth → post-processing intensity curves. Post-processing is heaviest in the
// warm first-scale register (depth 0: strong golden bloom, visible grain + vignette)
// and strips toward digital clarity by the code/expression scales (depth →1).
// Pure and unit-tested; PostFX mutates the live effects from these each frame.
// Phase 4/5 tune this file — never add a second EffectComposer.
import { clamp, lerp } from '@/utils/math';

export interface PostFxCurve {
  bloomIntensity: number; // higher = more glow
  bloomThreshold: number; // luminance threshold; LOWER = more of the frame blooms
  grainOpacity: number; // film-grain (Noise) opacity
  vignetteDarkness: number;
}

/**
 * Sample the post-fx curve at a canonical depth. bloomIntensity, grainOpacity
 * and vignetteDarkness decrease monotonically with depth; bloomThreshold rises
 * (less blooms) toward the cool end. grainOpacity matches the CSS --grain
 * token (~0.055 at depth 0) and reaches 0 by the code scale.
 */
export function postFxCurveFor(depth: number): PostFxCurve {
  const d = clamp(depth, 0, 1);
  const warm = 1 - d; // 1 at depth 0 → 0 at expression
  return {
    // Eased warm falloff so bloom stays lush through the first-scale band.
    bloomIntensity: lerp(0.18, 1.25, warm * warm),
    bloomThreshold: lerp(0.6, 1.0, d),
    // Grain hits 0 by the start of the code scale (depth 0.67).
    grainOpacity: 0.055 * clamp(1 - d / 0.67, 0, 1),
    vignetteDarkness: lerp(0.18, 0.55, warm),
  };
}
