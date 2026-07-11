// src/scales/chromatin/coil-atmosphere.tsx
// The band's water medium — four suspended layers around the coil, all
// swaying on the ONE shared current (coil-current.ts) so the band reads as
// a single body of water:
//   · silt — fine dim particulate through the whole volume (the 5.6 retune
//     of the old twinkle motes: smaller, denser, buoyant);
//   · bokeh — sparse large defocused discs near the lens, strong parallax;
//   · bubbles — a few bright-rimmed pockets climbing wrapped conveyors;
//   · veils — deep-teal haze quads far behind the coil (normal blending).
// Layer configs derive from coil-water-params (dev override channel); a
// panel write re-derives them, which re-scatters the fields — fine for
// tuning, unreachable in production. Reduced motion mounts ONLY the veils,
// frozen (the additive particle layers follow the decorative-particles
// convention and stay unmounted).
import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { AdditiveBlending, Color } from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useDepthStore } from '@/stores/depth';
import { DriftField, type DriftConfig } from '@/scales/tissue/atmosphere-motes';
import { CloudBank, type CloudBankConfig } from '@/scales/tissue/atmosphere-clouds';
import { smoothstep } from '@/utils/math';
import bubbleVert from './shaders/coil-bubbles.vert.glsl?raw';
import bubbleFrag from './shaders/coil-bubbles.frag.glsl?raw';
import { COIL_CURRENT_DEFAULTS, currentDir } from './coil-current';
import {
  COIL_WATER_DEFAULTS,
  getCoilWaterOverride,
  subscribeCoilWater,
  type CoilWaterParams,
} from './coil-water-params';
import { COIL_ORIGIN } from './coil-params';

// Layer anchors, as offsets from the cluster origin: silt and bubbles fill
// the cluster's own volume; the bokeh shell shifts toward the band's camera
// track so a handful of discs always hang near the lens; the veils sit
// behind the coil as backdrop.
const BOKEH_OFFSET: readonly [number, number, number] = [2, 1, 2];
const VEIL_OFFSET: readonly [number, number, number] = [0, 0, -12];

const BubbleMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 0,
    uPixelScale: 500,
    uColor: new Color('#bfeaf4'),
    uFadeNear: [0.8, 2.2],
    uFadeFar: [22, 34],
    uSize: [0.1, 0.12],
    uRise: 0.5,
    uRiseRange: 18,
    uWobble: 0.35,
    uCurrentDir: [1, 0],
    uCurrentAmp: 0,
    uCurrentFreq: 0,
    uCurrentK: 0,
  },
  bubbleVert,
  bubbleFrag,
);

function bubbleWindow(depth: number): number {
  return smoothstep(0.46, 0.49, depth) * (1 - smoothstep(0.55, 0.585, depth));
}

function CoilBubbles({ water }: { water: CoilWaterParams }) {
  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(water.bubbleCount * 3);
    const seeds = new Float32Array(water.bubbleCount);
    for (let i = 0; i < water.bubbleCount; i++) {
      // Even density through a cylinder around the cluster (√ radius), the
      // conveyor's wrap band supplying the vertical spread.
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 8;
      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = Math.sin(a) * r;
      seeds[i] = Math.random();
    }
    return { positions, seeds };
  }, [water.bubbleCount]);

  const material = useMemo(() => {
    const m = new BubbleMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending;
    m.uRise = water.bubbleRise;
    m.uCurrentDir = currentDir(water.currentDirDeg);
    m.uCurrentAmp = water.currentAmp;
    m.uCurrentFreq = water.currentFreq;
    m.uCurrentK = COIL_CURRENT_DEFAULTS.k;
    return m;
  }, [water]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    material.uOpacity = water.bubbleOpacity * bubbleWindow(depth);
    material.uTime = state.clock.elapsedTime;
    material.uPixelScale = state.gl.domElement.height * 0.5;
  });

  return (
    <points material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
    </points>
  );
}

interface CoilAtmosphereProps {
  /** World placement of the medium; the preview overrides it (same
   *  convention as CoilMesh). */
  origin?: readonly [number, number, number];
}

