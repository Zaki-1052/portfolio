// src/engine/camera-keyframes.ts
// The scroll-driven camera path as a table of per-depth keyframes plus a pure
// sampler. Keyframes are authored as position + look-at target + roll (banking)
// — far easier to reason about than raw quaternions — and the sampler derives
// the orientation each sample via lookAtQuaternion. Position AND target both
// run through a non-uniform cubic Hermite spline (Catmull-Rom tangents in the
// depth domain) so velocity is continuous across keyframes; roll/fov ease with
// a smootherstep whose end slopes are zero, so they are C1 at knots too. No
// three import, so the whole module is node-testable; camera-controller.tsx
// applies the result to the live camera.

export type Vec3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number];

export interface CameraKeyframe {
  depth: number; // canonical 0..1, strictly increasing across the table
  position: Vec3;
  target: Vec3; // world point the camera looks at
  roll: number; // radians, rotation about the view axis (positive = clockwise)
  fov: number;
  /**
   * Marks the knots the reduced-motion path snaps between. The full spiral
   * table (~9 knots) would read as a rapid slideshow under nearest-keyframe
   * cuts; the anchors are the handful of story beats that stand alone.
   */
  reducedAnchor?: boolean;
}

export interface CameraSample {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  fov: number;
}

// Starter table — PLACEHOLDER values, tuned live in leva (camera-dev-tools.tsx)
// then baked back here. The arc lives in the 'approach' band [0, 0.14]: a
// spiral descent around the shell (long axis = Z) — far, elevated establish
// on the lonely form; orbit ~120° while closing with roughly geometric
// (~0.65×/knot) distance decay so approach speed reads as decaying
// magnification; profile beat broadside to the long axis; off-axis arrival;
// immersive finale skimming the ridge field above the central groove; plunge
// down through the dissolved cap exactly at the band boundary (the
// breakthrough window is derived from SCALE_BOUNDARIES[1]); then a slow
// interior drift behind the first content scale, and the long void tail.
// See camera-keyframes.test.ts for the invariants this table must hold.
export const CAMERA_KEYFRAMES: readonly CameraKeyframe[] = [
  { depth: 0.0, position: [62, 53, 88], target: [0, 2, 0], roll: 0, fov: 55, reducedAnchor: true }, // establish — form ≈15% of frame height, veiled in fog
  { depth: 0.035, position: [58, 26, 33], target: [0, 1, 0], roll: -0.035, fov: 52 }, // orbit begins — lateral sweep, descending
  { depth: 0.07, position: [40, 12, 7], target: [0, 0, 0], roll: -0.052, fov: 50 }, // closing — banking through the turn
  { depth: 0.105, position: [15, 15, -11.5], target: [0, 2, -3], roll: -0.035, fov: 51 }, // far quarter — the pan completes inside the approach band
  {
    depth: 0.14,
    position: [0.8, 22, -8.5],
    target: [0, 4, -6.5],
    roll: -0.01,
    fov: 54,
    reducedAnchor: true,
  }, // hero enters ALREADY straight overhead — target nearly beneath the camera so the crease is viewed head-on (not foreshortened down the slot), several coils + the crease in frame (band boundary)
  {
    depth: 0.175,
    position: [0.5, 22.5, -6.5],
    target: [0, 2, -5.5],
    roll: 0.006,
    fov: 56,
    reducedAnchor: true,
  }, // hero center — squarely above, looking straight down, the slot a vertical line down the screen, cap starting to fade open (= BREAKTHROUGH_START)
  { depth: 0.2, position: [0.3, 16.8, -5.8], target: [0, -1, -4.8], roll: 0, fov: 58 }, // zooming straight down into the widening opening — no lateral drift; closes toward the rim as the dissolve opens
  {
    depth: 0.231,
    position: [0, 2, -5],
    target: [0, -5, -6.5],
    roll: 0,
    fov: 62,
    reducedAnchor: true,
  }, // through the opening, inside the shell (= BREAKTHROUGH_END)
  { depth: 0.31, position: [0, -1, -6], target: [0, -4, -15], roll: 0, fov: 58 }, // interior glide along the long axis, walls receding into the next scale
  // --- The arbor band (second scale): exit the receding interior into rose
  // mist, sweep the canopy, settle off-axis for the index/backdrop hold.
  // Starter values — tuned live via camera-dev-tools (bake → paste). ---
  { depth: 0.335, position: [2, -2, -8], target: [1, 0, -26], roll: -0.01, fov: 58 }, // exit glide — the structure's silhouette first resolves in the mist
  {
    depth: 0.36,
    position: [16.5, -0.5, -7],
    target: [1, -1.5, -25],
    roll: -0.02,
    fov: 55,
    reducedAnchor: true,
  }, // orbital sweep, broadside — hub + radiating limbs resolved, canopy towering (NB: keep every axis moving knot-to-knot — an exactly-stationary axis is a dead beat and reads as a camera stall)
  { depth: 0.385, position: [8.5, -1.8, -1.5], target: [1, -2.5, -24], roll: 0.015, fov: 51 }, // the sweep curls in toward the front
  {
    depth: 0.41,
    position: [-11.5, -2.5, 5.5],
    target: [1, -3.5, -24],
    roll: 0,
    fov: 49,
    reducedAnchor: true,
  }, // off-axis rule-of-thirds settle — hub above the frame bottom with the filament's fall visible, canopy generous in frame (user-tuned midpoint framing, 2026-07-05)
  { depth: 0.43, position: [-11.5, -4, 5], target: [1, -5, -24], roll: 0, fov: 49 }, // hold with a breath of downward drift while the next section covers (= SCALE_BOUNDARIES[3])
  // --- The coil band (third scale), 5.6 hub-dive: after the hold the
  // camera locks onto the tree's glowing hub (world ≈ [2,-10.6,-28], r≈2)
  // and pushes INTO it — the swelling glow + fog spike + bloom swell own
  // the frame through the crossing (the arbor has already dissolved to fog
  // color, so the near-plane pass is fog-on-fog), and the spool resolves
  // out of the same glow on the far side. No frame holds tree and coil as
  // simultaneous subjects. The three dive knots are non-anchor — the
  // reduced-motion track still cuts 0.41 → 0.48 → 0.565. Framing
  // COIL_ORIGIN [0, -26, -40]; tuned in the descent-preview harness. ---
  { depth: 0.442, position: [-6.1, -6.6, -8.2], target: [2, -10.6, -28], roll: -0.01, fov: 49 }, // lock-on — the target snaps to the hub, the push begins along the view ray
  { depth: 0.454, position: [0.33, -9.78, -23.9], target: [4.2, -11.7, -33.5], roll: 0, fov: 49 }, // 4.5 u out — the glow fills the frame; target pushed THROUGH the center so the ray never degenerates
  { depth: 0.464, position: [3.3, -11.2, -31.2], target: [1.5, -17, -38], roll: 0, fov: 48.5 }, // out the far side — aim easing down toward the coil zone
  {
    depth: 0.48,
    position: [11, -19.5, -21],
    target: [-6.5, -24.5, -40.5],
    roll: 0.01,
    fov: 48,
    reducedAnchor: true,
  }, // spool resolved, broadside orbital — the fiber-visible beat, column lower-right of the fading intro
  { depth: 0.52, position: [11, -30, -52], target: [-0.5, -25.5, -39], roll: -0.01, fov: 47 }, // the sweep orbits behind and below — reads as thread parallax, not framing change (the annotation window, stage 5.4)
  {
    depth: 0.565,
    position: [-8, -29.5, -54.5],
    target: [-3, -26.8, -36.5],
    roll: 0,
    fov: 50,
    reducedAnchor: true,
  }, // settled hold, target pulled past the cluster so it rests on the left third — echoes the arbor settle, annotation room right (≈ SCALE_BOUNDARIES[4])
  {
    depth: 1.0,
    position: [0, -46, -14],
    target: [0, -56, -18],
    roll: 0,
    fov: 55,
    reducedAnchor: true,
  }, // continued descent through the void
];

