// src/scales/expression/signal-pulse.ts
// Time-driven progress math for the expression band's EVENT clock: the mail
// submit spark and the closing movement's final pulse, each a single bright
// packet traveling the email line after a wall-clock stamp (two-clock rule —
// responses to events run on real time, never scroll). Deterministic
// snapshots of (stamp, now); the rendering layer stays a dumb projector of
// the value (the terminal-output.ts precedent). Pure — unit-tested in
// isolation.
import { clamp } from '@/utils/math';

/**
 * Progress (0..1) of an event pulse fired at `firedAtMs`, sampled at `nowMs`,
 * traveling for `durationMs`. 0 while unfired (null stamp) or before the
 * stamp; saturates at 1 once arrived. durationMs ≤ 0 is the reduced-motion
 * instant path (the pulse lands immediately).
 */
export function eventPulseProgress(
  firedAtMs: number | null,
  nowMs: number,
  durationMs: number,
): number {
  if (firedAtMs === null) return 0;
  const elapsed = nowMs - firedAtMs;
  if (elapsed < 0) return 0;
  if (durationMs <= 0) return 1;
  return clamp(elapsed / durationMs, 0, 1);
}
