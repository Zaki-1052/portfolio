// src/engine/post-fx-curves.test.ts
import { describe, it, expect } from 'vitest';
import { postFxCurveFor } from './post-fx-curves';

const SAMPLE_DEPTHS = [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1.0];

describe('postFxCurveFor', () => {
  it('is heaviest at tissue with grain matching the CSS token', () => {
    const tissue = postFxCurveFor(0);
    expect(tissue.grainOpacity).toBeCloseTo(0.055, 3);
    expect(tissue.bloomIntensity).toBeGreaterThan(1);
    expect(tissue.bloomThreshold).toBeCloseTo(0.6, 6);
  });

  it('strips grain to zero by the code scale', () => {
    expect(postFxCurveFor(0.67).grainOpacity).toBeCloseTo(0, 6);
    expect(postFxCurveFor(0.83).grainOpacity).toBe(0);
    expect(postFxCurveFor(1).grainOpacity).toBe(0);
  });

  it('decreases bloom/grain/vignette monotonically with depth', () => {
    for (let i = 1; i < SAMPLE_DEPTHS.length; i++) {
      const prev = postFxCurveFor(SAMPLE_DEPTHS[i - 1]!);
      const cur = postFxCurveFor(SAMPLE_DEPTHS[i]!);
      expect(cur.bloomIntensity).toBeLessThanOrEqual(prev.bloomIntensity + 1e-9);
      expect(cur.grainOpacity).toBeLessThanOrEqual(prev.grainOpacity + 1e-9);
      expect(cur.vignetteDarkness).toBeLessThanOrEqual(prev.vignetteDarkness + 1e-9);
    }
  });

  it('raises the bloom threshold toward the cool end (less blooms)', () => {
    expect(postFxCurveFor(1).bloomThreshold).toBeGreaterThan(postFxCurveFor(0).bloomThreshold);
  });

  it('clamps out-of-range depth', () => {
    expect(postFxCurveFor(-1)).toEqual(postFxCurveFor(0));
    expect(postFxCurveFor(2)).toEqual(postFxCurveFor(1));
  });
});
