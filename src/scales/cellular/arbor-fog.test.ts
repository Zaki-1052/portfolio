// src/scales/cellular/arbor-fog.test.ts
// The band-two fog layer is a pure ADDITIVE delta over band one's blessed
// curve — these tests pin the contract that makes it safe: exactly zero
// outside its window (band one and the deeper scales are provably
// byte-identical), a rose mist peak the tree resolves out of, and a
// sustained rose tint through the index beat.
import { describe, expect, it } from 'vitest';
import { FOG_DENSITY_BASE, fogDensityFor } from '@/engine/fog-density';
import {
  FOG_ARBOR_CLEAR,
  FOG_ARBOR_PEAK,
  FOG_ARBOR_RISE_START,
  arborFogColorBlendT,
  arborFogDensityDeltaFor,
} from './arbor-fog';

describe('arborFogDensityDeltaFor', () => {
  it('is exactly zero at and before the rise start (band one untouched)', () => {
    for (const d of [0, 0.14, 0.231, 0.28, FOG_ARBOR_RISE_START]) {
      expect(arborFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('is exactly zero from the clear point onward (deeper scales untouched)', () => {
    for (const d of [FOG_ARBOR_CLEAR, 0.5, 0.7, 1]) {
      expect(arborFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('peaks at the mist beat with a total density well under the interior swell', () => {
    const total = fogDensityFor(FOG_ARBOR_PEAK) + arborFogDensityDeltaFor(FOG_ARBOR_PEAK);
    expect(arborFogDensityDeltaFor(FOG_ARBOR_PEAK)).toBeGreaterThan(0.01);
    expect(total).toBeGreaterThan(FOG_DENSITY_BASE);
    expect(total).toBeLessThan(0.06);
  });

  it('rises monotonically into the peak and falls monotonically out of it', () => {
    let prev = 0;
    for (let d = FOG_ARBOR_RISE_START; d <= FOG_ARBOR_PEAK + 1e-9; d += 0.005) {
      const v = arborFogDensityDeltaFor(d);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
    for (let d = FOG_ARBOR_PEAK; d <= FOG_ARBOR_CLEAR + 1e-9; d += 0.005) {
      const v = arborFogDensityDeltaFor(d);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
  });
});

describe('arborFogColorBlendT', () => {
  it('is zero before the band handoff and after the fade-out', () => {
    for (const d of [0, 0.28, FOG_ARBOR_RISE_START, 0.48, 1]) {
      expect(arborFogColorBlendT(d)).toBe(0);
    }
  });

  it('holds a sustained rose tint through the index beat', () => {
    for (const d of [0.35, 0.38, 0.41]) {
      expect(arborFogColorBlendT(d)).toBeGreaterThan(0.5);
      expect(arborFogColorBlendT(d)).toBeLessThanOrEqual(0.7);
    }
  });
});
