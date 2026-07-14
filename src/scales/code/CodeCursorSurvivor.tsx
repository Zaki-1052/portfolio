// src/scales/code/CodeCursorSurvivor.tsx
// Cursor relay, renderer #3: the block cursor that OUTLIVES the window (§4).
// It activates at the farewell hold's end and freezes its world position at
// that instant — so as the window recedes and dissolves, the cursor visibly
// detaches and is left behind, alone in the void, blinking across the band
// boundary. It becomes the expression scale's signal origin; the position is
// mirrored into code-cursor-state.ts for Phase 8. Scrubbing back above the
// threshold hands the cursor back to the window (HTML/shader renderers) and
// unfreezes. One draw call; a camera-billboarded quad.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, type Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3 } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { TERMINAL_BEAT_DEFAULTS, liveTerminalBeatParams } from './terminal-beats';
import { CODE_WINDOW_STANDOFF, windowLockedRect } from './code-window-pose';
import { CODE_WINDOW_DEFAULTS } from './code-window-params';
import { getCodeWindowOverride } from './code-live-params';
import { CURSOR_BLINK_PERIOD_S } from './CodeWindowFrame';
import { setCodeCursorState } from './code-cursor-state';

// Where the cursor sits inside the window when it detaches — the exit
// prompt's seat, low in the left half of the body (fractions of the locked
// half-extents).
const DETACH_OFFSET_X = -0.55; // × halfW
const DETACH_OFFSET_Y = -0.2; // × halfH

// Character-cell proportions relative to the locked half-height.
const CELL_WIDTH_FRAC = 0.032;
const CELL_HEIGHT_FRAC = 0.052;

export function CodeCursorSurvivor() {
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        // Pushed past the shared Bloom threshold so the lone survivor reads
        // as a light source in the emptying void.
        color: new Color('#98c379').multiplyScalar(1.4),
        transparent: true,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const frozen = useRef({
    active: false,
    position: new Vector3(),
    width: 0.1,
    height: 0.2,
  });
  const axis = useRef(new Vector3());

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    const reduced = useMotionStore.getState().reduced;
    const p = import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;
    const mesh = meshRef.current;
    if (!mesh) return;

    const active = depth >= p.farewellHoldEnd;
    if (!active) {
      if (frozen.current.active) {
        frozen.current.active = false;
        setCodeCursorState(0, 0, 0, 0, 0, false);
      }
      mesh.visible = false;
      return;
    }

    const camera = state.camera as PerspectiveCamera;
    if (!frozen.current.active) {
      // Freeze NOW: the cursor's seat inside the still-flat window at the
      // instant the dissolve begins — computed from the same pure rect the
      // window and HTML use, at this camera's pose.
      const look = getCodeWindowOverride() ?? CODE_WINDOW_DEFAULTS;
      const rect = windowLockedRect(
        camera.fov,
        state.size.width / state.size.height,
        CODE_WINDOW_STANDOFF,
        look.fillFraction,
      );
      axis.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
      frozen.current.position
        .copy(camera.position)
        .addScaledVector(axis.current, CODE_WINDOW_STANDOFF);
      axis.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
      frozen.current.position.addScaledVector(axis.current, DETACH_OFFSET_X * rect.halfW);
      axis.current.set(0, 1, 0).applyQuaternion(camera.quaternion);
      frozen.current.position.addScaledVector(axis.current, DETACH_OFFSET_Y * rect.halfH);
      frozen.current.width = CELL_WIDTH_FRAC * rect.halfH;
      frozen.current.height = CELL_HEIGHT_FRAC * rect.halfH;
      frozen.current.active = true;
    }

    // Custody transfer: at the band boundary the expression scene's
    // SignalOriginNode renders the SAME frozen point/size/blink (the mirror
    // gate — it shows exactly where this hides), so the survivor yields the
    // visual while the state write below keeps feeding the adopting reader.
    // Rewinding under 0.86 flips this back on with zero pop.
    mesh.visible = depth < p.dissolveEnd;
    mesh.position.copy(frozen.current.position);
    mesh.scale.set(frozen.current.width, frozen.current.height, 1);
    // Billboard: a screen-space artifact, always facing the viewer.
    mesh.quaternion.copy(camera.quaternion);

    // The same xterm rhythm as every other renderer in the relay; static
    // under reduced motion.
    const blinkOn =
      reduced || state.clock.elapsedTime % CURSOR_BLINK_PERIOD_S < CURSOR_BLINK_PERIOD_S * 0.5;
    material.opacity = blinkOn ? 1 : 0;

    const fp = frozen.current.position;
    setCodeCursorState(fp.x, fp.y, fp.z, frozen.current.width, frozen.current.height, true);
  });

  return (
    <mesh ref={meshRef} material={material} visible={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
