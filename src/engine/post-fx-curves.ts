// src/engine/post-fx-curves.ts
// Depth → post-processing intensity curves. Post-processing is heaviest in the
// warm first-scale register (depth 0: strong golden bloom, visible grain + vignette)
// and strips toward digital clarity by the code/expression scales (depth →1).
// Pure and unit-tested; PostFX mutates the live effects from these each frame.
// Phase 4/5 tune this file — never add a second EffectComposer.
import { clamp, lerp, smoothstep } from '@/utils/math';

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
  const swell = coilBloomSwellFor(d);
  return {
    // Eased warm falloff so bloom stays lush through the first-scale band;
    // the hub-dive swell rides on top through its own window.
    bloomIntensity: lerp(0.18, 1.25, warm * warm) + swell.intensity,
    bloomThreshold: Math.max(0, lerp(0.6, 1.0, d) - swell.thresholdDip),
    // Grain drains to 0 at depth 0.67 — fully clear just before the code
    // band begins at 0.71 (SCALE_BOUNDARIES[5]).
    grainOpacity: 0.055 * clamp(1 - d / 0.67, 0, 1),
    vignetteDarkness: lerp(0.18, 0.55, warm),
  };
}

// The 5.6 hub-dive glow-fill beat: a transient bloom swell centered on the
// camera's pass through the tree's glowing hub (keyframe crossing ≈ 0.458).
// Exactly zero outside its window, so every other band's grade is provably
// untouched. ACES's shoulder soft-clips the peak — the swell reads as the
// frame filling with light, not clipping to white.
export const BLOOM_SWELL_START = 0.446;
export const BLOOM_SWELL_PEAK = 0.458;
export const BLOOM_SWELL_END = 0.472;
export const BLOOM_SWELL_INTENSITY = 0.5;
export const BLOOM_SWELL_THRESHOLD_DIP = 0.15;

export interface CoilBloomSwell {
  intensity: number; // added to the curve's bloomIntensity
  thresholdDip: number; // subtracted from the curve's bloomThreshold
}

export function coilBloomSwellFor(depth: number): CoilBloomSwell {
  const envelope =
    smoothstep(BLOOM_SWELL_START, BLOOM_SWELL_PEAK, depth) *
    (1 - smoothstep(BLOOM_SWELL_PEAK, BLOOM_SWELL_END, depth));
  return {
    intensity: BLOOM_SWELL_INTENSITY * envelope,
    thresholdDip: BLOOM_SWELL_THRESHOLD_DIP * envelope,
  };
}