// The overture's push-in track, sampled by introProgress (0..1) instead of
// scroll depth. The start knot sits far out along the establish bearing —
// deep inside the opening veil, so the form emerges from the haze during the
// flight. The end knot IS the depth-0 descent pose (spread from
// CAMERA_KEYFRAMES[0]), so the handoff to scroll is structurally pop-free
// (asserted in camera-keyframes.test.ts).
export const INTRO_KEYFRAMES: readonly CameraKeyframe[] = [
  { depth: 0, position: [155, 132, 220], target: [0, 2, 0], roll: 0, fov: 55 },
  { ...CAMERA_KEYFRAMES[0]!, depth: 1 },
];

// Mutable working copy the dev panel writes into; production reads the frozen
// table above. Deep-cloned so leva edits never mutate the shipped constants.
export const liveCameraKeyframes: CameraKeyframe[] = CAMERA_KEYFRAMES.map((k) => ({
  depth: k.depth,
  position: [...k.position] as Vec3,
  target: [...k.target] as Vec3,
  roll: k.roll,
  fov: k.fov,
  reducedAnchor: k.reducedAnchor,
}));

/** The reduced-motion snap track: anchor beats only. */
export const REDUCED_ANCHOR_KEYFRAMES: readonly CameraKeyframe[] = CAMERA_KEYFRAMES.filter(
  (k) => k.reducedAnchor,
);

