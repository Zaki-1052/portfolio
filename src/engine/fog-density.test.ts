// src/engine/fog-density.test.ts
import { describe, it, expect } from 'vitest';
import {
  FOG_DENSITY_BASE,
  FOG_DENSITY_ESTABLISH,
  FOG_DENSITY_INTERIOR,
  FOG_DENSITY_VEIL,
  FOG_INTERIOR_PEAK,
  FOG_INTERIOR_SETTLE,
  FOG_VEIL_CLEAR_END,
  fogDensityFor,
} from './fog-density';
import { BREAKTHROUGH_END } from '@/scales/tissue/breakthrough';

describe('fogDensityFor', () => {
  it('hits the authored densities at every segment joint', () => {
    expect(fogDensityFor(0)).toBeCloseTo(FOG_DENSITY_VEIL, 10);
    expect(fogDensityFor(FOG_VEIL_CLEAR_END)).toBeCloseTo(FOG_DENSITY_ESTABLISH, 10);
    expect(fogDensityFor(BREAKTHROUGH_END)).toBeCloseTo(FOG_DENSITY_BASE, 10);
    expect(fogDensityFor(FOG_INTERIOR_PEAK)).toBeCloseTo(FOG_DENSITY_INTERIOR, 10);
    expect(fogDensityFor(FOG_INTERIOR_SETTLE)).toBeCloseTo(FOG_DENSITY_BASE, 10);
    expect(fogDensityFor(1)).toBeCloseTo(FOG_DENSITY_BASE, 10);
  });

  it('parts the opening veil, builds to the interior peak, then settles back', () => {
    // Reveal: falls from the veil to the establish density.
    let prev = Infinity;
    for (let d = -0.05; d <= FOG_VEIL_CLEAR_END; d += 0.002) {
      const v = fogDensityFor(d);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
    // Build + swell: rises to the interior peak.
    prev = -Infinity;
    for (let d = FOG_VEIL_CLEAR_END; d <= FOG_INTERIOR_PEAK; d += 0.002) {
      const v = fogDensityFor(d);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
    // Settle: falls back to the base and holds.
    prev = Infinity;
    for (let d = FOG_INTERIOR_PEAK; d <= 1.05; d += 0.002) {
      const v = fogDensityFor(d);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
  });

  it('never exceeds the interior density nor drops below the establish density', () => {
    for (let d = -0.05; d <= 1.05; d += 0.005) {
      const v = fogDensityFor(d);
      expect(v).toBeGreaterThanOrEqual(FOG_DENSITY_ESTABLISH - 1e-12);
      expect(v).toBeLessThanOrEqual(FOG_DENSITY_INTERIOR + 1e-12);
    }
  });

  it('respects custom endpoints (dev-panel override path)', () => {
    expect(fogDensityFor(0, 0.05, 0.02, 0.1, 0.09)).toBeCloseTo(0.09, 10);
    expect(fogDensityFor(FOG_VEIL_CLEAR_END, 0.05, 0.02, 0.1, 0.09)).toBeCloseTo(0.05, 10);
    expect(fogDensityFor(BREAKTHROUGH_END, 0.05, 0.02, 0.1, 0.09)).toBeCloseTo(0.02, 10);
    expect(fogDensityFor(FOG_INTERIOR_PEAK, 0.05, 0.02, 0.1, 0.09)).toBeCloseTo(0.1, 10);
    expect(fogDensityFor(1, 0.05, 0.02, 0.1, 0.09)).toBeCloseTo(0.02, 10);
  });
});
