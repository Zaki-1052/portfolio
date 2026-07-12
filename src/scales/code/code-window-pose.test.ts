// src/scales/code/code-window-pose.test.ts
// The load-bearing contract is the NO-POP INVARIANT: every flight term is
// exactly zero at phase 1, so flight-end and the camera-locked plateau pose
// are the same expression at the boundary — the handoff is structurally
// seamless, not tuned to be. The rect tests pin that mesh and HTML derive
// the same box from the same pure function.
import { describe, expect, it } from 'vitest';
import {
  CODE_WINDOW_ASPECT,
  CODE_WINDOW_FILL,
  CODE_WINDOW_MAX_WIDTH_FRACTION,
  CODE_WINDOW_STANDOFF,
  windowFlightOffset,
  windowLockedRect,
} from './code-window-pose';

describe('windowFlightOffset', () => {
  it('is EXACTLY zero in every term at phase 1 (the no-pop invariant)', () => {
    for (const phase of [1, 1.2, 5]) {
      const o = windowFlightOffset(phase);
      expect(o.posOffset).toEqual([0, 0, 0]);
      expect(o.yawRad).toBe(0);
      expect(o.pitchRad).toBe(0);
      expect(o.rollRad).toBe(0);
      expect(o.scaleDelta).toBe(0);
    }
  });

  it('starts fully displaced: deep, offset, tilted, and smaller', () => {
    const o = windowFlightOffset(0);
    expect(o.posOffset[2]).toBeLessThan(-1); // pushed well past the standoff
    expect(Math.abs(o.posOffset[0])).toBeGreaterThan(0);
    expect(Math.abs(o.posOffset[1])).toBeGreaterThan(0);
    expect(Math.abs(o.yawRad)).toBeGreaterThan(0.1);
    expect(o.scaleDelta).toBeLessThan(0);
  });

  it('drains displacement and tilt monotonically across the flight', () => {
    let prevDist = Infinity;
    let prevTilt = Infinity;
    for (let p = 0; p <= 1 + 1e-9; p += 0.01) {
      const o = windowFlightOffset(p);
      const dist = Math.hypot(...o.posOffset);
      const tilt = Math.abs(o.yawRad) + Math.abs(o.pitchRad) + Math.abs(o.rollRad);
      expect(dist).toBeLessThanOrEqual(prevDist + 1e-12);
      expect(tilt).toBeLessThanOrEqual(prevTilt + 1e-12);
      prevDist = dist;
      prevTilt = tilt;
    }
  });

  it('settles the attitude early — the final approach glides in already flat', () => {
    for (const p of [0.8, 0.9, 0.95]) {
      const o = windowFlightOffset(p);
      expect(o.yawRad).toBe(0);
      expect(o.pitchRad).toBe(0);
      expect(o.rollRad).toBe(0);
    }
    // …while position is still traveling (the glide is real, not a jump cut).
    expect(Math.hypot(...windowFlightOffset(0.9).posOffset)).toBeGreaterThan(0);
  });

  it('clamps phases below 0 to the far pose', () => {
    expect(windowFlightOffset(-1)).toEqual(windowFlightOffset(0));
  });
});

describe('windowLockedRect', () => {
  const FOV = 50;
  const viewHalfH = Math.tan((FOV * Math.PI) / 360) * CODE_WINDOW_STANDOFF;

  it('fills the configured fraction of the frame height', () => {
    const { halfH } = windowLockedRect(FOV, 16 / 9);
    expect(halfH).toBeCloseTo(viewHalfH * CODE_WINDOW_FILL, 12);
  });

  it('uses the window aspect on wide viewports', () => {
    const { halfW, halfH } = windowLockedRect(FOV, 16 / 9);
    expect(halfW).toBeCloseTo(halfH * CODE_WINDOW_ASPECT, 12);
  });

  it('clamps to the viewport width on narrow viewports (the resized-pane look)', () => {
    const aspect = 9 / 16;
    const { halfW, halfH } = windowLockedRect(FOV, aspect);
    expect(halfW).toBeCloseTo(viewHalfH * aspect * CODE_WINDOW_MAX_WIDTH_FRACTION, 12);
    expect(halfW).toBeLessThan(halfH * CODE_WINDOW_ASPECT);
    expect(halfH).toBeCloseTo(viewHalfH * CODE_WINDOW_FILL, 12); // height never yields
  });

  it('scales linearly with the standoff distance', () => {
    const near = windowLockedRect(FOV, 16 / 9, 5);
    const far = windowLockedRect(FOV, 16 / 9, 10);
    expect(far.halfH).toBeCloseTo(near.halfH * 2, 12);
    expect(far.halfW).toBeCloseTo(near.halfW * 2, 12);
  });
});
