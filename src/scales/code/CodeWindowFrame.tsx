// src/scales/code/CodeWindowFrame.tsx
// The terminal window mesh — the band's hero object. Owns the whole pose
// composition per frame, all from pure functions of depth:
//   locked pose = camera.position + forward·STANDOFF (screen-locked; the
//   camera runs at priority -1, so reading state.camera here is the FINAL
//   post-parallax pose with zero frame lag), offset by windowFlightOffset
//   along the camera-local axes during the arrival/exit flight. The HTML
//   interior re-derives the same rect from the same pure functions + the
//   camera-pose mirror, so canvas and DOM can never disagree.
// Also owns two per-frame rules (the "mesh owns the release rule" coil
// convention): the pager's scroll-away release, and the shader cursor's
// flight-only window in the three-renderer cursor relay.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type Mesh, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { shouldReleaseTerminalFocus, useTerminalFocusStore } from '@/stores/terminal-focus';
import { getSceneFog } from '@/engine/scene-fog';
import {
  TERMINAL_BEAT_DEFAULTS,
  liveTerminalBeatParams,
  windowOpacityFor,
  windowPosePhase,
} from './terminal-beats';
import { CODE_WINDOW_STANDOFF, windowFlightOffset, windowLockedRect } from './code-window-pose';
import { CodeWindowChromeMaterial } from './code-window-materials';
import { CODE_WINDOW_DEFAULTS, applyWindowLook } from './code-window-params';
import { getCodeWindowOverride, subscribeCodeParams } from './code-live-params';

/** The xterm blink rhythm — 530 ms on / 530 ms off, the same 1.06 s period
 *  the CSS intro-blink keyframes use, so the relay's renderers agree. */
export const CURSOR_BLINK_PERIOD_S = 1.06;

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

export function CodeWindowFrame() {
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(() => {
    const m = new CodeWindowChromeMaterial();
    m.transparent = true; // SDF alpha edge + the dissolve envelope
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  // Dev-panel look edits (null in production — the subscription never fires).
  useEffect(
    () =>
      subscribeCodeParams(() => {
        applyWindowLook(material, getCodeWindowOverride() ?? CODE_WINDOW_DEFAULTS);
      }),
    [material],
  );

  const right = useRef(new Vector3());
  const up = useRef(new Vector3());
  const fwd = useRef(new Vector3());
  const qTilt = useRef(new Quaternion());

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    const reduced = useMotionStore.getState().reduced;
    const p = import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;

    // The pager release runs UNCONDITIONALLY, so a fast scroll-past that
    // unmounts the band and returns self-heals on the first frame back.
    const focus = useTerminalFocusStore.getState();
    if (focus.openProject !== null && shouldReleaseTerminalFocus(depth, focus.openDepth)) {
      focus.setOpenProject(null, depth);
    }

    const mesh = meshRef.current;
    if (!mesh) return;
    const opacity = windowOpacityFor(depth, p);
    mesh.visible = opacity > 0.001;
    if (!mesh.visible) return;

    // Reduced motion: no flight — the window appears settled and the opacity
    // envelope is the whole arrival/exit story (§3.11).
    const phase = reduced ? 1 : windowPosePhase(depth, p);
    const camera = state.camera as PerspectiveCamera;
    const look = getCodeWindowOverride() ?? CODE_WINDOW_DEFAULTS;
    const rect = windowLockedRect(
      camera.fov,
      state.size.width / state.size.height,
      CODE_WINDOW_STANDOFF,
      look.fillFraction,
    );
    const off = windowFlightOffset(phase);

    right.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
    up.current.set(0, 1, 0).applyQuaternion(camera.quaternion);
    fwd.current.set(0, 0, -1).applyQuaternion(camera.quaternion);

    // posOffset is camera-local [+X, +Y, +Z] in half-height units; its -Z
    // flight term pushes the window deeper than the standoff.
    mesh.position
      .copy(camera.position)
      .addScaledVector(fwd.current, CODE_WINDOW_STANDOFF - off.posOffset[2] * rect.halfH)
      .addScaledVector(right.current, off.posOffset[0] * rect.halfH)
      .addScaledVector(up.current, off.posOffset[1] * rect.halfH);

    // Face the camera exactly at lock (plane +Z back along the view axis),
    // tilted about its own local axes during the flight. All three terms are
    // exactly zero at phase 1 (the no-pop invariant), so this IS the locked
    // pose there — no branch, no seam.
    mesh.quaternion.copy(camera.quaternion);
    if (off.yawRad !== 0) {
      qTilt.current.setFromAxisAngle(Y_AXIS, off.yawRad);
      mesh.quaternion.multiply(qTilt.current);
    }
    if (off.pitchRad !== 0) {
      qTilt.current.setFromAxisAngle(X_AXIS, off.pitchRad);
      mesh.quaternion.multiply(qTilt.current);
    }
    if (off.rollRad !== 0) {
      qTilt.current.setFromAxisAngle(Z_AXIS, off.rollRad);
      mesh.quaternion.multiply(qTilt.current);
    }

    const scale = 1 + off.scaleDelta;
    mesh.scale.set(rect.halfW * 2 * scale, rect.halfH * 2 * scale, 1);

    material.uAspect = rect.halfW / rect.halfH;
    material.uOpacity = opacity;
    material.uTime = state.clock.elapsedTime;

    // Cursor relay, renderer #1: the shader cursor exists during the flight
    // ONLY — the CSS cursor owns the prompt the moment the HTML interior is
    // live (bootStart), and the survivor mesh owns everything past the
    // farewell hold. Static (no blink) under reduced motion.
    const flightBeat = depth < p.bootStart;
    const blinkOn =
      reduced || state.clock.elapsedTime % CURSOR_BLINK_PERIOD_S < CURSOR_BLINK_PERIOD_S * 0.5
        ? 1
        : 0;
    material.uCursorVisible = flightBeat ? blinkOn : 0;

    const fog = getSceneFog();
    material.uFogColor = fog.color;
    material.uFogDensity = fog.density;
  });

  return (
    <mesh ref={meshRef} material={material} visible={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
