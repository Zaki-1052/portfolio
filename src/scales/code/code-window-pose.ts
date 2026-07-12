// src/scales/code/code-window-pose.ts
// The terminal window's 3D pose math, pure in the pose phase. The locked pose
// (phase = 1) is the identity: the window sits dead-on at the standoff
// distance, screen-locked, filling most of the frame. windowFlightOffset
// expresses the arrival/exit flight as CAMERA-LOCAL deltas from that pose —
// every term is EXACTLY zero at phase 1 (the no-pop invariant, unit-tested),
// so the flight and the screen-locked plateau are one continuous expression
// with no seam at the handoff. CodeWindowFrame composes these deltas along
// the live camera's local axes; the HTML layer re-derives the same locked
// rect through windowLockedRect so canvas and DOM can never disagree.
import { clamp, smoothstep } from '@/utils/math';

/** World units from the camera to the locked window plane. Far enough that
 *  the near plane (0.1) is irrelevant; close enough that the band's very
 *  light fog barely touches the chrome. */
export const CODE_WINDOW_STANDOFF = 10;

/** Fraction of the viewport height the locked window fills — near-fullscreen
 *  with a breathing margin, the macOS "comfortably maximized" look. */
export const CODE_WINDOW_FILL = 0.86;

/** The window's own aspect (w/h) on viewports wide enough to allow it. */
export const CODE_WINDOW_ASPECT = 1.6;

/** Max fraction of the viewport width the window may occupy — on narrow
 *  viewports the width clamps and the window reads taller, exactly like a
 *  real terminal resized to a phone-shaped pane. */
export const CODE_WINDOW_MAX_WIDTH_FRACTION = 0.92;

export interface WindowFlightOffset {
  /** Camera-local offset [+X right, +Y up, +Z toward the viewer] in units of
   *  the locked half-height (resolution-independent; the frame scales by the
   *  live rect). Negative Z pushes the window DEEPER than the standoff. */
  posOffset: [number, number, number];
  /** Tilt about the camera-local Y axis (yaw), radians. */
  yawRad: number;
  /** Tilt about the camera-local X axis (pitch), radians. */
  pitchRad: number;
  /** Roll about the view axis, radians. */
  rollRad: number;
  /** Delta on the window's uniform scale — final scale = 1 + scaleDelta. */
  scaleDelta: number;
}

// The flight's far pose (phase 0): below and right of the lock point, pushed
// well past the standoff so perspective does most of the shrinking, angled
// toward the camera. Attitude settles EARLY (by 80% of the flight) so the
// window swings face-on first and then glides the final approach flat — the
// classic object-arrival beat, and it means the last stretch before the HTML
// handoff is already tilt-free.
const FLIGHT_POS_OFFSET: readonly [number, number, number] = [0.9, -0.55, -7];
const FLIGHT_YAW_RAD = -0.55;
const FLIGHT_PITCH_RAD = 0.12;
const FLIGHT_ROLL_RAD = -0.08;
const FLIGHT_SCALE_DELTA = -0.25;
const FLIGHT_UNTILT_END = 0.8;

/** a·t, with t = 0 returning a true +0 — the no-pop invariant is asserted
 *  with exact equality, and a negative constant times zero is -0. */
function term(a: number, t: number): number {
  return t === 0 ? 0 : a * t;
}

export function windowFlightOffset(phase: number): WindowFlightOffset {
  const p = clamp(phase, 0, 1);
  const travel = 1 - p;
  const tilt = 1 - smoothstep(0, FLIGHT_UNTILT_END, p);
  return {
    posOffset: [
      term(FLIGHT_POS_OFFSET[0], travel),
      term(FLIGHT_POS_OFFSET[1], travel),
      term(FLIGHT_POS_OFFSET[2], travel),
    ],
    yawRad: term(FLIGHT_YAW_RAD, tilt),
    pitchRad: term(FLIGHT_PITCH_RAD, tilt),
    rollRad: term(FLIGHT_ROLL_RAD, tilt),
    scaleDelta: term(FLIGHT_SCALE_DELTA, travel),
  };
}

export interface WindowRect {
  /** Half-extents of the locked window plane, world units at the standoff. */
  halfW: number;
  halfH: number;
}

/**
 * The locked window's half-extents at the standoff distance, from the live
 * camera fov (vertical, degrees) and the viewport aspect (w/h). Pure — the
 * mesh scales by this and the HTML tick projects its corners through
 * worldToScreen, so both layers derive the rect from the same expression.
 */
export function windowLockedRect(
  fovDeg: number,
  viewportAspect: number,
  standoff: number = CODE_WINDOW_STANDOFF,
  fill: number = CODE_WINDOW_FILL,
): WindowRect {
  const viewHalfH = Math.tan((fovDeg * Math.PI) / 360) * standoff;
  const halfH = viewHalfH * fill;
  const halfW = Math.min(
    halfH * CODE_WINDOW_ASPECT,
    viewHalfH * viewportAspect * CODE_WINDOW_MAX_WIDTH_FRACTION,
  );
  return { halfW, halfH };
}
