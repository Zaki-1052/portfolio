// src/scales/tissue/breakthrough.ts
// Pure ramps for the shell-breakthrough beat: the plunge through the form's
// surface that ends the approach band and lands inside, where the first
// content scale lives. The shell shader's dissolve, the particle burst, and
// the fog push toward the warm interior all read from these so the whole
// sequence is a deterministic function of scroll depth (scrubs cleanly in
// both directions).
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import { CAMERA_KEYFRAMES, sampleCamera, type Vec3 } from '@/engine/camera-keyframes';
import { clamp, smoothstep } from '@/utils/math';

// The plunge lives inside the tissue band, DERIVED from the canonical table:
// the hero plays with the form still outside; by the hero's CENTER the camera
// hovers vertically over the central groove and the dissolve STARTS fading
// the cap open — still outside, watching it open beneath — then the descent
// carries through and lands inside by roughly two-thirds of the band, just
// before the next scale takes over.
const TISSUE_BAND = SCALE_BOUNDARIES[2] - SCALE_BOUNDARIES[1];
export const BREAKTHROUGH_START = SCALE_BOUNDARIES[1] + 0.25 * TISSUE_BAND;
export const BREAKTHROUGH_END = SCALE_BOUNDARIES[1] + 0.65 * TISSUE_BAND;
const BREAKTHROUGH_MID = (BREAKTHROUGH_START + BREAKTHROUGH_END) / 2;

/** Linear 0..1 progress across the breakthrough window (clamped outside it). */
export function breakthroughProgress(depth: number): number {
  return clamp((depth - BREAKTHROUGH_START) / (BREAKTHROUGH_END - BREAKTHROUGH_START), 0, 1);
}

/**
 * The direction (from the form's center) the dissolve aperture opens toward —
 * DERIVED from where the camera actually sits as the plunge begins, so the
 * hole always faces the incoming flight path instead of a hardcoded axis.
 */
export const PLUNGE_APERTURE_DIR: Vec3 = (() => {
  const p = sampleCamera(BREAKTHROUGH_START, CAMERA_KEYFRAMES).position;
  const len = Math.hypot(p[0], p[1], p[2]) || 1;
  return [p[0] / len, p[1] / len, p[2] / len];
})();

/**
 * Shell dissolve amount (0 solid → 1 fully open). Smoothstep-eased normally; a
 * hard step at the window midpoint under reduced motion (instant cut, no
 * gradual dissolve animation).
 */
export function dissolveAmountFor(depth: number, reduced: boolean): number {
  if (reduced) return depth >= BREAKTHROUGH_MID ? 1 : 0;
  return smoothstep(BREAKTHROUGH_START, BREAKTHROUGH_END, depth);
}

/** 0..1 blend from the exterior fog color toward the warm-interior anchor. */
export function fogBlendT(depth: number): number {
  return smoothstep(BREAKTHROUGH_START, BREAKTHROUGH_END, depth);
}

// The interior's exit beat: after the first content scale, the shell's walls
// recede INTO the next band's mist (uOpacity dims fully toward fog) so the
// scene-manager unmount at start+MOUNT_MARGIN is invisible — no pop, the
// walls simply dissolve as the arbor resolves. Derived from the band
// boundary like everything else here.
export const INTERIOR_EXIT_START = SCALE_BOUNDARIES[2] + 0.02; // 0.30
export const INTERIOR_EXIT_END = SCALE_BOUNDARIES[2] + 0.055; // 0.335 — before the 0.34 unmount

/** 1 while the interior is present → 0 once the walls have fully receded. */
export function interiorExitFade(depth: number): number {
  return 1 - smoothstep(INTERIOR_EXIT_START, INTERIOR_EXIT_END, depth);
}
