// src/engine/camera-keyframes.ts
// The scroll-driven camera path as a table of per-depth keyframes plus a pure
// sampler. Position uses a non-uniform cubic Hermite spline (Catmull-Rom
// tangents in the depth domain) so velocity is continuous across keyframes —
// piecewise-linear lerp pops at every knot, which reads badly through the
// breakthrough fly-through. Orientation slerps; FOV eases. No three import, so
// the whole module is node-testable; camera-controller.tsx applies the result
// to the live camera.

export type Vec3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number];

export interface CameraKeyframe {
  depth: number; // canonical 0..1, strictly increasing across the table
  position: Vec3;
  quaternion: Quat; // [x, y, z, w]
  fov: number;
}

export interface CameraSample {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  fov: number;
}

// Starter table — PLACEHOLDER values, tuned live in leva (camera-dev-tools.tsx)
// then baked back here. Anchors: establishing dolly, arrival→content push, the
// aperture line-up, and continued descent through the (Phase-3 empty) void so
// scrolling past the first scale keeps moving rather than freezing. Quaternions start at
// identity (looking down -z toward the shell at the origin); tilt is added in
// leva. See camera-keyframes.test.ts for the invariants this table must hold.
export const CAMERA_KEYFRAMES: readonly CameraKeyframe[] = [
  { depth: 0.0, position: [0, 0, 26], quaternion: [0, 0, 0, 1], fov: 60 }, // establishing (shell radius ≈12); wider fov frames the whole form
  { depth: 0.08, position: [0, 0.5, 19], quaternion: [0, 0, 0, 1], fov: 50 }, // arrival→content push
  { depth: 0.15, position: [0, 0, 13.5], quaternion: [0, 0, 0, 1], fov: 52 }, // lined up, just outside the shell
  { depth: 0.19, position: [0, 0, 3], quaternion: [0, 0, 0, 1], fov: 60 }, // punched through the aperture
  { depth: 1.0, position: [0, 0, -34], quaternion: [0, 0, 0, 1], fov: 55 }, // continued descent through the void
];

// Mutable working copy the dev panel writes into; production reads the frozen
// table above. Deep-cloned so leva edits never mutate the shipped constants.
export const liveCameraKeyframes: CameraKeyframe[] = CAMERA_KEYFRAMES.map((k) => ({
  depth: k.depth,
  position: [...k.position] as Vec3,
  quaternion: [...k.quaternion] as Quat,
  fov: k.fov,
}));

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

/** Catmull-Rom tangent (depth-domain finite difference) for one axis at knot i. */
function tangent(kfs: readonly CameraKeyframe[], i: number, axis: number): number {
  const n = kfs.length;
  const pos = (k: number): number => kfs[k]!.position[axis]!;
  const dep = (k: number): number => kfs[k]!.depth;
  if (i === 0) return (pos(1) - pos(0)) / (dep(1) - dep(0));
  if (i === n - 1) return (pos(n - 1) - pos(n - 2)) / (dep(n - 1) - dep(n - 2));
  return (pos(i + 1) - pos(i - 1)) / (dep(i + 1) - dep(i - 1));
}

function hermiteAxis(
  kfs: readonly CameraKeyframe[],
  i: number,
  depth: number,
  axis: number,
): number {
  const d0 = kfs[i]!.depth;
  const d1 = kfs[i + 1]!.depth;
  const h = d1 - d0;
  if (h <= 0) return kfs[i]!.position[axis]!;
  const t = (depth - d0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const p0 = kfs[i]!.position[axis]!;
  const p1 = kfs[i + 1]!.position[axis]!;
  const m0 = tangent(kfs, i, axis) * h; // scale depth-domain tangent to local t
  const m1 = tangent(kfs, i + 1, axis) * h;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

/** Shortest-arc quaternion slerp with a lerp fallback for near-parallel inputs. */
function slerp(a: Quat, b: Quat, t: number): [number, number, number, number] {
  let [bx, by, bz, bw] = b;
  const [ax, ay, az, aw] = a;
  let cos = ax * bx + ay * by + az * bz + aw * bw;
  if (cos < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    cos = -cos;
  }
  let wa: number;
  let wb: number;
  if (cos > 0.9995) {
    wa = 1 - t;
    wb = t;
  } else {
    const theta = Math.acos(cos);
    const sin = Math.sin(theta);
    wa = Math.sin((1 - t) * theta) / sin;
    wb = Math.sin(t * theta) / sin;
  }
  const x = ax * wa + bx * wb;
  const y = ay * wa + by * wb;
  const z = az * wa + bz * wb;
  const w = aw * wa + bw * wb;
  const len = Math.hypot(x, y, z, w) || 1;
  return [x / len, y / len, z / len, w / len];
}

function smootherLocalT(depth: number, d0: number, d1: number): number {
  if (d1 <= d0) return 0;
  const t = Math.max(0, Math.min(1, (depth - d0) / (d1 - d0)));
  return t * t * (3 - 2 * t);
}

/**
 * Sample the full camera state (position/quaternion/fov) at a depth. Position
 * is C1 across keyframes; orientation and fov ease per segment. Depths outside
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
      quaternion: [...only.quaternion] as [number, number, number, number],
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
  return {
    position: [hermiteAxis(kfs, i, dd, 0), hermiteAxis(kfs, i, dd, 1), hermiteAxis(kfs, i, dd, 2)],
    quaternion: slerp(k0.quaternion, k1.quaternion, tEase),
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
    quaternion: [...best.quaternion] as [number, number, number, number],
    fov: best.fov,
  };
}
