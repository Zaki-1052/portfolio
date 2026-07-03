// src/scales/tissue/breakthrough.test.ts
import { describe, it, expect } from 'vitest';
import {
  BREAKTHROUGH_START,
  BREAKTHROUGH_END,
  PLUNGE_APERTURE_DIR,
  breakthroughProgress,
  dissolveAmountFor,
  fogBlendT,
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
