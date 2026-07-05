// src/engine/screen-project.ts
// Pure perspective projector: world point → CSS-pixel screen position through
// a camera pose. The annotation layer uses this with the FINAL post-parallax
// pose (camera-pose.ts mirror), so DOM labels track exactly what the GPU
// rendered — recomputing the depth sample here would drift by the parallax
// rotation. Conventions match three: camera looks down local -Z, vertical fov.
import type { Quat, Vec3 } from './camera-keyframes';

export interface CameraPoseLike {
  position: Vec3;
  quaternion: Quat;
  fov: number; // vertical, degrees
}

export interface ScreenPoint {
  /** CSS pixels from the viewport's top-left. */
  x: number;
  y: number;
  /** View-axis distance (camera space) — for size/opacity attenuation. */
  depth: number;
  /** False when the point is at/behind the camera plane. */
  visible: boolean;
}

/** Rotate `v` by the INVERSE of unit quaternion `q` (world → camera space). */
function rotateInverse(v: Vec3, q: Quat): [number, number, number] {
  // q⁻¹ = conjugate for unit quaternions; apply v' = q⁻¹ v q via the
  // optimized t = 2 (q̄ᵥ × v) form.
  const qx = -q[0];
  const qy = -q[1];
  const qz = -q[2];
  const qw = q[3];
  const tx = 2 * (qy * v[2] - qz * v[1]);
  const ty = 2 * (qz * v[0] - qx * v[2]);
  const tz = 2 * (qx * v[1] - qy * v[0]);
  return [
    v[0] + qw * tx + (qy * tz - qz * ty),
    v[1] + qw * ty + (qz * tx - qx * tz),
    v[2] + qw * tz + (qx * ty - qy * tx),
  ];
}

const NEAR = 0.1; // matches the Canvas camera

export function worldToScreen(
  point: Vec3,
  pose: CameraPoseLike,
  width: number,
  height: number,
): ScreenPoint {
  const rel: Vec3 = [
    point[0] - pose.position[0],
    point[1] - pose.position[1],
    point[2] - pose.position[2],
  ];
  const cam = rotateInverse(rel, pose.quaternion);
  const depth = -cam[2];
  if (depth <= NEAR) {
    return { x: 0, y: 0, depth, visible: false };
  }
  const tanHalf = Math.tan(((pose.fov * Math.PI) / 180) * 0.5);
  const aspect = width / height;
  const ndcX = cam[0] / depth / (tanHalf * aspect);
  const ndcY = cam[1] / depth / tanHalf;
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (1 - (ndcY * 0.5 + 0.5)) * height,
    depth,
    visible: true,
  };
}
