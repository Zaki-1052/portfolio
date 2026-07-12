// src/scales/code/code-fog.test.ts
// The band-five fog layer is a pure ADDITIVE delta over the blessed base
// curve — these tests pin the contract that makes it safe: exactly zero
// outside its window (the coil band and the expression scale are provably
// byte-identical), a sustained whisper (never a spike — this is the
// digital-clarity end of the descent), a green-leaned tint, and density
// windows that never overlap the coil's or the arbor's.
import { describe, expect, it } from 'vitest';
import { fogDensityFor } from '@/engine/fog-density';
import { arborFogDensityDeltaFor } from '@/scales/cellular/arbor-fog';
import { coilFogDensityDeltaFor } from '@/scales/chromatin/coil-fog';
import {
  FOG_CODE_GONE,
  FOG_CODE_RISE_END,
  FOG_CODE_RISE_START,
  FOG_DENSITY_CODE_SUSTAIN,
  codeFogColorBlendT,
  codeFogDensityDeltaFor,
} from './code-fog';

describe('codeFogDensityDeltaFor', () => {
  it('is exactly zero at and before the rise start (every shallower band untouched)', () => {
    for (const d of [0, 0.43, 0.585, 0.6, 0.7, FOG_CODE_RISE_START]) {
      expect(codeFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('is exactly zero from the gone point onward (expression starts sparsest)', () => {
    for (const d of [FOG_CODE_GONE, 0.9, 1]) {
      expect(codeFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('holds the sustained whisper through the plateau', () => {
    for (let d = 0.74; d <= 0.83 + 1e-9; d += 0.005) {
      expect(codeFogDensityDeltaFor(d)).toBeGreaterThanOrEqual(FOG_DENSITY_CODE_SUSTAIN - 1e-12);
    }
  });

  it('keeps the band digitally clear — a whisper, never a swell', () => {
    const total = fogDensityFor(0.78) + codeFogDensityDeltaFor(0.78);
    expect(codeFogDensityDeltaFor(0.78)).toBeGreaterThan(0.002);
    expect(total).toBeLessThan(0.02);
  });

  it('rises monotonically with the flight and never rises again after the plateau', () => {
    let prev = 0;
    for (let d = FOG_CODE_RISE_START; d <= FOG_CODE_RISE_END + 1e-9; d += 0.001) {
      const v = codeFogDensityDeltaFor(d);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
    prev = codeFogDensityDeltaFor(0.75);
    for (let d = 0.75; d <= FOG_CODE_GONE + 1e-9; d += 0.001) {
      const v = codeFogDensityDeltaFor(d);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
  });

  it('never overlaps the coil or arbor density windows (at most one delta active anywhere)', () => {
    for (let d = 0; d <= 1 + 1e-9; d += 0.001) {
      expect(coilFogDensityDeltaFor(d) * codeFogDensityDeltaFor(d)).toBe(0);
      expect(arborFogDensityDeltaFor(d) * codeFogDensityDeltaFor(d)).toBe(0);
    }
  });
});

describe('codeFogColorBlendT', () => {
  it('is zero before the band and from the gone point onward', () => {
    for (const d of [0, 0.43, 0.6, 0.7, FOG_CODE_RISE_START, FOG_CODE_GONE, 0.9, 1]) {
      expect(codeFogColorBlendT(d)).toBe(0);
    }
  });

  it('holds a sustained green-leaned tint through the band', () => {
    for (const d of [0.75, 0.78, 0.81]) {
      expect(codeFogColorBlendT(d)).toBeGreaterThan(0.3);
      expect(codeFogColorBlendT(d)).toBeLessThanOrEqual(0.4);
    }
  });
});
