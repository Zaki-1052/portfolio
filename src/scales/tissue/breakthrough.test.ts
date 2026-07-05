// src/scales/tissue/breakthrough.test.ts
import { describe, it, expect } from 'vitest';
import {
  BREAKTHROUGH_START,
  BREAKTHROUGH_END,
  INTERIOR_EXIT_START,
  INTERIOR_EXIT_END,
  PLUNGE_APERTURE_DIR,
  breakthroughProgress,
  dissolveAmountFor,
  fogBlendT,
  interiorExitFade,
} from './breakthrough';

describe('breakthroughProgress', () => {
  it('is 0 before the window and 1 after', () => {
    expect(breakthroughProgress(BREAKTHROUGH_START - 0.05)).toBe(0);
    expect(breakthroughProgress(BREAKTHROUGH_START)).toBe(0);
    expect(breakthroughProgress(BREAKTHROUGH_END)).toBe(1);
    expect(breakthroughProgress(BREAKTHROUGH_END + 0.05)).toBe(1);
  });
  it('rises linearly across the window', () => {
    const mid = (BREAKTHROUGH_START + BREAKTHROUGH_END) / 2;
    expect(breakthroughProgress(mid)).toBeCloseTo(0.5, 10);
  });
});

describe('dissolveAmountFor', () => {
  it('smoothsteps across the window under full motion', () => {
    expect(dissolveAmountFor(BREAKTHROUGH_START, false)).toBe(0);
    expect(dissolveAmountFor(BREAKTHROUGH_END, false)).toBe(1);
    const mid = (BREAKTHROUGH_START + BREAKTHROUGH_END) / 2;
    expect(dissolveAmountFor(mid, false)).toBeCloseTo(0.5, 10);
  });

  it('is a hard step at the midpoint under reduced motion', () => {
    const mid = (BREAKTHROUGH_START + BREAKTHROUGH_END) / 2;
    expect(dissolveAmountFor(mid - 0.001, true)).toBe(0);
    expect(dissolveAmountFor(mid, true)).toBe(1);
    expect(dissolveAmountFor(BREAKTHROUGH_END, true)).toBe(1);
  });
});

describe('fogBlendT', () => {
  it('runs 0 → 1 across the window', () => {
    expect(fogBlendT(BREAKTHROUGH_START - 0.05)).toBe(0);
    expect(fogBlendT(BREAKTHROUGH_END + 0.05)).toBe(1);
  });
});

describe('PLUNGE_APERTURE_DIR', () => {
  it('is a unit vector facing the crown (the camera plunges from above)', () => {
    const len = Math.hypot(...PLUNGE_APERTURE_DIR);
    expect(len).toBeCloseTo(1, 10);
    expect(PLUNGE_APERTURE_DIR[1]).toBeGreaterThan(0.6);
  });
});

describe('interiorExitFade', () => {
  it('holds the interior fully present through the first content beat', () => {
    expect(interiorExitFade(BREAKTHROUGH_END)).toBe(1);
    expect(interiorExitFade(INTERIOR_EXIT_START)).toBe(1);
  });

  it('has the walls fully receded before the scene-manager unmount at 0.34', () => {
    expect(INTERIOR_EXIT_END).toBeLessThan(0.34);
    expect(interiorExitFade(INTERIOR_EXIT_END)).toBe(0);
    expect(interiorExitFade(0.4)).toBe(0);
  });

  it('is monotonically non-increasing across the exit window', () => {
    let prev = 1;
    for (let d = INTERIOR_EXIT_START; d <= INTERIOR_EXIT_END + 1e-9; d += 0.002) {
      const v = interiorExitFade(d);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
  });
});
