// src/engine/fog-density.test.ts
import { describe, it, expect } from 'vitest';
import { FOG_DENSITY_BASE, FOG_DENSITY_ESTABLISH, fogDensityFor } from './fog-density';
import { BREAKTHROUGH_END } from '@/scales/tissue/breakthrough';

describe('fogDensityFor', () => {
  it('starts at the establish density and settles at the base', () => {
    expect(fogDensityFor(0)).toBeCloseTo(FOG_DENSITY_ESTABLISH, 10);
    expect(fogDensityFor(BREAKTHROUGH_END)).toBeCloseTo(FOG_DENSITY_BASE, 10);
    expect(fogDensityFor(1)).toBeCloseTo(FOG_DENSITY_BASE, 10);
  });

  it('is monotonically non-decreasing in depth', () => {
    let prev = -Infinity;
    for (let d = -0.05; d <= 1.05; d += 0.005) {
      const v = fogDensityFor(d);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
