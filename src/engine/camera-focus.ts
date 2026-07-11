// src/engine/camera-focus.ts
// The click-to-focus camera layer: a working pose per limb (second band) and
// per publication region (third band), each derived from its anchors — never
// hand-typed twice — plus the blend that carries the depth-driven sample
// toward it. Pure math (no three import), node-tested; the controller
// composes the result BEFORE its parallax post-multiply.
import type { BranchKey } from '@/content/branch-order';
import { limbIndexOf } from '@/content/branch-order';
import { getBranchAnchors } from '@/scales/cellular/arbor-anchors';
import { ARBOR_ORIGIN } from '@/scales/cellular/arbor-params';
import { getRegionAnchors } from '@/scales/chromatin/coil-anchors';
import { COIL_ORIGIN } from '@/scales/chromatin/coil-params';
import type { CoilRegionIndex } from '@/stores/coil-focus';
import { lookAtQuaternion, type CameraSample, type Quat, type Vec3 } from './camera-keyframes';

const FOCUS_DISTANCE = 8.5; // camera stand-off from the limb anchor
const FOCUS_LIFT = 1.5; // slight elevation so entries read over the canopy
const FOCUS_FOV = 44; // tighter than the band's settle framing

/** Canopy pivot the stand-off direction radiates from — at tip altitude
 *  (root +20), so focus cameras approach each anchor near-horizontally
 *  instead of craning up from under the canopy. */
const CANOPY_CENTER: Vec3 = [ARBOR_ORIGIN[0], ARBOR_ORIGIN[1] + 20, ARBOR_ORIGIN[2]];

export function focusPoseFor(branch: BranchKey): CameraSample {
  const anchor = getBranchAnchors()[limbIndexOf(branch)];
  const out: Vec3 = [
    anchor[0] - CANOPY_CENTER[0],
    anchor[1] - CANOPY_CENTER[1],
    anchor[2] - CANOPY_CENTER[2],
  ];
  const len = Math.hypot(out[0], out[1], out[2]) || 1;
  const position: [number, number, number] = [
    anchor[0] + (out[0] / len) * FOCUS_DISTANCE,
    anchor[1] + (out[1] / len) * FOCUS_DISTANCE + FOCUS_LIFT,
    anchor[2] + (out[2] / len) * FOCUS_DISTANCE,
  ];
  return {
    position,
    quaternion: lookAtQuaternion(position, anchor, 0),
    fov: FOCUS_FOV,
  };
}

// Region focus (third band): the open arc is wide (~13 across at full
// unwind on the 5.5 rising-coil packing) and the dimmed compact spool should
// stay in frame behind it, so the stand-off is much longer than the limb
// poses'. 5.6 retune (user note): the old near-level pose read as tendrils
// lunging at the lens — the lift now raises the camera well above the
// opened arc so it looks gently DOWN at a specimen laid out below, matching
// the band's above-the-shoulder POV.
const REGION_FOCUS_DISTANCE = 19;
const REGION_FOCUS_LIFT = 6;
const REGION_FOCUS_FOV = 45;

/**
 * Focus pose for a publication region. The look-target is the OPEN arc's
 * centroid (where the unwound mass and its card live); the stand-off BEARING
 * comes from the COMPACT anchor's rim direction — the open centroid sits
 * near the cluster axis (the arc wraps past a full turn around it), so a
 * radial direction through it would be ill-conditioned, while the rim
 * bearing is stable and faces the side the region unwinds toward.
 */
export function regionFocusPoseFor(region: CoilRegionIndex): CameraSample {
  const anchors = getRegionAnchors();
  const compact = anchors.compact[region];
  const target = anchors.open[region];
  const out: Vec3 = [
    compact[0] - COIL_ORIGIN[0],
    compact[1] - COIL_ORIGIN[1],
    compact[2] - COIL_ORIGIN[2],
  ];
  const len = Math.hypot(out[0], out[1], out[2]) || 1;
  const position: [number, number, number] = [
    target[0] + (out[0] / len) * REGION_FOCUS_DISTANCE,
    target[1] + (out[1] / len) * REGION_FOCUS_DISTANCE + REGION_FOCUS_LIFT,
    target[2] + (out[2] / len) * REGION_FOCUS_DISTANCE,
  ];
  return {
    position,
    quaternion: lookAtQuaternion(position, target, 0),
    fov: REGION_FOCUS_FOV,
  };
}

/** Shortest-arc quaternion slerp (hand-rolled, matches the codebase's pure
 *  style; nlerp fallback when the arc is tiny). */
function slerp(a: Quat, b: Quat, t: number): [number, number, number, number] {
  let bx = b[0];
  let by = b[1];
  let bz = b[2];
  let bw = b[3];
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) {
    cos = -cos;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  let wa: number;
  let wb: number;
  if (cos > 0.9995) {
    wa = 1 - t;
    wb = t;
  } else {
    const theta = Math.acos(Math.min(1, cos));
    const sin = Math.sin(theta);
    wa = Math.sin((1 - t) * theta) / sin;
    wb = Math.sin(t * theta) / sin;
  }
  const qx = a[0] * wa + bx * wb;
  const qy = a[1] * wa + by * wb;
  const qz = a[2] * wa + bz * wb;
  const qw = a[3] * wa + bw * wb;
  const len = Math.hypot(qx, qy, qz, qw) || 1;
  return [qx / len, qy / len, qz / len, qw / len];
}

export function blendCameraSample(
  base: CameraSample,
  focus: CameraSample,
  t: number,
): CameraSample {
  if (t <= 0) return base;
  if (t >= 1) return focus;
  return {
    position: [
      base.position[0] + (focus.position[0] - base.position[0]) * t,
      base.position[1] + (focus.position[1] - base.position[1]) * t,
      base.position[2] + (focus.position[2] - base.position[2]) * t,
    ],
    quaternion: slerp(base.quaternion, focus.quaternion, t),
    fov: base.fov + (focus.fov - base.fov) * t,
  };
}
