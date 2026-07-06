// src/scales/tissue/flag-flight.test.ts
import { describe, it, expect } from 'vitest';
import {
  FLAG_FLIGHT_DEFAULT,
  FLAG_FLIGHT_TOPDOWN,
  TISSUE_END,
  crossedLaunch,
  leftRearmZone,
  flightEase,
  flightOpacity,
  sampleFlightPath,
  type Vec3,
} from './flag-flight';

describe('crossedLaunch', () => {
  const L = 0.15;
  it('fires only on an upward (scroll-down) crossing of launchDepth', () => {
    expect(crossedLaunch(0.1, 0.2, L)).toBe(true); // crossed downward-scrolling
    expect(crossedLaunch(0.1, 0.15, L)).toBe(true); // lands exactly on it
    expect(crossedLaunch(0.1, 0.14, L)).toBe(false); // not yet reached
    expect(crossedLaunch(0.16, 0.2, L)).toBe(false); // already past
  });
  it('does not fire when scrolling back up through the hero', () => {
    expect(crossedLaunch(0.2, 0.1, L)).toBe(false);
    expect(crossedLaunch(0.15, 0.1, L)).toBe(false);
  });
});

describe('leftRearmZone', () => {
  it('re-arms above the hero (back toward the approach)', () => {
    // launchDepth 0.15, rearmMargin 0.05 → below 0.10 re-arms
    expect(leftRearmZone(0.05, FLAG_FLIGHT_TOPDOWN)).toBe(true);
    expect(leftRearmZone(0.12, FLAG_FLIGHT_TOPDOWN)).toBe(false);
  });
  it('re-arms below the hero (past the tissue band)', () => {
    expect(leftRearmZone(TISSUE_END, FLAG_FLIGHT_TOPDOWN)).toBe(true);
    expect(leftRearmZone(TISSUE_END + 0.05, FLAG_FLIGHT_TOPDOWN)).toBe(true);
  });
  it('stays armed-consumed while inside the hero neighborhood', () => {
    expect(leftRearmZone(0.15, FLAG_FLIGHT_TOPDOWN)).toBe(false);
    expect(leftRearmZone(0.2, FLAG_FLIGHT_TOPDOWN)).toBe(false);
  });
});

describe('flightEase', () => {
  it('pins endpoints and is symmetric at the midpoint', () => {
    expect(flightEase(0)).toBe(0);
    expect(flightEase(1)).toBe(1);
    expect(flightEase(0.5)).toBeCloseTo(0.5, 10);
  });
  it('clamps outside [0,1]', () => {
    expect(flightEase(-1)).toBe(0);
    expect(flightEase(2)).toBe(1);
  });
});

describe('flightOpacity', () => {
  const { fadeInEnd, fadeOutStart } = FLAG_FLIGHT_DEFAULT;
  it('starts and ends at zero', () => {
    expect(flightOpacity(0, fadeInEnd, fadeOutStart)).toBe(0);
    expect(flightOpacity(1, fadeInEnd, fadeOutStart)).toBe(0);
  });
  it('is fully opaque across the middle', () => {
    expect(flightOpacity(0.5, fadeInEnd, fadeOutStart)).toBeCloseTo(1, 10);
  });
  it('never exceeds [0,1]', () => {
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const o = flightOpacity(t, fadeInEnd, fadeOutStart);
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThanOrEqual(1);
    }
  });
});

describe('sampleFlightPath', () => {
  const pts: Vec3[] = [
    [10, 0, 0],
    [5, 6, -3],
    [0, 1, -5],
  ];
  it('hits the entry at t=0 and the exit at t=1 exactly', () => {
    const a = sampleFlightPath(pts, 0);
    const b = sampleFlightPath(pts, 1);
    expect(a[0]).toBeCloseTo(10, 10);
    expect(a[1]).toBeCloseTo(0, 10);
    expect(a[2]).toBeCloseTo(0, 10);
    expect(b[0]).toBeCloseTo(0, 10);
    expect(b[1]).toBeCloseTo(1, 10);
    expect(b[2]).toBeCloseTo(-5, 10);
  });
  it('passes through interior control points', () => {
    const mid = sampleFlightPath(pts, 0.5);
    expect(mid[0]).toBeCloseTo(5, 10);
    expect(mid[1]).toBeCloseTo(6, 10);
    expect(mid[2]).toBeCloseTo(-3, 10);
  });
  it('clamps t outside [0,1] to the endpoints', () => {
    expect(sampleFlightPath(pts, -0.5)).toEqual(sampleFlightPath(pts, 0));
    expect(sampleFlightPath(pts, 1.5)).toEqual(sampleFlightPath(pts, 1));
  });
  it('degrades gracefully for 0 or 1 points', () => {
    expect(sampleFlightPath([], 0.5)).toEqual([0, 0, 0]);
    expect(sampleFlightPath([[2, 3, 4]], 0.5)).toEqual([2, 3, 4]);
  });
});
