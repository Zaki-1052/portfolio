// src/scales/chromatin/coil-fog.test.ts
// The band-three fog layer is a pure ADDITIVE delta over the blessed base
// curve — these tests pin the contract that makes it safe: exactly zero
// outside its window (the arbor band and the deeper scales are provably
// byte-identical), the hub-dive spike peaking at the crossing, a sustained
// water-medium plateau through the band, a deep-teal tint, and density
// windows that never overlap the arbor's.
import { describe, expect, it } from 'vitest';
import { FOG_DENSITY_BASE, fogDensityFor } from '@/engine/fog-density';
import { arborFogDensityDeltaFor } from '@/scales/cellular/arbor-fog';
import {
  FOG_COIL_GONE,
  FOG_COIL_PEAK,
  FOG_COIL_RISE_START,
  FOG_COIL_TINT_FADE_END,
  FOG_DENSITY_COIL_SUSTAIN,
  coilFogColorBlendT,
  coilFogDensityDeltaFor,
} from './coil-fog';

describe('coilFogDensityDeltaFor', () => {
  it('is exactly zero at and before the rise start (arbor band untouched)', () => {
    for (const d of [0, 0.28, 0.335, 0.41, 0.42, FOG_COIL_RISE_START]) {
      expect(coilFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('is exactly zero from the gone point onward (deeper scales untouched)', () => {
    for (const d of [FOG_COIL_GONE, 0.6, 0.7, 1]) {
      expect(coilFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('spikes at the hub crossing with a total density well under the interior swell', () => {
    const total = fogDensityFor(FOG_COIL_PEAK) + coilFogDensityDeltaFor(FOG_COIL_PEAK);
    expect(coilFogDensityDeltaFor(FOG_COIL_PEAK)).toBeGreaterThan(0.015);
    expect(total).toBeGreaterThan(FOG_DENSITY_BASE);
    expect(total).toBeLessThan(0.06);
  });

  it('holds the sustained water plateau through the band', () => {
    for (let d = 0.47; d <= 0.545 + 1e-9; d += 0.005) {
      expect(coilFogDensityDeltaFor(d)).toBeGreaterThanOrEqual(FOG_DENSITY_COIL_SUSTAIN - 1e-12);
    }
  });

  it('rises monotonically into the peak and never rises again past the sustain rise', () => {
    let prev = 0;
    for (let d = FOG_COIL_RISE_START; d <= FOG_COIL_PEAK + 1e-9; d += 0.002) {
      const v = coilFogDensityDeltaFor(d);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
    // Past both rise windows the sum only drains: spike falls, plateau
    // holds, then everything fades to zero by the gone point.
    prev = coilFogDensityDeltaFor(0.472);
    for (let d = 0.472; d <= FOG_COIL_GONE + 1e-9; d += 0.002) {
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

  it('holds a sustained deep-teal tint through the band', () => {
    for (const d of [0.46, 0.5, 0.54]) {
      expect(coilFogColorBlendT(d)).toBeGreaterThan(0.45);
      expect(coilFogColorBlendT(d)).toBeLessThanOrEqual(0.55);
    }
  });
});
