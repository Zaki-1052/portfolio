// src/scales/expression/expression-fog.test.ts
// The last band's fog layer is the descent's one NEGATIVE delta — a relief
// that thins the flat base curve toward the sparsest, most open frame of the
// site. These tests pin the contract: exactly zero below the band (the code
// band provably untouched), monotonically deepening relief that never breaks
// the positive-density floor, and the product-is-zero non-overlap idiom
// against every other band's delta.
import { describe, expect, it } from 'vitest';
import { fogDensityFor } from '@/engine/fog-density';
import { arborFogDensityDeltaFor } from '@/scales/cellular/arbor-fog';
import { coilFogDensityDeltaFor } from '@/scales/chromatin/coil-fog';
import { codeFogDensityDeltaFor } from '@/scales/code/code-fog';
import {
  FOG_DENSITY_EXPRESSION_RELIEF,
  FOG_EXPRESSION_RELIEF_SETTLE,
  FOG_EXPRESSION_RELIEF_START,
  FOG_EXPRESSION_WARM_START,
  expressionFogColorBlendT,
  expressionFogDensityDeltaFor,
} from './expression-fog';

describe('expressionFogDensityDeltaFor', () => {
  it('is exactly zero at and before the band boundary (code untouched)', () => {
    for (const d of [0, 0.43, 0.71, 0.78, 0.85, FOG_EXPRESSION_RELIEF_START]) {
      expect(expressionFogDensityDeltaFor(d)).toBe(0);
    }
  });

  it('is a relief — never positive anywhere', () => {
    for (let d = 0; d <= 1 + 1e-9; d += 0.001) {
      expect(expressionFogDensityDeltaFor(d)).toBeLessThanOrEqual(0);
    }
  });

  it('deepens monotonically to the full relief and holds it to the floor', () => {
    let prev = 0;
    for (let d = FOG_EXPRESSION_RELIEF_START; d <= 1 + 1e-9; d += 0.001) {
      const v = expressionFogDensityDeltaFor(d);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
    expect(expressionFogDensityDeltaFor(FOG_EXPRESSION_RELIEF_SETTLE)).toBeCloseTo(
      FOG_DENSITY_EXPRESSION_RELIEF,
      12,
    );
    expect(expressionFogDensityDeltaFor(1)).toBeCloseTo(FOG_DENSITY_EXPRESSION_RELIEF, 12);
  });

  it('never drives the composed density non-positive (a whisper of medium remains)', () => {
    for (let d = FOG_EXPRESSION_RELIEF_START; d <= 1 + 1e-9; d += 0.005) {
      expect(fogDensityFor(d) + expressionFogDensityDeltaFor(d)).toBeGreaterThan(0.004);
    }
  });

  it("never overlaps any other band's density window (product-is-zero everywhere)", () => {
    // Math.abs: +0 × negative = -0, and toBe is Object.is-strict — the
    // invariant is |product| === 0, not its sign.
    for (let d = 0; d <= 1 + 1e-9; d += 0.001) {
      expect(Math.abs(codeFogDensityDeltaFor(d) * expressionFogDensityDeltaFor(d))).toBe(0);
      expect(Math.abs(coilFogDensityDeltaFor(d) * expressionFogDensityDeltaFor(d))).toBe(0);
      expect(Math.abs(arborFogDensityDeltaFor(d) * expressionFogDensityDeltaFor(d))).toBe(0);
    }
  });
});

describe('expressionFogColorBlendT', () => {
  it('is zero before the warm bookend and peaks exactly at the floor', () => {
    for (const d of [0, 0.86, 0.9, FOG_EXPRESSION_WARM_START]) {
      expect(expressionFogColorBlendT(d)).toBe(0);
    }
    expect(expressionFogColorBlendT(1)).toBeCloseTo(0.3, 12);
  });
});
