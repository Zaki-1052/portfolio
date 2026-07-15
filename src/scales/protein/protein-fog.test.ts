// src/scales/protein/protein-fog.test.ts
// The band-four fog layer is a pure ADDITIVE delta — these tests pin the
// contract: exactly zero outside its window, a moderate sustained plateau
// through the band, a cool-cyan tint, and density windows that never
// overlap the coil's or the code's.
import { describe, expect, it } from 'vitest';
import { fogDensityFor } from '@/engine/fog-density';
import { coilFogDensityDeltaFor } from '@/scales/chromatin/coil-fog';
import { codeFogDensityDeltaFor } from '@/scales/code/code-fog';
import {
  FOG_DENSITY_PROTEIN_SUSTAIN,
  FOG_PROTEIN_GONE,
  FOG_PROTEIN_RISE_START,
  FOG_PROTEIN_TINT_FADE_END,
  proteinFogColorBlendT,
  proteinFogDensityDeltaFor,
} from './protein-fog';

describe('proteinFogDensityDeltaFor', () => {
  it('is exactly zero at and before the rise start (coil band untouched)', () => {
    for (const d of [0, 0.28, 0.43, 0.565, 0.585, FOG_PROTEIN_RISE_START]) {
      expect(proteinFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('is exactly zero from the gone point onward (code scale untouched)', () => {
    for (const d of [FOG_PROTEIN_GONE, 0.75, 0.86, 1]) {
      expect(proteinFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('holds the sustained plateau through the band', () => {
    for (let d = 0.63; d <= 0.675 + 1e-9; d += 0.005) {
      expect(proteinFogDensityDeltaFor(d)).toBeGreaterThanOrEqual(
        FOG_DENSITY_PROTEIN_SUSTAIN - 1e-12,
      );
    }
  });

  it('keeps total density moderate — the structure is clearly visible', () => {
    const d = 0.65;
    const total = fogDensityFor(d) + proteinFogDensityDeltaFor(d);
    expect(total).toBeLessThan(0.02);
    expect(proteinFogDensityDeltaFor(d)).toBeGreaterThan(0.003);
  });

  it('rises monotonically then falls monotonically', () => {
    let prev = 0;
    for (let d = FOG_PROTEIN_RISE_START; d <= 0.62 + 1e-9; d += 0.002) {
      const v = proteinFogDensityDeltaFor(d);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
    prev = proteinFogDensityDeltaFor(0.68);
    for (let d = 0.68; d <= FOG_PROTEIN_GONE + 1e-9; d += 0.002) {
      const v = proteinFogDensityDeltaFor(d);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
  });

  it('never overlaps the coil density window', () => {
    for (let d = 0; d <= 1 + 1e-9; d += 0.001) {
      expect(coilFogDensityDeltaFor(d) * proteinFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('never overlaps the code density window', () => {
    for (let d = 0; d <= 1 + 1e-9; d += 0.001) {
      expect(codeFogDensityDeltaFor(d) * proteinFogDensityDeltaFor(d)).toBe(0);
    }
  });
});

describe('proteinFogColorBlendT', () => {
  it('is zero before the band and after the fade-out', () => {
    for (const d of [
      0,
      0.28,
      0.43,
      0.565,
      FOG_PROTEIN_RISE_START,
      FOG_PROTEIN_TINT_FADE_END,
      0.8,
      1,
    ]) {
      expect(proteinFogColorBlendT(d)).toBe(0);
    }
  });

  it('holds a sustained cool-cyan tint through the band', () => {
    for (const d of [0.63, 0.65, 0.66]) {
      expect(proteinFogColorBlendT(d)).toBeGreaterThan(0.4);
      expect(proteinFogColorBlendT(d)).toBeLessThanOrEqual(0.45);
    }
  });
});
