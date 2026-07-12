// src/utils/quaternion.ts
// Forward quaternion rotation (camera-local → world). The projection layer
// only ever needed the inverse (screen-project.ts rotates world → camera);
// the camera-locked terminal window composes the other way — camera-local
// flight offsets pushed OUT into world space. Dependency-free tuple math
// (the math.ts foundation-layer rule), same component order as
// camera-keyframes' Quat: [x, y, z, w].

type Vec3 = readonly [number, number, number];
type Quat = readonly [number, number, number, number];

/** Rotate `v` by unit quaternion `q` via the optimized t = 2 (qᵥ × v) form. */
export function rotateByQuat(v: Vec3, q: Quat): [number, number, number] {
  const qx = q[0];
  const qy = q[1];
  const qz = q[2];
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
