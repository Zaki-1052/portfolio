// src/engine/camera-keyframes.test.ts
import { describe, it, expect } from 'vitest';
import {
  CAMERA_KEYFRAMES,
  sampleCamera,
  sampleNearestKeyframe,
  type CameraKeyframe,
} from './camera-keyframes';

describe('CAMERA_KEYFRAMES table', () => {
  it('is sorted by strictly increasing depth', () => {
    for (let i = 1; i < CAMERA_KEYFRAMES.length; i++) {
      expect(CAMERA_KEYFRAMES[i]!.depth).toBeGreaterThan(CAMERA_KEYFRAMES[i - 1]!.depth);
    }
  });
  it('spans the full [0,1] depth range', () => {
    expect(CAMERA_KEYFRAMES[0]!.depth).toBe(0);
    expect(CAMERA_KEYFRAMES[CAMERA_KEYFRAMES.length - 1]!.depth).toBe(1);
  });
});

describe('sampleCamera', () => {
  it('passes exactly through every keyframe position/fov (C0 interpolation)', () => {
    for (const k of CAMERA_KEYFRAMES) {
      const s = sampleCamera(k.depth);
      expect(s.position[0]).toBeCloseTo(k.position[0], 9);
      expect(s.position[1]).toBeCloseTo(k.position[1], 9);
      expect(s.position[2]).toBeCloseTo(k.position[2], 9);
      expect(s.fov).toBeCloseTo(k.fov, 9);
    }
  });

  it('returns a normalized quaternion', () => {
    for (const d of [0, 0.04, 0.12, 0.17, 0.5, 0.9]) {
      const q = sampleCamera(d).quaternion;
      expect(Math.hypot(q[0], q[1], q[2], q[3])).toBeCloseTo(1, 9);
    }
  });

  it('stays within the bracketing z values on a monotone segment', () => {
    // 0.04 sits between keyframe 0 and keyframe 1; z must stay within them.
    const z = sampleCamera(0.04).position[2];
    expect(z).toBeLessThanOrEqual(CAMERA_KEYFRAMES[0]!.position[2]);
    expect(z).toBeGreaterThanOrEqual(CAMERA_KEYFRAMES[1]!.position[2]);
  });

  it('clamps out-of-range depth to the end keyframes', () => {
    const first = CAMERA_KEYFRAMES[0]!;
    const last = CAMERA_KEYFRAMES[CAMERA_KEYFRAMES.length - 1]!;
    expect(sampleCamera(-1).position[2]).toBeCloseTo(first.position[2], 9);
    expect(sampleCamera(2).position[2]).toBeCloseTo(last.position[2], 9);
  });

  it('has matching velocity across an interior keyframe (C1 continuity)', () => {
    // The Catmull-Rom tangent is shared by both segments at a knot, so the
    // left and right slopes must agree — that's the whole point of the spline
    // over piecewise-linear (which pops here). The path is steep near 0.15
    // (fast dolly into the aperture), so we compare slopes, not raw values.
    const eps = 1e-5;
    const d = 0.15;
    const z = (x: number): number => sampleCamera(x).position[2];
    const slopeLeft = (z(d) - z(d - eps)) / eps;
    const slopeRight = (z(d + eps) - z(d)) / eps;
    expect(Math.abs(slopeRight - slopeLeft)).toBeLessThan(1.0);
  });

  it('supports a single-keyframe table', () => {
    const one: CameraKeyframe[] = [
      { depth: 0.5, position: [1, 2, 3], quaternion: [0, 0, 0, 1], fov: 40 },
    ];
    expect(sampleCamera(0.9, one).position).toEqual([1, 2, 3]);
  });
});

describe('sampleNearestKeyframe', () => {
  it('snaps to the closest keyframe by depth', () => {
    // Reference the table so these stay correct as keyframes are tuned.
    expect(sampleNearestKeyframe(0.16).position).toEqual([...CAMERA_KEYFRAMES[2]!.position]); // 0.15
    expect(sampleNearestKeyframe(0.185).position).toEqual([...CAMERA_KEYFRAMES[3]!.position]); // 0.19
    expect(sampleNearestKeyframe(0.0).position).toEqual([...CAMERA_KEYFRAMES[0]!.position]);
  });
});
