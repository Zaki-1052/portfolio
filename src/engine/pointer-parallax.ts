// src/engine/pointer-parallax.ts
// Critically-damped 2D spring for the pointer-parallax camera drift. Pure
// math, no three import — camera-controller applies the spring's angles as a
// ROTATION-ONLY post-multiply (never a positional offset: the finale beat
// skims the ridge field with zero clearance). The closed-form update is exact
// for any dt, so demand-mode frame gaps can never make it overshoot or blow
// up; critically damped from rest means it approaches the target without
// oscillating, and the settle test lets the controller stop invalidating once
// the drift has come to rest.

export interface ParallaxSpring {
  x: number; // yaw angle (rad)
  y: number; // pitch angle (rad)
  vx: number;
  vy: number;
}

export const PARALLAX_MAX_YAW = 0.03; // rad ≈ 1.7°
export const PARALLAX_MAX_PITCH = 0.022; // rad ≈ 1.3°
export const PARALLAX_OMEGA = 5; // spring frequency: unhurried, weighty drift
export const PARALLAX_EPS = 1e-4; // settle threshold (rad / rad·s⁻¹)

export function createSpring(): ParallaxSpring {
  return { x: 0, y: 0, vx: 0, vy: 0 };
}

/**
 * Advance the spring toward (tx, ty) by dt seconds — exact critically-damped
 * closed form: x(t) = target + (d₀ + (v₀ + ωd₀)t)·e^(−ωt). Mutates in place
 * (called per frame; no allocation).
 */
export function stepSpring(
  s: ParallaxSpring,
  tx: number,
  ty: number,
  dt: number,
  omega = PARALLAX_OMEGA,
): void {
  const e = Math.exp(-omega * dt);

  const dx = s.x - tx;
  const cx = s.vx + omega * dx;
  s.x = tx + (dx + cx * dt) * e;
  s.vx = (s.vx - omega * cx * dt) * e;

  const dy = s.y - ty;
  const cy = s.vy + omega * dy;
  s.y = ty + (dy + cy * dt) * e;
  s.vy = (s.vy - omega * cy * dt) * e;
}

/** True when the spring has effectively come to rest on its target. */
export function isSettled(s: ParallaxSpring, tx: number, ty: number, eps = PARALLAX_EPS): boolean {
  return (
    Math.abs(s.x - tx) < eps &&
    Math.abs(s.y - ty) < eps &&
    Math.abs(s.vx) < eps &&
    Math.abs(s.vy) < eps
  );
}

/** Hard reset (reduced motion / intro): zero drift, zero velocity. */
export function resetSpring(s: ParallaxSpring): void {
  s.x = 0;
  s.y = 0;
  s.vx = 0;
  s.vy = 0;
}
