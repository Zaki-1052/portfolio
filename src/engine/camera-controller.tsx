// src/engine/camera-controller.tsx
// Drives the live camera from scroll depth every rendered frame. Reads the
// stores imperatively (no React re-render); the frame itself is guaranteed by
// render-loop.ts under frameloop="demand". Reduced motion swaps smooth
// sampling for nearest-keyframe snaps (instant cuts). Reads the mutable
// liveCameraKeyframes so dev leva edits take effect; in production that array
// equals the baked CAMERA_KEYFRAMES.
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { liveCameraKeyframes, sampleCamera, sampleNearestKeyframe } from './camera-keyframes';

export function CameraController(): null {
  useFrame(({ camera }) => {
    const depth = useDepthStore.getState().depth;
    const reduced = useMotionStore.getState().reduced;
    const s = reduced
      ? sampleNearestKeyframe(depth, liveCameraKeyframes)
      : sampleCamera(depth, liveCameraKeyframes);

    camera.position.set(s.position[0], s.position[1], s.position[2]);
    camera.quaternion.set(s.quaternion[0], s.quaternion[1], s.quaternion[2], s.quaternion[3]);

    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - s.fov) > 1e-3) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
