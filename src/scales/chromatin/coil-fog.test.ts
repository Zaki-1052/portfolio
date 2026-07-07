// src/scales/chromatin/coil-fog.test.ts
// The band-three fog layer is a pure ADDITIVE delta over the blessed base
// curve — these tests pin the contract that makes it safe: exactly zero
// outside its window (the arbor band and the deeper scales are provably
// byte-identical), a materialization haze the cluster resolves out of, a
// sustained blue-slate tint through the band, and density windows that never
// overlap the arbor's.
import { describe, expect, it } from 'vitest';
import { FOG_DENSITY_BASE, fogDensityFor } from '@/engine/fog-density';
import { arborFogDensityDeltaFor } from '@/scales/cellular/arbor-fog';
import {
  FOG_COIL_CLEAR,
  FOG_COIL_PEAK,
  FOG_COIL_RISE_START,
  FOG_COIL_TINT_FADE_END,
  coilFogColorBlendT,
  coilFogDensityDeltaFor,
} from './coil-fog';

describe('coilFogDensityDeltaFor', () => {
  it('is exactly zero at and before the rise start (arbor band untouched)', () => {
    for (const d of [0, 0.28, 0.335, 0.41, FOG_COIL_RISE_START]) {
      expect(coilFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('is exactly zero from the clear point onward (deeper scales untouched)', () => {
    for (const d of [FOG_COIL_CLEAR, 0.57, 0.7, 1]) {
      expect(coilFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('peaks at the haze beat with a total density well under the interior swell', () => {
    const total = fogDensityFor(FOG_COIL_PEAK) + coilFogDensityDeltaFor(FOG_COIL_PEAK);
    expect(coilFogDensityDeltaFor(FOG_COIL_PEAK)).toBeGreaterThan(0.01);
    expect(total).toBeGreaterThan(FOG_DENSITY_BASE);
    expect(total).toBeLessThan(0.06);
  });

  it('rises monotonically into the peak and falls monotonically out of it', () => {
    let prev = 0;
    for (let d = FOG_COIL_RISE_START; d <= FOG_COIL_PEAK + 1e-9; d += 0.005) {
      const v = coilFogDensityDeltaFor(d);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
    for (let d = FOG_COIL_PEAK; d <= FOG_COIL_CLEAR + 1e-9; d += 0.005) {
      const v = coilFogDensityDeltaFor(d);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
  });

  it('never overlaps the arbor density window (at most one delta active anywhere)', () => {
    for (let d = 0; d <= 1 + 1e-9; d += 0.001) {
      expect(arborFogDensityDeltaFor(d) * coilFogDensityDeltaFor(d)).toBe(0);
    }
  });
});

describe('coilFogColorBlendT', () => {
  it('is zero before the band handoff and after the fade-out', () => {
    for (const d of [0, 0.28, 0.41, FOG_COIL_RISE_START, FOG_COIL_TINT_FADE_END, 0.7, 1]) {
      expect(coilFogColorBlendT(d)).toBe(0);
    }
  });

  it('holds a sustained blue-slate tint through the band', () => {
    for (const d of [0.46, 0.5, 0.54]) {
      expect(coilFogColorBlendT(d)).toBeGreaterThan(0.4);
      expect(coilFogColorBlendT(d)).toBeLessThanOrEqual(0.5);
    }
  });
});
