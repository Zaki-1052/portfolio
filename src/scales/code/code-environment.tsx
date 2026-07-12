// src/scales/code/code-environment.tsx
// The band's void furniture: a sparse green grid receding below the camera
// path and faint drifting motes — soft abstract dashes, explicitly NOT
// readable glyphs or code-rain (§3.10). Both are WORLD-anchored while the
// window is screen-locked, so pointer parallax and the camera's parked
// drift slide them behind the window — that relative motion is what sells
// the plateau's depth. Two draw calls total; a depth envelope drains both
// before the neighboring bands' scenes own the frame.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Mesh, type Points } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { getSceneFog } from '@/engine/scene-fog';
import { smoothstep } from '@/utils/math';
import { CodeGridMaterial, CodeMotesMaterial } from './code-window-materials';
import {
  CODE_ENVIRONMENT_DEFAULTS,
  getCodeEnvironmentOverride,
  subscribeCodeParams,
} from './code-live-params';

// Placement is authored against the band's parked camera knots
// (camera-keyframes.ts ≈ [-4.6, -31.9, -37.2] looking down-forward): the
// grid floor sits ~8.5 units below the path, the mote box wraps the
// plateau's view cone.
const GRID_POSITION: [number, number, number] = [-2, -40.5, -47];
const GRID_SIZE = 240;
const MOTES_POSITION: [number, number, number] = [-2, -34, -52];
const MOTES_SPREAD: [number, number, number] = [44, 30, 50]; // x/y/z extents
const MOTES_WRAP_HEIGHT = 30;

// The environment exists only around the band: in by the flight, gone
// before the expression band's own scene (Phase 8) owns the void.
const ENV_FADE_IN_START = 0.69;
const ENV_FADE_IN_END = 0.715;
const ENV_FADE_OUT_START = 0.87;
const ENV_FADE_OUT_END = 0.91;

/** Deterministic scatter — a tiny LCG so preview screenshots are stable. */
function scatterMotes(count: number): { positions: Float32Array; seeds: Float32Array } {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  let s = 1052; // fixed seed
  const next = (): number => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (next() - 0.5) * MOTES_SPREAD[0];
    positions[i * 3 + 1] = (next() - 0.5) * MOTES_SPREAD[1];
    positions[i * 3 + 2] = (next() - 0.5) * MOTES_SPREAD[2];
    seeds[i] = next();
  }
  return { positions, seeds };
}

export function CodeEnvironment() {
  const [env, setEnv] = useState(() => getCodeEnvironmentOverride() ?? CODE_ENVIRONMENT_DEFAULTS);
  useEffect(
    () =>
      subscribeCodeParams(() => {
        setEnv(getCodeEnvironmentOverride() ?? CODE_ENVIRONMENT_DEFAULTS);
      }),
    [],
  );

  const gridRef = useRef<Mesh>(null);
  const motesRef = useRef<Points>(null);

  const gridMaterial = useMemo(() => {
    const m = new CodeGridMaterial();
    m.transparent = true;
    m.depthWrite = false;
    return m;
  }, []);
  const motesMaterial = useMemo(() => {
    const m = new CodeMotesMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending; // faint light in the void, never occluding
    m.uWrapHeight = MOTES_WRAP_HEIGHT;
    return m;
  }, []);
  useEffect(
    () => () => {
      gridMaterial.dispose();
      motesMaterial.dispose();
    },
    [gridMaterial, motesMaterial],
  );

  const motesGeometry = useMemo(() => {
    const { positions, seeds } = scatterMotes(env.moteCount);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
    g.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    return g;
  }, [env.moteCount]);
  useEffect(() => () => motesGeometry.dispose(), [motesGeometry]);

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    const reduced = useMotionStore.getState().reduced;
    const envelope =
      smoothstep(ENV_FADE_IN_START, ENV_FADE_IN_END, depth) *
      (1 - smoothstep(ENV_FADE_OUT_START, ENV_FADE_OUT_END, depth));

    const fog = getSceneFog();
    const gridOn = envelope > 0.001 && (env.variant === 'both' || env.variant === 'grid');
    const motesOn = envelope > 0.001 && (env.variant === 'both' || env.variant === 'motes');

    if (gridRef.current) gridRef.current.visible = gridOn;
    if (motesRef.current) motesRef.current.visible = motesOn;

    if (gridOn) {
      gridMaterial.uOpacity = env.gridOpacity * envelope;
      gridMaterial.uCellSize = env.gridCellSize;
      gridMaterial.uFogColor = fog.color;
      gridMaterial.uFogDensity = fog.density;
    }
    if (motesOn) {
      motesMaterial.uOpacity = env.moteOpacity * envelope;
      motesMaterial.uDriftSpeed = env.moteDriftSpeed;
      // Frozen drift under reduced motion — the field still exists, parked.
      motesMaterial.uTime = reduced ? 0 : state.clock.elapsedTime;
      motesMaterial.uFogDensity = fog.density;
    }
  });

  return (
    <group>
      <mesh
        ref={gridRef}
        material={gridMaterial}
        position={GRID_POSITION}
        rotation-x={-Math.PI / 2}
        visible={false}
      >
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
      </mesh>
      {/* The wrap displacement moves points outside the static bounds —
          culling would blink the field at the frustum edge. */}
      <points
        ref={motesRef}
        geometry={motesGeometry}
        material={motesMaterial}
        position={MOTES_POSITION}
        frustumCulled={false}
        visible={false}
      />
    </group>
  );
}
