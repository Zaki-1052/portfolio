// src/scales/tissue/atmosphere-motes.tsx
// Drifting particle fields, one shared shader ("drift field"), two moments:
//   · AtmosphereMotes — warm dust in the approach corridor, so the descent
//     reads as moving THROUGH an atmosphere rather than across a void;
//   · AtmosphereEmbers — sparse warm sparks rising inside the cavern during
//     the transit (they appear with the breakthrough, drain with the haze).
// Positions bake once into a spherical shell; all drift happens in the vertex
// stage as a pure function of uTime + per-point seed. One draw call each; the
// parent mounts them only under full motion.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { AdditiveBlending, Color } from 'three';
import { useDepthStore } from '@/stores/depth';
import { getAtmosphereOverride, type AtmosphereParams } from '@/engine/atmosphere-live-params';
import { FOG_INTERIOR_PEAK, FOG_INTERIOR_SETTLE } from '@/engine/fog-density';
import { smoothstep } from '@/utils/math';
import { BREAKTHROUGH_END, BREAKTHROUGH_START } from './breakthrough';
import vert from './shaders/atmosphere-motes.vert.glsl?raw';
import frag from './shaders/atmosphere-motes.frag.glsl?raw';

export const MOTE_OPACITY = 0.7;
export const EMBER_OPACITY = 1.0;

const DriftMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 0,
    uPixelScale: 500,
    uColor: new Color('#e5c07b'),
    uFadeNear: [6, 18],
    uFadeFar: [90, 150],
    uSize: [0.5, 0.6],
    uWobble: 1.6,
    uRise: 0,
    uRiseRange: 0,
  },
  vert,
  frag,
);

export interface DriftConfig {
  count: number;
  rInner: number;
  rOuter: number;
  color: string;
  size: readonly [number, number];
  wobble: number;
  rise: number;
  riseRange: number;
  fadeNear: readonly [number, number];
  fadeFar: readonly [number, number];
  opacityAt: (depth: number, o: AtmosphereParams | null) => number;
}

const DUST: DriftConfig = {
  count: 800,
  rInner: 24, // outside the form, inside the establish distance
  rOuter: 105,
  color: '#e5c07b',
  size: [0.5, 0.6],
  wobble: 1.6,
  rise: 0,
  riseRange: 0,
  fadeNear: [6, 18],
  fadeFar: [90, 150],
  // Fades out across the plunge.
  opacityAt: (depth, o) =>
    (o ? o.moteOpacity : MOTE_OPACITY) *
    (1 - smoothstep(BREAKTHROUGH_START, BREAKTHROUGH_END, depth)),
};

const EMBERS: DriftConfig = {
  count: 110,
  rInner: 1.5, // inside the cavern, clear of the camera's transit line
  rOuter: 8.5,
  color: '#f2a65a',
  size: [0.22, 0.4],
  wobble: 0.55,
  rise: 0.35,
  riseRange: 6,
  fadeNear: [0.8, 2.2],
  fadeFar: [24, 40],
  // Appears with the breakthrough, drains with the interior haze.
  opacityAt: (depth, o) =>
    (o ? o.emberOpacity : EMBER_OPACITY) *
    smoothstep(BREAKTHROUGH_START, BREAKTHROUGH_END, depth) *
    (1 - smoothstep(FOG_INTERIOR_PEAK, FOG_INTERIOR_SETTLE, depth)),
};

// Exported for reuse: the arbor band mounts its own rose-tinted fields.
export function DriftField({ config }: { config: DriftConfig }) {
  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(config.count * 3);
    const seeds = new Float32Array(config.count);
    for (let i = 0; i < config.count; i++) {
      // Uniform direction × cube-root radius = even density through the shell.
      const z = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const xy = Math.sqrt(1 - z * z);
      const r = config.rInner + (config.rOuter - config.rInner) * Math.cbrt(Math.random());
      positions[i * 3 + 0] = Math.cos(a) * xy * r;
      positions[i * 3 + 1] = z * r;
      positions[i * 3 + 2] = Math.sin(a) * xy * r;
      seeds[i] = Math.random();
    }
    return { positions, seeds };
  }, [config]);

  const material = useMemo(() => {
    const m = new DriftMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending;
    m.uColor = new Color(config.color);
    m.uFadeNear = config.fadeNear as [number, number];
    m.uFadeFar = config.fadeFar as [number, number];
    m.uSize = config.size as [number, number];
    m.uWobble = config.wobble;
    m.uRise = config.rise;
    m.uRiseRange = config.riseRange;
    return m;
  }, [config]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    material.uOpacity = config.opacityAt(depth, getAtmosphereOverride());
    material.uTime = state.clock.elapsedTime;
    // Matches three's own point size attenuation scale (½ buffer height).
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

export function AtmosphereMotes() {
  return <DriftField config={DUST} />;
}

export function AtmosphereEmbers() {
  return <DriftField config={EMBERS} />;
}