export function CoilAtmosphere({ origin = COIL_ORIGIN }: CoilAtmosphereProps) {
  const reduced = useReducedMotion();

  // Dev override channel — same pattern as CoilMesh's params subscription.
  const [water, setWater] = useState<CoilWaterParams>(
    () => getCoilWaterOverride() ?? COIL_WATER_DEFAULTS,
  );
  useEffect(
    () => subscribeCoilWater(() => setWater(getCoilWaterOverride() ?? COIL_WATER_DEFAULTS)),
    [],
  );

  const current = useMemo(
    () => ({
      dir: currentDir(water.currentDirDeg),
      amp: water.currentAmp,
      freq: water.currentFreq,
      k: COIL_CURRENT_DEFAULTS.k,
    }),
    [water],
  );

  // Fine suspended silt — the volume-filling particulate. Buoyant sway
  // (slow rise + wobble + current), dim and desaturated: presence, not
  // twinkle. First "water" signal inside the transition's fill beat. The
  // wide shell keeps particles in frame from the region-focus poses too.
  const silt = useMemo<DriftConfig>(
    () => ({
      count: water.siltCount,
      rInner: 2.5,
      rOuter: 26,
      color: '#7fb4d8',
      palette: ['#6fa3c4', '#7fb4d8', '#6fc7d8', '#7c93b8'],
      size: [0.12, 0.2],
      wobble: 0.7,
      rise: 0.015,
      riseRange: 6,
      fadeNear: [1.2, 3],
      fadeFar: [26, 48],
      current,
      opacityAt: (depth) =>
        water.siltOpacity * smoothstep(0.455, 0.475, depth) * (1 - smoothstep(0.55, 0.585, depth)),
    }),
    [water, current],
  );

  // Sparkle — the band's twinkling star-points (the pre-5.6 vibe, sparser):
  // the old mote recipe with a per-point brightness pulse, riding the same
  // current so the stars belong to the water.
  const sparkle = useMemo<DriftConfig>(
    () => ({
      count: water.sparkleCount,
      rInner: 2.5,
      rOuter: 22,
      color: '#7fb4e8',
      palette: ['#61afef', '#7fb4e8', '#8d94cf', '#6fc7d8'],
      size: [0.26, 0.42],
      wobble: 0.55,
      rise: 0.05,
      riseRange: 4,
      fadeNear: [1.2, 3],
      fadeFar: [26, 48],
      twinkle: 0.85,
      current,
      opacityAt: (depth) =>
        water.sparkleOpacity *
        smoothstep(0.455, 0.475, depth) *
        (1 - smoothstep(0.55, 0.585, depth)),
    }),
    [water, current],
  );

  // Near-field bokeh — a handful of big soft defocused discs by the lens.
  // The tight fadeFar keeps all but the near few invisible, so the layer
  // reads as foreground parallax, never a wall of circles.
  const bokeh = useMemo<DriftConfig>(
    () => ({
      count: water.bokehCount,
      rInner: 0,
      rOuter: 26,
      color: '#8fc4de',
      size: [0.9, 0.7],
      wobble: 0.9,
      rise: 0.02,
      riseRange: 5,
      fadeNear: [0.5, 2],
      fadeFar: [10, 18],
      maxPx: water.bokehMaxPx,
      rimGlow: 0.45,
      current,
      opacityAt: (depth) =>
        water.bokehOpacity * smoothstep(0.46, 0.49, depth) * (1 - smoothstep(0.55, 0.585, depth)),
    }),
    [water, current],
  );

  // Drifting veils — deep-teal haze far behind the coil, calmer than the
  // approach corridor's bank (half-speed churn) and pinned to its own color
  // rather than the live fog (they ARE the deeper water behind everything).
  const veils = useMemo<CloudBankConfig>(
    () => ({
      count: 6,
      rInner: 14,
      rOuter: 30,
      scaleMin: 18,
      scaleMax: 34,
      color: water.wispColor,
      timeScale: 0.5,
      current,
      opacityAt: (depth) =>
        water.wispOpacity * smoothstep(0.45, 0.48, depth) * (1 - smoothstep(0.55, 0.585, depth)),
    }),
    [water, current],
  );

  return (
    <group position={[origin[0], origin[1], origin[2]]}>
      {/* Veils mount under reduced motion too (frozen via CloudBank's own
          reduced check) — a static backdrop, pixel-stable. */}
      <group position={[VEIL_OFFSET[0], VEIL_OFFSET[1], VEIL_OFFSET[2]]}>
        <CloudBank config={veils} />
      </group>
      {!reduced && (
        <>
          <DriftField config={silt} />
          <DriftField config={sparkle} />
          <CoilBubbles water={water} />
          <group position={[BOKEH_OFFSET[0], BOKEH_OFFSET[1], BOKEH_OFFSET[2]]}>
            <DriftField config={bokeh} />
          </group>
        </>
      )}
    </group>
  );
}