// Shares knot objects with liveCameraKeyframes, so leva edits stay in sync.
export const liveReducedAnchorKeyframes: readonly CameraKeyframe[] = liveCameraKeyframes.filter(
  (k) => k.reducedAnchor,
);

/**
 * Orientation looking from `position` toward `target`, banked by `roll` about
 * the view axis. Pure (no three import). Guards: a view direction parallel to
 * worldUp swaps to a secondary up axis (the establish shot looks steeply down);
 * a zero-length view direction holds the -Z default rather than emitting NaN,
 * so a transient degenerate leva edit can't wedge the camera.
 */
export function lookAtQuaternion(
  position: Vec3,
  target: Vec3,
  roll: number,
  worldUp: Vec3 = [0, 1, 0],
): [number, number, number, number] {
  // Camera-space +Z points from target back toward the eye (three convention:
  // the camera looks down its local -Z).
  let zx = position[0] - target[0];
  let zy = position[1] - target[1];
  let zz = position[2] - target[2];
  const zLen = Math.hypot(zx, zy, zz);
  if (zLen < 1e-8) {
    zx = 0;
    zy = 0;
    zz = 1;
  } else {
    zx /= zLen;
    zy /= zLen;
    zz /= zLen;
  }

  let [ux, uy, uz] = worldUp;
  if (Math.abs(zx * ux + zy * uy + zz * uz) > 0.999) {
    // View axis parallel to up — fall back to a secondary up so the basis
    // cross products stay well-conditioned.
    [ux, uy, uz] = [0, 0, 1];
    if (Math.abs(zz) > 0.999) [ux, uy, uz] = [1, 0, 0];
  }

  // x = up × z, y = z × x — right-handed orthonormal camera basis.
  let xx = uy * zz - uz * zy;
  let xy = uz * zx - ux * zz;
  let xz = ux * zy - uy * zx;
  const xLen = Math.hypot(xx, xy, xz) || 1;
  xx /= xLen;
  xy /= xLen;
  xz /= xLen;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  // Basis (columns x, y, z) → quaternion, Shepperd's method.
  const m00 = xx;
  const m01 = yx;
  const m02 = zx;
  const m10 = xy;
  const m11 = yy;
  const m12 = zy;
  const m20 = xz;
  const m21 = yz;
  const m22 = zz;
  const trace = m00 + m11 + m22;
  let qx: number;
  let qy: number;
  let qz: number;
  let qw: number;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    qw = 0.25 / s;
    qx = (m21 - m12) * s;
    qy = (m02 - m20) * s;
    qz = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    qw = (m21 - m12) / s;
    qx = 0.25 * s;
    qy = (m01 + m10) / s;
    qz = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    qw = (m02 - m20) / s;
    qx = (m01 + m10) / s;
    qy = 0.25 * s;
    qz = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    qw = (m10 - m01) / s;
    qx = (m02 + m20) / s;
    qy = (m12 + m21) / s;
    qz = 0.25 * s;
  }

  // Bank: post-multiply a rotation about the camera's local Z (the view axis).
  const half = roll * 0.5;
  const rs = Math.sin(half);
  const rc = Math.cos(half);
  const fx = qx * rc + qy * rs;
  const fy = qy * rc - qx * rs;
  const fz = qz * rc + qw * rs;
  const fw = qw * rc - qz * rs;

  const len = Math.hypot(fx, fy, fz, fw) || 1;
  return [fx / len, fy / len, fz / len, fw / len];
}

/** Segment index i such that kfs[i].depth ≤ depth ≤ kfs[i+1].depth (clamped). */
function findSegment(depth: number, kfs: readonly CameraKeyframe[]): number {
  const last = kfs.length - 1;
  if (depth <= kfs[0]!.depth) return 0;
  if (depth >= kfs[last]!.depth) return last - 1;
  for (let i = 0; i < last; i++) {
    if (depth >= kfs[i]!.depth && depth <= kfs[i + 1]!.depth) return i;
  }
  return last - 1;
}

