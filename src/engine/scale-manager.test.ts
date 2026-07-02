// src/engine/scale-manager.test.ts
import { describe, it, expect } from 'vitest';
import {
  SCALES,
  SCALE_BOUNDARIES,
  TRANSITION_ZONE,
  scaleFromDepth,
  scaleProgressFor,
  blendZoneFor,
  nextTransitionState,
  rawProgressToDepth,
  depthToRawProgress,
  hashForScale,
  scaleFromHash,
  type TransitionState,
} from './scale-manager';

describe('scaleFromDepth', () => {
  it('maps extremes and interior points to the owning scale', () => {
    expect(scaleFromDepth(0)).toBe('tissue');
    expect(scaleFromDepth(0.169)).toBe('tissue');
    expect(scaleFromDepth(0.17)).toBe('cellular');
    expect(scaleFromDepth(0.32)).toBe('cellular');
    expect(scaleFromDepth(0.33)).toBe('chromatin');
    expect(scaleFromDepth(0.5)).toBe('protein');
    expect(scaleFromDepth(0.67)).toBe('code');
    expect(scaleFromDepth(0.83)).toBe('expression');
    expect(scaleFromDepth(1)).toBe('expression');
  });

  it('is defensive against out-of-range input', () => {
    expect(scaleFromDepth(-0.5)).toBe('tissue');
    expect(scaleFromDepth(1.5)).toBe('expression');
  });
});

describe('scaleProgressFor', () => {
  it('is 0 at band start and 1 at band end', () => {
    expect(scaleProgressFor(0.17, 'cellular')).toBeCloseTo(0, 10);
    expect(scaleProgressFor(0.33, 'cellular')).toBeCloseTo(1, 10);
    expect(scaleProgressFor(0.25, 'cellular')).toBeCloseTo((0.25 - 0.17) / (0.33 - 0.17), 10);
  });

  it('clamps outside the queried band', () => {
    expect(scaleProgressFor(0.0, 'cellular')).toBe(0);
    expect(scaleProgressFor(0.9, 'cellular')).toBe(1);
  });
});

describe('blendZoneFor', () => {
  it('is inactive (from === to) away from internal boundaries and at the ends', () => {
    for (const d of [0, 0.08, 0.25, 0.6, 1]) {
      const z = blendZoneFor(d);
      expect(z.from).toBe(z.to);
    }
  });

  it('is active at every internal boundary with t ~= 0.5', () => {
    for (let i = 1; i < SCALE_BOUNDARIES.length - 1; i++) {
      const b = SCALE_BOUNDARIES[i]!;
      const z = blendZoneFor(b);
      expect(z.from).toBe(SCALES[i - 1]);
      expect(z.to).toBe(SCALES[i]);
      expect(z.t).toBeCloseTo(0.5, 10);
    }
  });

  it('ramps t from 0 to 1 across the zone and is inactive just outside it', () => {
    const half = TRANSITION_ZONE / 2;
    const lo = blendZoneFor(0.17 - half);
    const hi = blendZoneFor(0.17 + half);
    expect(lo.from).toBe('tissue');
    expect(lo.t).toBeCloseTo(0, 10);
    expect(hi.to).toBe('cellular');
    expect(hi.t).toBeCloseTo(1, 10);
    expect(blendZoneFor(0.17 - half - 0.001).from).toBe(blendZoneFor(0.17 - half - 0.001).to);
    expect(blendZoneFor(0.17 + half + 0.001).from).toBe(blendZoneFor(0.17 + half + 0.001).to);
  });
});

describe('nextTransitionState', () => {
  it('flips currentScale at the boundary and clears previousScale once settled', () => {
    let state: TransitionState = {
      currentScale: 'tissue',
      previousScale: null,
      isTransitioning: false,
      scaleProgress: 0,
    };

    state = nextTransitionState(state, 0.16);
    expect(state.currentScale).toBe('tissue');
    expect(state.previousScale).toBeNull();

    state = nextTransitionState(state, 0.17);
    expect(state.currentScale).toBe('cellular');
    expect(state.previousScale).toBe('tissue');
    expect(state.isTransitioning).toBe(true);

    state = nextTransitionState(state, 0.18);
    expect(state.currentScale).toBe('cellular');
    expect(state.previousScale).toBe('tissue'); // still inside the zone
    expect(state.isTransitioning).toBe(true);

    state = nextTransitionState(state, 0.3);
    expect(state.currentScale).toBe('cellular');
    expect(state.previousScale).toBeNull(); // zone settled
    expect(state.isTransitioning).toBe(false);
  });
});

describe('rawProgressToDepth / depthToRawProgress', () => {
  const uneven = [0, 0.08, 0.35, 0.5, 0.62, 0.9, 1] as const;

  it('maps canonical anchors exactly from measured raw boundaries', () => {
    for (let i = 0; i < SCALE_BOUNDARIES.length; i++) {
      expect(rawProgressToDepth(uneven[i]!, uneven)).toBeCloseTo(SCALE_BOUNDARIES[i]!, 10);
    }
  });

  it('round-trips depth -> raw -> depth on an uneven layout', () => {
    for (const x of [0, 0.05, 0.17, 0.29, 0.5, 0.71, 0.83, 0.95, 1]) {
      const raw = depthToRawProgress(x, uneven);
      expect(rawProgressToDepth(raw, uneven)).toBeCloseTo(x, 10);
    }
  });

  it('round-trips raw -> depth -> raw on an uneven layout', () => {
    for (const r of [0, 0.08, 0.2, 0.35, 0.5, 0.75, 0.9, 1]) {
      const depth = rawProgressToDepth(r, uneven);
      expect(depthToRawProgress(depth, uneven)).toBeCloseTo(r, 10);
    }
  });

  it('collapses to the identity mapping when sections are equal-height', () => {
    for (const x of [0, 0.1, 0.17, 0.33, 0.5, 0.67, 0.83, 1]) {
      expect(rawProgressToDepth(x, SCALE_BOUNDARIES)).toBeCloseTo(x, 10);
      expect(depthToRawProgress(x, SCALE_BOUNDARIES)).toBeCloseTo(x, 10);
    }
  });

  it('clamps out-of-range input', () => {
    expect(rawProgressToDepth(-1, uneven)).toBe(0);
    expect(rawProgressToDepth(2, uneven)).toBe(1);
  });
});

describe('hashForScale / scaleFromHash', () => {
  it('round-trips every scale', () => {
    for (const s of SCALES) {
      expect(scaleFromHash(hashForScale(s))).toBe(s);
    }
  });

  it('returns null for unknown or empty hashes', () => {
    expect(scaleFromHash('#nonsense')).toBeNull();
    expect(scaleFromHash('')).toBeNull();
    expect(scaleFromHash('#')).toBeNull();
    expect(scaleFromHash('tissue')).toBe('tissue'); // tolerant of a missing leading '#'
  });
});
