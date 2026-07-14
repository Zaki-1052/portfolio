// src/scales/expression/expression-beats.test.ts
// The expression band's beat math is the scroll clock's source of truth for
// the whole closing movement — these tests pin the contracts the scene
// depends on: strictly ordered beat depths, a scrub that is monotonic,
// saturating, and a pure function of depth (backspacing on rewind), an
// annotations envelope that NEVER fades (last scale — the contact channels
// stay reachable at the floor), and bookend/wind-down envelopes with exact
// endpoints.
import { describe, expect, it } from 'vitest';
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import {
  ANNOTATIONS_REVEAL_SPAN,
  EXPRESSION_BEAT_DEFAULTS,
  annotationsEnvelope,
  expressionBeatFor,
  introRevealT,
  liveExpressionBeatParams,
  scanlineOpacityFor,
  signoffCharsTyped,
  warmBookendT,
  windDownT,
} from './expression-beats';

const P = EXPRESSION_BEAT_DEFAULTS;
const SIGNOFF = '% lorem ipsum dolor sit amet_';

describe('EXPRESSION_BEAT_DEFAULTS', () => {
  it('orders every depth threshold strictly within the band', () => {
    const depths = [
      SCALE_BOUNDARIES[6],
      P.introStart,
      P.introEnd,
      P.windDownStart,
      P.lastPulseAt,
      P.signoffEnd,
      1,
    ];
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i]!).toBeGreaterThan(depths[i - 1]!);
    }
    // Coincident-by-design pairs sit exactly on their partners.
    expect(P.annotationsReveal).toBe(P.introEnd);
    expect(P.warmStart).toBe(P.windDownStart);
    expect(P.signoffStart).toBe(P.lastPulseAt);
    expect(P.surfaceRevealAt).toBeGreaterThan(P.signoffStart);
    expect(P.surfaceRevealAt).toBeLessThan(P.signoffEnd);
    expect(P.garnishMinDepth).toBeGreaterThanOrEqual(P.signoffEnd);
  });

  it('is frozen, with a distinct live working copy that starts equal', () => {
    expect(Object.isFrozen(EXPRESSION_BEAT_DEFAULTS)).toBe(true);
    expect(liveExpressionBeatParams).not.toBe(EXPRESSION_BEAT_DEFAULTS);
    expect(liveExpressionBeatParams).toEqual(EXPRESSION_BEAT_DEFAULTS);
  });
});

describe('expressionBeatFor', () => {
  it('classifies every threshold onto the correct side', () => {
    expect(expressionBeatFor(SCALE_BOUNDARIES[6] - 1e-9)).toBe('before');
    expect(expressionBeatFor(SCALE_BOUNDARIES[6])).toBe('arrival');
    expect(expressionBeatFor(P.annotationsReveal - 1e-9)).toBe('arrival');
    expect(expressionBeatFor(P.annotationsReveal)).toBe('plateau');
    expect(expressionBeatFor(P.windDownStart - 1e-9)).toBe('plateau');
    expect(expressionBeatFor(P.windDownStart)).toBe('windDown');
    expect(expressionBeatFor(P.signoffStart - 1e-9)).toBe('windDown');
    expect(expressionBeatFor(P.signoffStart)).toBe('signoff');
    expect(expressionBeatFor(1)).toBe('signoff');
  });
});

describe('introRevealT', () => {
  it('is zero outside its window and full inside it', () => {
    expect(introRevealT(P.introStart)).toBe(0);
    expect(introRevealT(P.introEnd)).toBe(0);
    expect(introRevealT((P.introStart + P.introEnd) / 2)).toBe(1);
  });
});

describe('annotationsEnvelope', () => {
  it('rises at the reveal threshold and NEVER fades — the last scale', () => {
    expect(annotationsEnvelope(P.annotationsReveal)).toBe(0);
    expect(annotationsEnvelope(P.annotationsReveal + ANNOTATIONS_REVEAL_SPAN)).toBe(1);
    for (let d = P.annotationsReveal + ANNOTATIONS_REVEAL_SPAN; d <= 1 + 1e-9; d += 0.002) {
      expect(annotationsEnvelope(d)).toBe(1);
    }
  });
});

describe('signoffCharsTyped', () => {
  it('is zero before the window and the full line at its end', () => {
    expect(signoffCharsTyped(P.signoffStart, SIGNOFF)).toBe(0);
    expect(signoffCharsTyped(P.signoffEnd, SIGNOFF)).toBe(SIGNOFF.length);
    expect(signoffCharsTyped(1, SIGNOFF)).toBe(SIGNOFF.length);
  });

  it('completes with a breath to spare (the terminal scrub precedent)', () => {
    const nearEnd = P.signoffStart + (P.signoffEnd - P.signoffStart) * 0.92;
    expect(signoffCharsTyped(nearEnd, SIGNOFF)).toBe(SIGNOFF.length);
  });

  it('is monotonic, saturating, and reversible (a pure function of depth)', () => {
    let prev = 0;
    const depths: number[] = [];
    const seen: number[] = [];
    for (let d = P.signoffStart - 0.002; d <= 1 + 1e-9; d += 0.0002) {
      const chars = signoffCharsTyped(d, SIGNOFF);
      expect(chars).toBeGreaterThanOrEqual(prev);
      expect(chars).toBeLessThanOrEqual(SIGNOFF.length);
      prev = chars;
      depths.push(d);
      seen.push(chars);
    }
    // Sweep the SAME depths backward and assert byte-identical output — no
    // hidden state (re-deriving d from start + i·step would drift off the
    // accumulated float sum and test the wrong depths).
    for (let i = depths.length - 1; i >= 0; i--) {
      expect(signoffCharsTyped(depths[i]!, SIGNOFF)).toBe(seen[i]);
    }
  });
});

describe('windDownT / warmBookendT', () => {
  it('hold exact endpoints: zero through the plateau, one at the floor', () => {
    expect(windDownT(P.windDownStart)).toBe(0);
    expect(windDownT(1)).toBe(1);
    expect(warmBookendT(P.warmStart)).toBe(0);
    expect(warmBookendT(1)).toBe(1);
    expect(warmBookendT(0.9)).toBe(0);
  });

  it('rise monotonically', () => {
    let prevWind = 0;
    let prevWarm = 0;
    for (let d = P.windDownStart; d <= 1 + 1e-9; d += 0.001) {
      const w = windDownT(d);
      const b = warmBookendT(d);
      expect(w).toBeGreaterThanOrEqual(prevWind - 1e-12);
      expect(b).toBeGreaterThanOrEqual(prevWarm - 1e-12);
      prevWind = w;
      prevWarm = b;
    }
  });
});

describe('scanlineOpacityFor', () => {
  it('is zero at the band edge, full max just inside, and holds to the floor', () => {
    expect(scanlineOpacityFor(SCALE_BOUNDARIES[6], 0.04)).toBe(0);
    expect(scanlineOpacityFor(0.88, 0.04)).toBeCloseTo(0.04, 12);
    expect(scanlineOpacityFor(1, 0.04)).toBeCloseTo(0.04, 12);
    expect(scanlineOpacityFor(0.5, 0.04)).toBe(0);
  });
});
