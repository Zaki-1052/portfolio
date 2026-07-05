// src/engine/camera-focus.test.ts
// Focus poses are derived from the limb anchors (never hand-typed twice) and
// the blend must be a true interpolation: identity at t=0, the focus pose at
// t=1, unit-length orientation everywhere between — the camera controller
// composes parallax on top and assumes a normalized quaternion.
import { describe, expect, it } from 'vitest';
import { BRANCH_ORDER } from '@/content/branch-order';
import { BRANCH_ANCHORS } from '@/scales/cellular/arbor-anchors';
import { limbIndexOf } from '@/content/branch-order';
import { blendCameraSample, focusPoseFor } from './camera-focus';

const qLen = (q: readonly number[]): number => Math.hypot(q[0]!, q[1]!, q[2]!, q[3]!);

describe('focusPoseFor', () => {
  it('positions the camera a working distance from each anchor, aimed at it', () => {
    for (const branch of BRANCH_ORDER) {
      const pose = focusPoseFor(branch);
      const anchor = BRANCH_ANCHORS[limbIndexOf(branch)];
      const d = Math.hypot(
        pose.position[0] - anchor[0],
        pose.position[1] - anchor[1],
        pose.position[2] - anchor[2],
      );
      expect(d).toBeGreaterThan(5);
      expect(d).toBeLessThan(14);
      expect(pose.fov).toBeGreaterThan(38);
      expect(pose.fov).toBeLessThan(52);
      expect(qLen(pose.quaternion)).toBeCloseTo(1, 6);
      expect(pose.position.every(Number.isFinite)).toBe(true);
    }
  });

  it('gives each branch a distinct pose', () => {
    const poses = BRANCH_ORDER.map((b) => focusPoseFor(b));
    for (let a = 0; a < poses.length; a++) {
      for (let b = a + 1; b < poses.length; b++) {
        const d = Math.hypot(
          poses[a]!.position[0] - poses[b]!.position[0],
          poses[a]!.position[1] - poses[b]!.position[1],
          poses[a]!.position[2] - poses[b]!.position[2],
        );
        expect(d).toBeGreaterThan(2);
      }
    }
  });
});

describe('blendCameraSample', () => {
  const base = focusPoseFor('epigenetics');
  const target = focusPoseFor('software');

  it('returns the endpoints at t=0 and t=1', () => {
    const a = blendCameraSample(base, target, 0);
    expect(a.position).toEqual(base.position);
    expect(a.fov).toBe(base.fov);
    const b = blendCameraSample(base, target, 1);
    expect(b.position).toEqual(target.position);
    expect(b.fov).toBe(target.fov);
  });

  it('interpolates position/fov and keeps the orientation unit-length', () => {
    for (const t of [0.25, 0.5, 0.75]) {
      const s = blendCameraSample(base, target, t);
      for (let ax = 0; ax < 3; ax++) {
        const lo = Math.min(base.position[ax]!, target.position[ax]!);
        const hi = Math.max(base.position[ax]!, target.position[ax]!);
        expect(s.position[ax]!).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(s.position[ax]!).toBeLessThanOrEqual(hi + 1e-9);
      }
      expect(qLen(s.quaternion)).toBeCloseTo(1, 6);
    }
  });
});
