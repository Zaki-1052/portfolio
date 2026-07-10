// src/engine/post-fx-curves.test.ts
import { describe, it, expect } from 'vitest';
import {
  BLOOM_SWELL_END,
  BLOOM_SWELL_INTENSITY,
  BLOOM_SWELL_PEAK,
  BLOOM_SWELL_START,
  BLOOM_SWELL_THRESHOLD_DIP,
  coilBloomSwellFor,
  postFxCurveFor,
} from './post-fx-curves';

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

describe('coilBloomSwellFor (the hub-dive glow-fill beat)', () => {
  it('is exactly zero outside its window (every other band untouched)', () => {
    for (const d of [0, 0.33, 0.43, BLOOM_SWELL_START, BLOOM_SWELL_END, 0.5, 0.67, 1]) {
      const swell = coilBloomSwellFor(d);
      expect(swell.intensity).toBe(0);
      expect(swell.thresholdDip).toBe(0);
    }
  });

  it('peaks at the hub crossing with the full swell and dip', () => {
    const swell = coilBloomSwellFor(BLOOM_SWELL_PEAK);
    expect(swell.intensity).toBeCloseTo(BLOOM_SWELL_INTENSITY, 9);
    expect(swell.thresholdDip).toBeCloseTo(BLOOM_SWELL_THRESHOLD_DIP, 9);
  });

  it('composes into the curve: more bloom, lower threshold at the fill beat', () => {
    const atPeak = postFxCurveFor(BLOOM_SWELL_PEAK);
    const outside = postFxCurveFor(0.5);
    expect(atPeak.bloomIntensity).toBeGreaterThan(outside.bloomIntensity + 0.3);
    expect(atPeak.bloomThreshold).toBeLessThan(outside.bloomThreshold);
    expect(atPeak.bloomThreshold).toBeGreaterThanOrEqual(0);
  });
});
