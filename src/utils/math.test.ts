// src/utils/math.test.ts
import { describe, it, expect } from 'vitest';
import { lerp, clamp, remap, smoothstep } from './math';

describe('lerp', () => {
  it('interpolates endpoints and midpoint', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
  it('extrapolates for t outside [0,1]', () => {
    expect(lerp(0, 10, 2)).toBe(20);
    expect(lerp(0, 10, -1)).toBe(-10);
  });
});

describe('clamp', () => {
  it('bounds into [min,max]', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('remap', () => {
  it('maps across ranges linearly', () => {
    expect(remap(5, 0, 10, 0, 100)).toBe(50);
    expect(remap(0, 0, 10, 20, 40)).toBe(20);
    expect(remap(10, 0, 10, 20, 40)).toBe(40);
  });
  it('returns outMin on a degenerate input range', () => {
    expect(remap(5, 3, 3, 7, 9)).toBe(7);
  });
});

describe('smoothstep', () => {
  it('clamps below/above the edges', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });
  it('is 0.5 at the midpoint and eased', () => {
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 10);
    expect(smoothstep(0, 1, 0.25)).toBeCloseTo(0.15625, 10);
  });
  it('handles a degenerate edge pair as a hard step', () => {
    expect(smoothstep(1, 1, 0.5)).toBe(0);
    expect(smoothstep(1, 1, 1)).toBe(1);
  });
});
