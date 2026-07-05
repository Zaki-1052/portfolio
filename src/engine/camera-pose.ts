// src/engine/camera-pose.ts
// Module-level mirror of the FINAL camera pose — position, orientation
// (after the focus blend AND the parallax post-multiply), and fov — written
// by CameraController at the end of its useFrame. The annotation layer
// projects world anchors through this, so DOM labels sit exactly where the
// GPU drew their limbs; a version counter lets pollers skip work on idle
// frames. Same pattern as scene-fog.ts (data module, no component import).
import type { Quat, Vec3 } from './camera-keyframes';

export interface CameraPose {
  position: Vec3;
  quaternion: Quat;
  fov: number;
  /** Bumped on every write — DOM writers compare and skip idle frames. */
  version: number;
}

const pose: {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  fov: number;
  version: number;
} = {
  position: [0, 0, 26],
  quaternion: [0, 0, 0, 1],
  fov: 50,
  version: 0,
};

export function setCameraPose(
  px: number,
  py: number,
  pz: number,
  qx: number,
  qy: number,
  qz: number,
  qw: number,
  fov: number,
): void {
  pose.position[0] = px;
  pose.position[1] = py;
  pose.position[2] = pz;
  pose.quaternion[0] = qx;
  pose.quaternion[1] = qy;
  pose.quaternion[2] = qz;
  pose.quaternion[3] = qw;
  pose.fov = fov;
  pose.version++;
}

export function getCameraPose(): CameraPose {
  return pose;
}
