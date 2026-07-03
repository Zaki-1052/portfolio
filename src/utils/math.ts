// src/utils/math.ts
// Dependency-free scalar helpers shared by the 3D layer (camera sampling,
// post-fx curves, breakthrough ramps). Kept separate from scale-manager's
// clamp01 so this stays the foundation layer with zero imports.

/** Linear interpolation. t is not clamped. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp x into [min, max]. */
export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

/**
 * Map x from [inMin, inMax] onto [outMin, outMax] linearly. Not clamped
 * (callers clamp the input range where they need it). Degenerate input range
 * returns outMin.
 */
export function remap(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin;
  return outMin + ((x - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** GLSL-style smoothstep: 0 below edge0, 1 above edge1, cubic ease between. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
