// src/scales/expression/SignalOriginNode.tsx
// The signal origin — the surviving cursor, adopted. Renders the mirror
// image of CodeCursorSurvivor's custody gate: visible only from the band
// boundary (dissolveEnd) onward, at the SAME resolved position/size and on
// the SAME clock/blink formula, so the crossing is seamless in both scroll
// directions (position, footprint, and blink phase all continuous). The
// warm bookend lerps its light toward amber at the very bottom. One draw
// call; a camera-billboarded quad, pushed past the shared Bloom threshold —
// the lone light source of the emptying void.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, type Mesh, MeshBasicMaterial } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { TERMINAL_BEAT_DEFAULTS, liveTerminalBeatParams } from '@/scales/code/terminal-beats';
import { CURSOR_BLINK_PERIOD_S } from '@/scales/code/CodeWindowFrame';
import {
  EXPRESSION_BEAT_DEFAULTS,
  liveExpressionBeatParams,
  warmBookendT,
} from './expression-beats';
import { resolveSignalNodeSize, resolveSignalOrigin } from './signal-geometry';
import { SIGNAL_LOOK_DEFAULTS } from './signal-params';
import { getExpressionLookOverride } from './expression-live-params';

/** The survivor's bloom push — the same ×1.4 so the adopted cursor reads as
 *  the same light source, not a new object. */
const BLOOM_PUSH = 1.4;

export function SignalOriginNode() {
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(SIGNAL_LOOK_DEFAULTS.lineColor).multiplyScalar(BLOOM_PUSH),
        transparent: true,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const baseColor = useRef(new Color());
  const warmColor = useRef(new Color());

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    const reduced = useMotionStore.getState().reduced;
    const mesh = meshRef.current;
    if (!mesh) return;

    // The custody gate mirrors CodeCursorSurvivor's EXACT threshold — both
    // read the same live terminal beat params, so a dev-tuned dissolveEnd
    // moves the crossing for both sides at once.
    const tp = import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;
    if (depth < tp.dissolveEnd) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    const origin = resolveSignalOrigin(depth);
    const size = resolveSignalNodeSize(depth);
    mesh.position.set(origin[0], origin[1], origin[2]);
    mesh.scale.set(size.width, size.height, 1);
    // Billboard: a screen-space artifact, always facing the viewer.
    mesh.quaternion.copy(state.camera.quaternion);

    // The amber bookend — the node's light warms with the whole register.
    const ep = import.meta.env.DEV ? liveExpressionBeatParams : EXPRESSION_BEAT_DEFAULTS;
    const look = getExpressionLookOverride() ?? SIGNAL_LOOK_DEFAULTS;
    const warm = warmBookendT(depth, ep);
    baseColor.current.set(look.lineColor);
    warmColor.current.set(look.warmColor);
    material.color.lerpColors(baseColor.current, warmColor.current, warm * 0.7);
    material.color.multiplyScalar(BLOOM_PUSH);

    // The same xterm rhythm as every renderer in the cursor relay — same
    // clock, same period, so the handoff never skips a blink. Static under
    // reduced motion.
    const blinkOn =
      reduced || state.clock.elapsedTime % CURSOR_BLINK_PERIOD_S < CURSOR_BLINK_PERIOD_S * 0.5;
    material.opacity = blinkOn ? 1 : 0;
  });

  return (
    <mesh ref={meshRef} material={material} visible={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
