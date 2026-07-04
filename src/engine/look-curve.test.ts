// src/engine/look-curve.test.ts
import { describe, it, expect } from 'vitest';
import { LOOK_CRISP, LOOK_ESTABLISH, LOOK_FADE_START, lookFor } from './look-curve';
import { BREAKTHROUGH_START } from '@/scales/tissue/breakthrough';

describe('lookFor', () => {
  it('holds the establish look through the far beats', () => {
    expect(lookFor(0)).toBeCloseTo(LOOK_ESTABLISH, 10);
    expect(lookFor(LOOK_FADE_START)).toBeCloseTo(LOOK_ESTABLISH, 10);
  });

  it('reaches the crisp look by the hover and holds it after', () => {
    expect(lookFor(BREAKTHROUGH_START)).toBeCloseTo(LOOK_CRISP, 10);
    expect(lookFor(0.5)).toBeCloseTo(LOOK_CRISP, 10);
    expect(lookFor(1)).toBeCloseTo(LOOK_CRISP, 10);
  });

  it('is monotonically non-increasing in depth', () => {
    let prev = Infinity;
    for (let d = -0.05; d <= 1.05; d += 0.005) {
      const v = lookFor(d);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
  });

  it('respects custom endpoints (dev-panel override path)', () => {
    expect(lookFor(0, 0.9, 0.1)).toBeCloseTo(0.9, 10);
    expect(lookFor(1, 0.9, 0.1)).toBeCloseTo(0.1, 10);
  });
});
