// src/engine/look-curve.ts
// Depth → the shell's uLook dial (0 = crisp matte sculpture, 1 = soft dreamy
// bloom-glow). The establish/approach beats read veiled and golden — most of
// the warm-lit surface crosses the bloom threshold — then the look sharpens
// into the crack-hover so close detail stays crisp through the plunge and the
// interior transit. Pure — unit-tested in isolation; SurfaceScene drives the
// material from this each frame (the stalk companion mirrors it).
import { BREAKTHROUGH_START } from '@/scales/tissue/breakthrough';
import { lerp, smoothstep } from '@/utils/math';

export const LOOK_ESTABLISH = 0.7;
export const LOOK_CRISP = 0.25;
// Hold the full dreamy register through the far beats, then sharpen across the
// closing approach so the hover arrives crisp.
export const LOOK_FADE_START = 0.06;

export function lookFor(depth: number, establish = LOOK_ESTABLISH, crisp = LOOK_CRISP): number {
  return lerp(establish, crisp, smoothstep(LOOK_FADE_START, BREAKTHROUGH_START, depth));
}
