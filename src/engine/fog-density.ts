// src/engine/fog-density.ts
// Depth-driven scene fog density. The establish shot views the form from
// ~120 world units, so the veil there comes from distance × density — the
// density itself must sit LOW or the form fogs out entirely; it then rises
// toward the site-wide base as the camera closes in (close range is barely
// affected by density, so the arrival stays crisp). Past the breakthrough the
// interior transit swells WELL past the base — interior distances are 5–25 u,
// where the base density reads as no fog at all — and settles back just inside
// the next band so the following scale's establish stays clean.
// Pure — unit-tested in isolation.
import { BREAKTHROUGH_END } from '@/scales/tissue/breakthrough';
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import { lerp, smoothstep } from '@/utils/math';

export const FOG_DENSITY_VEIL = 0.011;
export const FOG_DENSITY_ESTABLISH = 0.006;
export const FOG_DENSITY_BASE = 0.014;
export const FOG_DENSITY_INTERIOR = 0.06;

// The opening beat: the page lands with the form shrouded in dense haze, and
// the first stretch of scroll parts the veil (the reveal).
export const FOG_VEIL_CLEAR_END = 0.06;
// The interior haze peaks at the first band's end and drains back to the site
// base across the start of the next band.
export const FOG_INTERIOR_PEAK = SCALE_BOUNDARIES[2];
export const FOG_INTERIOR_SETTLE = SCALE_BOUNDARIES[2] + 0.03;

// `veil` trails the older endpoints only to keep existing call sites stable —
// chronologically it is the FIRST segment of the curve.
export function fogDensityFor(
  depth: number,
  establish = FOG_DENSITY_ESTABLISH,
  base = FOG_DENSITY_BASE,
  interior = FOG_DENSITY_INTERIOR,
  veil = FOG_DENSITY_VEIL,
): number {
  // Opening reveal: dense veil parting to the thin establish density…
  const reveal = lerp(veil, establish, smoothstep(0, FOG_VEIL_CLEAR_END, depth));
  // …building back to the site base as the camera closes in (close range is
  // barely affected, so the arrival stays crisp)…
  const build = (base - establish) * smoothstep(FOG_VEIL_CLEAR_END, BREAKTHROUGH_END, depth);
  // …then the interior swell: rises past the base across the transit, peaks at
  // the band boundary, settles back. Every smoothstep has zero end-slope, so
  // the whole curve stays C1 at every joint.
  const swell =
    smoothstep(BREAKTHROUGH_END, FOG_INTERIOR_PEAK, depth) *
    (1 - smoothstep(FOG_INTERIOR_PEAK, FOG_INTERIOR_SETTLE, depth));
  return reveal + build + (interior - base) * swell;
}
