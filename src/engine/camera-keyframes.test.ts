// src/engine/camera-keyframes.test.ts
import { describe, it, expect } from 'vitest';
import {
  CAMERA_KEYFRAMES,
  REDUCED_ANCHOR_KEYFRAMES,
  lookAtQuaternion,
  sampleCamera,
  sampleNearestKeyframe,
  type CameraKeyframe,
  type Quat,
  type Vec3,
} from './camera-keyframes';

/** Rotate a vector by a quaternion (test-side reference implementation). */
function rotate(q: Quat, v: Vec3): [number, number, number] {
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;
  // t = 2 q × v; v' = v + qw t + q × t
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

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

describe('REDUCED_ANCHOR_KEYFRAMES', () => {
  it('contains only anchors and spans the full depth range', () => {
    expect(REDUCED_ANCHOR_KEYFRAMES.length).toBeGreaterThanOrEqual(5);
    for (const k of REDUCED_ANCHOR_KEYFRAMES) expect(k.reducedAnchor).toBe(true);
    expect(REDUCED_ANCHOR_KEYFRAMES[0]!.depth).toBe(0);
    expect(REDUCED_ANCHOR_KEYFRAMES[REDUCED_ANCHOR_KEYFRAMES.length - 1]!.depth).toBe(1);
  });
});

describe('lookAtQuaternion', () => {
  it('is identity when looking down -z from +z', () => {
    const q = lookAtQuaternion([0, 0, 10], [0, 0, 0], 0);
    expect(q[0]).toBeCloseTo(0, 9);
    expect(q[1]).toBeCloseTo(0, 9);
    expect(q[2]).toBeCloseTo(0, 9);
    expect(Math.abs(q[3])).toBeCloseTo(1, 9);
  });

  it('aims the camera forward axis at the target', () => {
    const position: Vec3 = [62, 53, 88];
    const target: Vec3 = [0, 2, 0];
    const q = lookAtQuaternion(position, target, 0);
    const fwd = rotate(q, [0, 0, -1]);
    const want = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
    const len = Math.hypot(...(want as [number, number, number]));
    expect(fwd[0]).toBeCloseTo(want[0]! / len, 6);
    expect(fwd[1]).toBeCloseTo(want[1]! / len, 6);
    expect(fwd[2]).toBeCloseTo(want[2]! / len, 6);
  });

  it('survives a view axis parallel to world up (no NaN, still normalized)', () => {
    for (const [pos, tgt] of [
      [
        [0, 20, 0],
        [0, 0, 0],
      ], // looking straight down
      [
        [0, -20, 0],
        [0, 0, 0],
      ], // looking straight up
    ] as [Vec3, Vec3][]) {
      const q = lookAtQuaternion(pos, tgt, 0.3);
      for (const c of q) expect(Number.isFinite(c)).toBe(true);
      expect(Math.hypot(q[0], q[1], q[2], q[3])).toBeCloseTo(1, 9);
      const fwd = rotate(q, [0, 0, -1]);
      const wantY = tgt[1]! < pos[1]! ? -1 : 1;
      expect(fwd[1]).toBeCloseTo(wantY, 6);
    }
  });

  it('roll banks about the view axis without moving it', () => {
    const position: Vec3 = [10, 5, 20];
    const target: Vec3 = [0, 0, 0];
    const q0 = lookAtQuaternion(position, target, 0);
    const q1 = lookAtQuaternion(position, target, 0.4);
    const f0 = rotate(q0, [0, 0, -1]);
    const f1 = rotate(q1, [0, 0, -1]);
    expect(f1[0]).toBeCloseTo(f0[0], 6); // forward unchanged by roll
    expect(f1[1]).toBeCloseTo(f0[1], 6);
    expect(f1[2]).toBeCloseTo(f0[2], 6);
    const u0 = rotate(q0, [0, 1, 0]);
    const u1 = rotate(q1, [0, 1, 0]);
    const dot = u0[0] * u1[0] + u0[1] * u1[1] + u0[2] * u1[2];
    expect(dot).toBeCloseTo(Math.cos(0.4), 6); // up tilted by exactly the roll angle
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

  it('returns finite, normalized state across a dense depth sweep', () => {
    for (let d = -0.05; d <= 1.05; d += 0.005) {
      const s = sampleCamera(d);
      for (const c of s.position) expect(Number.isFinite(c)).toBe(true);
      expect(Number.isFinite(s.fov)).toBe(true);
      expect(
        Math.hypot(s.quaternion[0], s.quaternion[1], s.quaternion[2], s.quaternion[3]),
      ).toBeCloseTo(1, 9);
    }
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
    // over piecewise-linear (which pops here). Checked on every interior knot,
    // every position axis, as a slope ratio so steep segments don't need a
    // hand-tuned absolute tolerance.
    const eps = 1e-6;
    for (let i = 1; i < CAMERA_KEYFRAMES.length - 1; i++) {
      const d = CAMERA_KEYFRAMES[i]!.depth;
      for (let axis = 0; axis < 3; axis++) {
        const p = (x: number): number => sampleCamera(x).position[axis]!;
        const slopeLeft = (p(d) - p(d - eps)) / eps;
        const slopeRight = (p(d + eps) - p(d)) / eps;
        const scale = Math.max(1, Math.abs(slopeLeft), Math.abs(slopeRight));
        expect(Math.abs(slopeRight - slopeLeft) / scale).toBeLessThan(1e-2);
      }
    }
  });

  it('decays the approach distance through the spiral (decaying magnification)', () => {
    // Camera-to-origin distance must strictly shrink knot-to-knot from the
    // establish through the arrival — the geometric spacing that reads as
    // "each scroll unit multiplies magnification".
    const arrivalIndex = CAMERA_KEYFRAMES.findIndex((k) => k.depth >= 0.15);
    for (let i = 1; i <= arrivalIndex; i++) {
      const prev = Math.hypot(...CAMERA_KEYFRAMES[i - 1]!.position);
      const here = Math.hypot(...CAMERA_KEYFRAMES[i]!.position);
      expect(here).toBeLessThan(prev);
    }
  });

  it('supports a single-keyframe table', () => {
    const one: CameraKeyframe[] = [
      { depth: 0.5, position: [1, 2, 3], target: [0, 0, 0], roll: 0, fov: 40 },
    ];
    expect(sampleCamera(0.9, one).position).toEqual([1, 2, 3]);
  });
});

describe('sampleNearestKeyframe', () => {
  it('snaps to the closest keyframe by depth', () => {
    // Reference the table so these stay correct as keyframes are tuned.
    const nearest = (d: number): CameraKeyframe =>
      CAMERA_KEYFRAMES.reduce((a, b) => (Math.abs(d - b.depth) < Math.abs(d - a.depth) ? b : a));
    for (const d of [0, 0.05, 0.16, 0.185, 0.6, 1]) {
      expect(sampleNearestKeyframe(d).position).toEqual([...nearest(d).position]);
    }
  });
});
