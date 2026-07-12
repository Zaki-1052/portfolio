// src/utils/quaternion.test.ts
// The forward rotation must agree with the two production consumers of
// quaternions: lookAtQuaternion (whose forward axis definition it must
// reproduce) and screen-project's inverse rotation (conjugate round-trip).
import { describe, expect, it } from 'vitest';
import { lookAtQuaternion, type Quat, type Vec3 } from '@/engine/camera-keyframes';
import { rotateByQuat } from './quaternion';

function conjugate(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

describe('rotateByQuat', () => {
  it('is the identity under the identity quaternion', () => {
    expect(rotateByQuat([1, 2, 3], [0, 0, 0, 1])).toEqual([1, 2, 3]);
  });

  it('aims the camera forward axis at the look-at target (lookAtQuaternion round-trip)', () => {
    const position: Vec3 = [10, 5, 20];
    const target: Vec3 = [-3, 2, -7];
    const q = lookAtQuaternion(position, target, 0);
    const fwd = rotateByQuat([0, 0, -1], q);
    const want = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
    const len = Math.hypot(want[0]!, want[1]!, want[2]!);
    expect(fwd[0]).toBeCloseTo(want[0]! / len, 9);
    expect(fwd[1]).toBeCloseTo(want[1]! / len, 9);
    expect(fwd[2]).toBeCloseTo(want[2]! / len, 9);
  });

  it('round-trips through the conjugate (the screen-project inverse)', () => {
    const q = lookAtQuaternion([62, 53, 88], [0, 2, 0], 0.3);
    for (const v of [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
      [3, -4, 12],
    ] as Vec3[]) {
      const there = rotateByQuat(v, q);
      const back = rotateByQuat(there, conjugate(q));
      expect(back[0]).toBeCloseTo(v[0], 9);
      expect(back[1]).toBeCloseTo(v[1], 9);
      expect(back[2]).toBeCloseTo(v[2], 9);
    }
  });

  it('preserves vector length (pure rotation, no scale)', () => {
    const q = lookAtQuaternion([10, 5, 20], [0, 0, 0], -0.2);
    const v: Vec3 = [3, -4, 12];
    const rotated = rotateByQuat(v, q);
    expect(Math.hypot(...rotated)).toBeCloseTo(Math.hypot(...v), 9);
  });
});
