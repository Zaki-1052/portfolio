// src/engine/screen-project.test.ts
// The DOM annotation layer trusts this projector to agree with what the GPU
// renders — wrong math puts every label off its limb. Conventions asserted:
// three's camera looks down its local -Z; identity quaternion = looking toward
// -Z from the position; NDC → CSS pixels with y flipped.
import { describe, expect, it } from 'vitest';
import { worldToScreen, type CameraPoseLike } from './screen-project';

const W = 1000;
const H = 800;

// Identity orientation at the origin: looking down -Z.
const pose = (fov = 50): CameraPoseLike => ({
  position: [0, 0, 10],
  quaternion: [0, 0, 0, 1],
  fov,
});

describe('worldToScreen', () => {
  it('projects a point dead ahead to the viewport center', () => {
    const p = worldToScreen([0, 0, 0], pose(), W, H);
    expect(p.visible).toBe(true);
    expect(p.x).toBeCloseTo(W / 2, 5);
    expect(p.y).toBeCloseTo(H / 2, 5);
    expect(p.depth).toBeCloseTo(10, 5);
  });

  it('marks points behind the camera invisible', () => {
    const p = worldToScreen([0, 0, 20], pose(), W, H);
    expect(p.visible).toBe(false);
  });

  it('maps a point to the camera-right to the right half, up to the top half', () => {
    const right = worldToScreen([2, 0, 0], pose(), W, H);
    expect(right.x).toBeGreaterThan(W / 2);
    const up = worldToScreen([0, 2, 0], pose(), W, H);
    // CSS y grows downward.
    expect(up.y).toBeLessThan(H / 2);
  });

  it('brings the same off-axis point closer to center at a wider fov', () => {
    const narrow = worldToScreen([2, 1, 0], pose(40), W, H);
    const wide = worldToScreen([2, 1, 0], pose(70), W, H);
    expect(Math.abs(wide.x - W / 2)).toBeLessThan(Math.abs(narrow.x - W / 2));
    expect(Math.abs(wide.y - H / 2)).toBeLessThan(Math.abs(narrow.y - H / 2));
  });

  it('respects the camera orientation (quaternion rotates the view)', () => {
    // 90° yaw about +Y: the camera now looks down -X, so a point on -X is
    // dead ahead.
    const s = Math.SQRT1_2;
    const yawed: CameraPoseLike = { position: [0, 0, 0], quaternion: [0, s, 0, s], fov: 50 };
    const p = worldToScreen([-5, 0, 0], yawed, W, H);
    expect(p.visible).toBe(true);
    expect(p.x).toBeCloseTo(W / 2, 4);
    expect(p.y).toBeCloseTo(H / 2, 4);
  });
});