type Vec3Field = (k: CameraKeyframe) => Vec3;

/** Catmull-Rom tangent (depth-domain finite difference) for one axis at knot i. */
function tangent(
  kfs: readonly CameraKeyframe[],
  i: number,
  axis: number,
  field: Vec3Field,
): number {
  const n = kfs.length;
  const val = (k: number): number => field(kfs[k]!)[axis]!;
  const dep = (k: number): number => kfs[k]!.depth;
  if (i === 0) return (val(1) - val(0)) / (dep(1) - dep(0));
  if (i === n - 1) return (val(n - 1) - val(n - 2)) / (dep(n - 1) - dep(n - 2));
  return (val(i + 1) - val(i - 1)) / (dep(i + 1) - dep(i - 1));
}

function hermiteAxis(
  kfs: readonly CameraKeyframe[],
  i: number,
  depth: number,
  axis: number,
  field: Vec3Field,
): number {
  const d0 = kfs[i]!.depth;
  const d1 = kfs[i + 1]!.depth;
  const h = d1 - d0;
  if (h <= 0) return field(kfs[i]!)[axis]!;
  const t = (depth - d0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const p0 = field(kfs[i]!)[axis]!;
  const p1 = field(kfs[i + 1]!)[axis]!;
  const m0 = tangent(kfs, i, axis, field) * h; // scale depth-domain tangent to local t
  const m1 = tangent(kfs, i + 1, axis, field) * h;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

function hermiteVec3(
  kfs: readonly CameraKeyframe[],
  i: number,
  depth: number,
  field: Vec3Field,
): [number, number, number] {
  return [
    hermiteAxis(kfs, i, depth, 0, field),
    hermiteAxis(kfs, i, depth, 1, field),
    hermiteAxis(kfs, i, depth, 2, field),
  ];
}

function smootherLocalT(depth: number, d0: number, d1: number): number {
  if (d1 <= d0) return 0;
  const t = Math.max(0, Math.min(1, (depth - d0) / (d1 - d0)));
  return t * t * (3 - 2 * t);
}

const positionOf: Vec3Field = (k) => k.position;
const targetOf: Vec3Field = (k) => k.target;

/**
 * Sample the full camera state at a depth. Position and target are C1 across
 * keyframes; roll and fov ease per segment (zero end-slope, so C1 at knots);
 * the quaternion is derived from the sampled look-at each call. Depths outside
 * the table clamp to the end keyframes.
 */
export function sampleCamera(
  depth: number,
  keyframes: readonly CameraKeyframe[] = CAMERA_KEYFRAMES,
): CameraSample {
  const kfs = keyframes;
  if (kfs.length === 1) {
    const only = kfs[0]!;
    return {
      position: [...only.position] as [number, number, number],
      quaternion: lookAtQuaternion(only.position, only.target, only.roll),
      fov: only.fov,
    };
  }
  // Clamp into the table's range so out-of-range depths hold the end keyframes
  // (never extrapolate the cubic beyond the last knot).
  const dd = Math.max(kfs[0]!.depth, Math.min(kfs[kfs.length - 1]!.depth, depth));
  const i = findSegment(dd, kfs);
  const k0 = kfs[i]!;
  const k1 = kfs[i + 1]!;
  const tEase = smootherLocalT(dd, k0.depth, k1.depth);
  const position = hermiteVec3(kfs, i, dd, positionOf);
  const target = hermiteVec3(kfs, i, dd, targetOf);
  const roll = k0.roll + (k1.roll - k0.roll) * tEase;
  return {
    position,
    quaternion: lookAtQuaternion(position, target, roll),
    fov: k0.fov + (k1.fov - k0.fov) * tEase,
  };
}

/** Nearest keyframe by depth — the reduced-motion "instant cut" sampler. */
export function sampleNearestKeyframe(
  depth: number,
  keyframes: readonly CameraKeyframe[] = CAMERA_KEYFRAMES,
): CameraSample {
  let best = keyframes[0]!;
  let bestDist = Math.abs(depth - best.depth);
  for (const k of keyframes) {
    const dist = Math.abs(depth - k.depth);
    if (dist < bestDist) {
      best = k;
      bestDist = dist;
    }
  }
  return {
    position: [...best.position] as [number, number, number],
    quaternion: lookAtQuaternion(best.position, best.target, best.roll),
    fov: best.fov,
  };
}
