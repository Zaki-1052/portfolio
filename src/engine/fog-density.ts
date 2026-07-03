// src/engine/fog-density.ts
// Depth-driven scene fog density. The establish shot views the form from
// ~120 world units, so the veil there comes from distance × density — the
// density itself must sit LOW or the form fogs out entirely; it then rises
// toward the site-wide base as the camera closes in (close range is barely
// affected by density, so the arrival stays crisp) and holds that base for
// the interior and every deeper scale. Pure — unit-tested in isolation.
import { BREAKTHROUGH_END } from '@/scales/tissue/breakthrough';
import { lerp, smoothstep } from '@/utils/math';

export const FOG_DENSITY_ESTABLISH = 0.006;
export const FOG_DENSITY_BASE = 0.014;

export function fogDensityFor(depth: number): number {
  return lerp(FOG_DENSITY_ESTABLISH, FOG_DENSITY_BASE, smoothstep(0, BREAKTHROUGH_END, depth));
}
