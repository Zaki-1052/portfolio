// src/engine/camera-controller.tsx
// Drives the live camera from scroll depth every rendered frame. Reads the
// stores imperatively (no React re-render); the frame itself is guaranteed by
// render-loop.ts under frameloop="demand". Reduced motion swaps smooth
// sampling for nearest-keyframe snaps (instant cuts). Reads the mutable
// liveCameraKeyframes so dev leva edits take effect; in production that array
// equals the baked CAMERA_KEYFRAMES.
//
// Composition order per frame:
//   1. depth-driven sample (or intro track / reduced anchors);
//   2. focus blend — click-to-focus carries the sample toward a limb pose
//      (400ms tween on focusBlend; the held pose exp-eases so switching
//      branches glides instead of popping; real scrolling releases it);
//   3. pointer parallax as a ROTATION-ONLY post-multiply (±~1.7° yaw,
//      ±~1.3° pitch) — never a positional offset; the finale beat skims the
//      ridge field with zero clearance;
//   4. the FINAL pose is mirrored into camera-pose.ts for the DOM
//      annotation projector.
import { useEffect, useRef } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { gsap } from 'gsap';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { useIntroStore } from '@/stores/intro';
import { shouldReleaseFocus, useBranchFocusStore } from '@/stores/branch-focus';
import { useCoilFocusStore } from '@/stores/coil-focus';
import {
  INTRO_KEYFRAMES,
  liveCameraKeyframes,
  liveReducedAnchorKeyframes,
  sampleCamera,
  sampleNearestKeyframe,
  type CameraSample,
} from './camera-keyframes';
import { blendCameraSample, focusPoseFor, regionFocusPoseFor } from './camera-focus';
import { setCameraPose } from './camera-pose';
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

const FOCUS_TWEEN_S = 0.4; // DESIGN §6: the focus pivot beat
const HELD_POSE_OMEGA = 8; // exp-smoothing rate for branch-switch glides

export function CameraController(): null {
  const spring = useRef(createSpring());
  const target = useRef({ x: 0, y: 0 });
  const qTmp = useRef(new Quaternion());
  const heldPose = useRef<{ valid: boolean; pose: CameraSample }>({
    valid: false,
    pose: { position: [0, 0, 0], quaternion: [0, 0, 0, 1], fov: 50 },
  });
  const heldRegionPose = useRef<{ valid: boolean; pose: CameraSample }>({
    valid: false,
    pose: { position: [0, 0, 0], quaternion: [0, 0, 0, 1], fov: 50 },
  });
  const focusTween = useRef<gsap.core.Tween | null>(null);

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

  // Focus pivot: tween the blend whenever the focused branch changes.
  // Reduced motion cuts instantly (no tween).
  useEffect(() => {
    const unsubscribe = useBranchFocusStore.subscribe(
      (s) => s.focusedBranch,
      (branch) => {
        focusTween.current?.kill();
        const store = useBranchFocusStore.getState();
        if (useMotionStore.getState().reduced) {
          store.setFocusBlend(branch ? 1 : 0);
          invalidate();
          return;
        }
        const proxy = { t: store.focusBlend };
        focusTween.current = gsap.to(proxy, {
          t: branch ? 1 : 0,
          duration: FOCUS_TWEEN_S,
          ease: 'power2.inOut',
          onUpdate: () => {
            useBranchFocusStore.getState().setFocusBlend(proxy.t);
            invalidate();
          },
        });
      },
    );
    return () => {
      unsubscribe();
      focusTween.current?.kill();
    };
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
    let s = introActive
      ? sampleCamera(intro.introProgress, INTRO_KEYFRAMES)
      : reduced
        ? sampleNearestKeyframe(depth, liveReducedAnchorKeyframes)
        : sampleCamera(depth, liveCameraKeyframes);

    // --- Focus blend (before parallax). ---
    const focus = useBranchFocusStore.getState();
    if (!introActive && (focus.focusedBranch !== null || focus.focusBlend > 1e-4)) {
      // Real scrolling releases the focus — the scrub always wins.
      if (focus.focusedBranch !== null && shouldReleaseFocus(depth, focus.focusDepth)) {
        focus.setFocusedBranch(null, depth);
      }
      const held = heldPose.current;
      const branch = useBranchFocusStore.getState().focusedBranch;
      if (branch !== null) {
        const targetPose = focusPoseFor(branch);
        if (!held.valid) {
          held.pose = targetPose;
          held.valid = true;
        } else {
          // Exp-ease the held pose toward the (possibly switched) target so
          // A→B refocusing glides; keep invalidating until it settles.
          const k = 1 - Math.exp(-HELD_POSE_OMEGA * Math.min(delta, 0.1));
          held.pose = blendCameraSample(held.pose, targetPose, k);
          const dx = held.pose.position[0] - targetPose.position[0];
          const dy = held.pose.position[1] - targetPose.position[1];
          const dz = held.pose.position[2] - targetPose.position[2];
          if (dx * dx + dy * dy + dz * dz > 1e-6) invalidate();
          else held.pose = targetPose;
        }
      }
      if (held.valid) {
        const blend = reduced ? (branch !== null ? 1 : 0) : focus.focusBlend;
        s = blendCameraSample(s, held.pose, blend);
      }
      if (branch === null && focus.focusBlend < 1e-4) held.valid = false;
    }

    // --- Region focus (third band) — same held-pose composition, but the
    // blend IS the unwind blend: the geometry opening and the camera pivot
    // are one gesture, tween-owned by CoilMesh (which also owns the
    // scroll-release rule). Region switches ride its release-then-focus
    // sequencing — the blend passes through 0 exactly when the held pose
    // swaps, so the swap can never pop. ---
    const coil = useCoilFocusStore.getState();
    if (!introActive && (coil.focusedRegion !== null || coil.unwindBlend > 1e-4)) {
      const held = heldRegionPose.current;
      const region = coil.focusedRegion;
      if (region !== null) {
        const targetPose = regionFocusPoseFor(region);
        if (!held.valid) {
          held.pose = targetPose;
          held.valid = true;
        } else {
          const k = 1 - Math.exp(-HELD_POSE_OMEGA * Math.min(delta, 0.1));
          held.pose = blendCameraSample(held.pose, targetPose, k);
          const dx = held.pose.position[0] - targetPose.position[0];
          const dy = held.pose.position[1] - targetPose.position[1];
          const dz = held.pose.position[2] - targetPose.position[2];
          if (dx * dx + dy * dy + dz * dz > 1e-6) invalidate();
          else held.pose = targetPose;
        }
      }
      if (held.valid) {
        const blend = reduced ? (region !== null ? 1 : 0) : coil.unwindBlend;
        s = blendCameraSample(s, held.pose, blend);
      }
      if (region === null && coil.unwindBlend < 1e-4) held.valid = false;
    }

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

    // Mirror the FINAL pose (focus + parallax applied) for the DOM projector.
    setCameraPose(
      camera.position.x,
      camera.position.y,
      camera.position.z,
      camera.quaternion.x,
      camera.quaternion.y,
      camera.quaternion.z,
      camera.quaternion.w,
      s.fov,
    );
    // Priority -1: R3F stable-sorts useFrame subscribers, so the camera pose
    // is FINAL before any default-priority subscriber runs — the code band's
    // screen-locked window reads state.camera directly with zero frame lag
    // (and the halo's old tolerated 1-frame lag is gone too). Negative
    // priority never trips R3F's manual-render mode (that's priority > 0;
    // the EffectComposer at priority 1 still owns rendering).
  }, -1);

  return null;
}
