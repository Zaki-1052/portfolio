// src/engine/pointer-parallax.test.ts
import { describe, it, expect } from 'vitest';
import { createSpring, isSettled, resetSpring, stepSpring } from './pointer-parallax';

describe('pointer-parallax spring', () => {
  it('converges to the target and settles', () => {
    const s = createSpring();
    for (let i = 0; i < 300; i++) stepSpring(s, 0.03, -0.02, 1 / 60);
    expect(s.x).toBeCloseTo(0.03, 6);
    expect(s.y).toBeCloseTo(-0.02, 6);
    expect(isSettled(s, 0.03, -0.02)).toBe(true);
  });

  it('never overshoots from rest (critically damped)', () => {
    const s = createSpring();
    let prev = 0;
    for (let i = 0; i < 300; i++) {
      stepSpring(s, 0.03, 0, 1 / 60);
      expect(s.x).toBeLessThanOrEqual(0.03 + 1e-12);
      expect(s.x).toBeGreaterThanOrEqual(prev - 1e-12); // monotonic approach
      prev = s.x;
    }
  });

  it('is stable under large demand-mode frame gaps', () => {
    const s = createSpring();
    stepSpring(s, 0.03, 0.02, 0.5);
    stepSpring(s, 0.03, 0.02, 2.0);
    expect(Number.isFinite(s.x)).toBe(true);
    expect(Math.abs(s.x)).toBeLessThanOrEqual(0.03 + 1e-9);
    expect(isSettled(s, 0.03, 0.02, 1e-3)).toBe(true); // long dt ≈ fully arrived
  });

  it('dt = 0 is a no-op', () => {
    const s = createSpring();
    stepSpring(s, 0.03, 0.02, 1 / 60);
    const before = { ...s };
    stepSpring(s, 0.03, 0.02, 0);
    expect(s).toEqual(before);
  });

  it('retargeting mid-flight stays finite and converges to the new target', () => {
    const s = createSpring();
    for (let i = 0; i < 20; i++) stepSpring(s, 0.03, 0, 1 / 60);
    for (let i = 0; i < 400; i++) stepSpring(s, -0.01, 0.01, 1 / 60);
    expect(s.x).toBeCloseTo(-0.01, 6);
    expect(s.y).toBeCloseTo(0.01, 6);
  });

  it('resetSpring zeroes state', () => {
    const s = createSpring();
    for (let i = 0; i < 10; i++) stepSpring(s, 0.03, 0.02, 1 / 60);
    resetSpring(s);
    expect(s).toEqual({ x: 0, y: 0, vx: 0, vy: 0 });
  });
});
