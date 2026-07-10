// src/scales/chromatin/coil-current.test.ts
import { describe, expect, it } from 'vitest';
import { COIL_CURRENT_DEFAULTS, currentDir, currentOffset } from './coil-current';

const P0: [number, number, number] = [0, 0, 0];
const CFG = COIL_CURRENT_DEFAULTS;

function mag(v: [number, number, number]): number {
  return Math.hypot(v[0], v[1], v[2]);
}

describe('coil-current', () => {
  it('offset magnitude never exceeds the amplitude', () => {
    for (let t = 0; t < 60; t += 0.7) {
      for (const pos of [P0, [12, -26, -40], [-30, 4, 55]] as const) {
        expect(mag(currentOffset(pos, t, CFG))).toBeLessThanOrEqual(CFG.amp + 1e-9);
      }
    }
  });

  it('is horizontal and aligned with the compass direction', () => {
    const [dx, dz] = currentDir(CFG.dirDeg);
    const o = currentOffset([7, 3, -9], 1.3, CFG);
    expect(o[1]).toBe(0);
    // Offset is a scalar multiple of the direction: cross term vanishes.
    expect(o[0] * dz - o[2] * dx).toBeCloseTo(0, 12);
  });

  it('is exactly periodic in time with period 2π/freq', () => {
    const period = (Math.PI * 2) / CFG.freq;
    const a = currentOffset([5, 0, 5], 2, CFG);
    const b = currentOffset([5, 0, 5], 2 + period, CFG);
    expect(a[0]).toBeCloseTo(b[0], 9);
    expect(a[2]).toBeCloseTo(b[2], 9);
  });

  it('is zero everywhere when the amplitude is zero', () => {
    const still = { ...CFG, amp: 0 };
    expect(mag(currentOffset([3, 1, -2], 4.2, still))).toBe(0);
  });

  it('coherence contract: points one wavelength apart along the flow agree', () => {
    const [dx, dz] = currentDir(CFG.dirDeg);
    const wavelength = (Math.PI * 2) / CFG.k;
    const p1: [number, number, number] = [10, 0, -4];
    const p2: [number, number, number] = [10 + dx * wavelength, 0, -4 + dz * wavelength];
    const a = currentOffset(p1, 3.1, CFG);
    const b = currentOffset(p2, 3.1, CFG);
    expect(a[0]).toBeCloseTo(b[0], 8);
    expect(a[2]).toBeCloseTo(b[2], 8);
  });
});
