// src/scales/tissue/atmosphere-motes.tsx
// Warm dust suspended in the approach corridor — the air between the camera
// and the form gets substance, so the descent reads as moving THROUGH an
// atmosphere rather than across a void. Positions bake once into a spherical
// shell around the form; all drift happens in the vertex stage as a pure
// function of uTime + per-point seed (deterministic, freezes under reduced —
// though the parent only mounts this under full motion anyway). Fades out
// across the plunge. One draw call.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { AdditiveBlending, Color } from 'three';
import { useDepthStore } from '@/stores/depth';
import { getAtmosphereOverride } from '@/engine/atmosphere-live-params';
import { smoothstep } from '@/utils/math';
import { BREAKTHROUGH_END, BREAKTHROUGH_START } from './breakthrough';
import vert from './shaders/atmosphere-motes.vert.glsl?raw';
import frag from './shaders/atmosphere-motes.frag.glsl?raw';

export const MOTE_OPACITY = 0.7;
const COUNT = 800;
const R_INNER = 24; // outside the form, inside the establish distance
const R_OUTER = 105;

const MotesMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 0,
    uPixelScale: 500,
    uColor: new Color('#e5c07b'),
  },
  vert,
  frag,
);

export function AtmosphereMotes() {
  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // Uniform direction × cube-root radius = even density through the shell.
      const z = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const xy = Math.sqrt(1 - z * z);
      const r = R_INNER + (R_OUTER - R_INNER) * Math.cbrt(Math.random());
      positions[i * 3 + 0] = Math.cos(a) * xy * r;
      positions[i * 3 + 1] = z * r;
      positions[i * 3 + 2] = Math.sin(a) * xy * r;
      seeds[i] = Math.random();
    }
    return { positions, seeds };
  }, []);

  const material = useMemo(() => {
    const m = new MotesMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending;
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    const o = getAtmosphereOverride();
    const fade = 1 - smoothstep(BREAKTHROUGH_START, BREAKTHROUGH_END, depth);
    material.uOpacity = (o ? o.moteOpacity : MOTE_OPACITY) * fade;
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
