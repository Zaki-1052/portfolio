// src/scales/tissue/breakthrough.ts
// Pure ramps for the shell-breakthrough beat that straddles the first→second
// scale boundary (0.17). The shell shader's dissolve, the particle burst, and the
// warm→magenta fog push all read from these so the whole sequence is a
// deterministic function of scroll depth (scrubs cleanly in both directions).
import { clamp, smoothstep } from '@/utils/math';

// Window straddling the canonical 0.17 boundary — a distinct cinematic beat,
// long enough (~0.04 of depth) to register at typical scroll speed.
export const BREAKTHROUGH_START = 0.15;
export const BREAKTHROUGH_END = 0.19;
const BREAKTHROUGH_MID = (BREAKTHROUGH_START + BREAKTHROUGH_END) / 2;

/** Linear 0..1 progress across the breakthrough window (clamped outside it). */
export function breakthroughProgress(depth: number): number {
  return clamp((depth - BREAKTHROUGH_START) / (BREAKTHROUGH_END - BREAKTHROUGH_START), 0, 1);
}

/**
 * Shell dissolve amount (0 solid → 1 fully open). Smoothstep-eased normally; a
 * hard step at the window midpoint under reduced motion (instant cut, no
 * gradual dissolve animation).
 */
export function dissolveAmountFor(depth: number, reduced: boolean): number {
  if (reduced) return depth >= BREAKTHROUGH_MID ? 1 : 0;
  return smoothstep(BREAKTHROUGH_START, BREAKTHROUGH_END, depth);
}

/** 0..1 blend from the first scale's fog color toward the magenta (second scale) anchor. */
export function fogBlendT(depth: number): number {
  return smoothstep(BREAKTHROUGH_START, BREAKTHROUGH_END, depth);
}
