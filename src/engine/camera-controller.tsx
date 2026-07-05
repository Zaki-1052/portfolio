// src/engine/camera-controller.tsx
// Drives the live camera from scroll depth every rendered frame. Reads the
// stores imperatively (no React re-render); the frame itself is guaranteed by
// render-loop.ts under frameloop="demand". Reduced motion swaps smooth
// sampling for nearest-keyframe snaps (instant cuts). Reads the mutable
// liveCameraKeyframes so dev leva edits take effect; in production that array
// equals the baked CAMERA_KEYFRAMES.
//
// Pointer parallax rides on top as a ROTATION-ONLY post-multiply (±~1.7° yaw,
// ±~1.3° pitch) — never a positional offset; the finale beat skims the ridge
// field with zero clearance. The spring keeps invalidating only until it
// settles, so the demand loop goes quiet at rest. Off under reduced motion
// and while the overture owns the camera.
import { useEffect, useRef } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { useIntroStore } from '@/stores/intro';
import {
  INTRO_KEYFRAMES,
  liveCameraKeyframes,
  liveReducedAnchorKeyframes,
  sampleCamera,
  sampleNearestKeyframe,
} from './camera-keyframes';
import {
  PARALLAX_MAX_PITCH,
  PARALLAX_MAX_YAW,
  createSpring,
  isSettled,
  resetSpring,
  stepSpring,
} from './pointer-parallax';

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);

export function CameraController(): null {
  const spring = useRef(createSpring());
  const target = useRef({ x: 0, y: 0 });
  const qTmp = useRef(new Quaternion());

  // Pointer target: normalized viewport position → drift angles. The canvas
  // is pointer-events:none, so the listener lives on window.
  useEffect(() => {
    const onPointerMove = (e: PointerEvent): void => {
      if (useMotionStore.getState().reduced) return;
      target.current.x = ((e.clientX / window.innerWidth) * 2 - 1) * PARALLAX_MAX_YAW;
      target.current.y = ((e.clientY / window.innerHeight) * 2 - 1) * PARALLAX_MAX_PITCH;
      invalidate();
    };
    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  useFrame(({ camera }, delta) => {
    const depth = useDepthStore.getState().depth;
    const reduced = useMotionStore.getState().reduced;
    const intro = useIntroStore.getState();
    // Until the overture lands, the camera flies the push-in track by
    // introProgress instead of scroll depth (scroll is locked at 0 anyway).
    // Reduced motion never enters the push phase, so no reduced branch there.
    // After the landing: reduced motion snaps between the anchor beats only —
    // cutting through all ~9 spiral knots would read as a slideshow.
    const introActive = intro.phase !== 'done';
    const s = introActive
      ? sampleCamera(intro.introProgress, INTRO_KEYFRAMES)
      : reduced
        ? sampleNearestKeyframe(depth, liveReducedAnchorKeyframes)
        : sampleCamera(depth, liveCameraKeyframes);

    camera.position.set(s.position[0], s.position[1], s.position[2]);
    camera.quaternion.set(s.quaternion[0], s.quaternion[1], s.quaternion[2], s.quaternion[3]);

    if (reduced || introActive) {
      resetSpring(spring.current);
    } else {
      const t = target.current;
      // Clamp dt: after a long demand-mode gap the exact form has already
      // arrived — a huge dt is fine mathematically, but capping keeps the
      // drift-in readable when frames resume.
      stepSpring(spring.current, t.x, t.y, Math.min(delta, 0.1));
      qTmp.current.setFromAxisAngle(Y_AXIS, -spring.current.x);
      camera.quaternion.multiply(qTmp.current);
      qTmp.current.setFromAxisAngle(X_AXIS, -spring.current.y);
      camera.quaternion.multiply(qTmp.current);
      if (!isSettled(spring.current, t.x, t.y)) invalidate();
    }

    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - s.fov) > 1e-3) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
