// src/scales/tissue/atmosphere-clouds.tsx
// A bank of wispy haze patches drifting through the approach corridor —
// mildly opaque (normal blending, unlike the additive halo/motes), so they
// genuinely veil the form as it drifts behind them. Strongest during the
// opening veil beat, thinning as the reveal clears, gone by the plunge. All
// quads live in ONE merged geometry (view-aligned in the vertex stage), so the
// whole bank is a single draw call with zero per-frame CPU work.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, Color } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getSceneFog } from '@/engine/scene-fog';
import { getAtmosphereOverride } from '@/engine/atmosphere-live-params';
import { FOG_VEIL_CLEAR_END } from '@/engine/fog-density';
import { smoothstep } from '@/utils/math';
import { BREAKTHROUGH_END, BREAKTHROUGH_START } from './breakthrough';
import noise from '@/shaders/noise.glsl?raw';
import vert from './shaders/atmosphere-clouds.vert.glsl?raw';
import frag from './shaders/atmosphere-clouds.frag.glsl?raw';

export const CLOUD_OPACITY = 0.5;
const COUNT = 10;
const R_INNER = 45; // clear of the form, inside the establish distance
const R_OUTER = 95;
const SCALE_MIN = 26;
const SCALE_MAX = 55;

const CloudsMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 0,
    uColor: new Color('#443a2e'),
  },
  vert,
  `${noise}\n${frag}`,
);

function buildCloudGeometry(): BufferGeometry {
  const positions = new Float32Array(COUNT * 4 * 3);
  const uvs = new Float32Array(COUNT * 4 * 2);
  const centers = new Float32Array(COUNT * 4 * 3);
  const params = new Float32Array(COUNT * 4 * 3);
  const index = new Uint16Array(COUNT * 6);
  const corners = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ] as const;

  for (let i = 0; i < COUNT; i++) {
    const z = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const xy = Math.sqrt(1 - z * z);
    const r = R_INNER + (R_OUTER - R_INNER) * Math.cbrt(Math.random());
    const cx = Math.cos(a) * xy * r;
    const cy = z * r;
    const cz = Math.sin(a) * xy * r;
    const scale = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * Math.random();
    const rot = Math.random() * Math.PI * 2;
    const seed = Math.random();

    for (let v = 0; v < 4; v++) {
      const vi = i * 4 + v;
      positions[vi * 3 + 0] = corners[v]![0];
      positions[vi * 3 + 1] = corners[v]![1];
      positions[vi * 3 + 2] = 0;
      uvs[vi * 2 + 0] = corners[v]![0] + 0.5;
      uvs[vi * 2 + 1] = corners[v]![1] + 0.5;
      centers[vi * 3 + 0] = cx;
      centers[vi * 3 + 1] = cy;
      centers[vi * 3 + 2] = cz;
      params[vi * 3 + 0] = scale;
      params[vi * 3 + 1] = rot;
      params[vi * 3 + 2] = seed;
    }
    index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setAttribute('uv', new BufferAttribute(uvs, 2));
  geo.setAttribute('aCenter', new BufferAttribute(centers, 3));
  geo.setAttribute('aParams', new BufferAttribute(params, 3));
  geo.setIndex(new BufferAttribute(index, 1));
  return geo;
}

export function AtmosphereClouds() {
  const reduced = useReducedMotion();
  const geometry = useMemo(buildCloudGeometry, []);
  const material = useMemo(() => {
    const m = new CloudsMaterial();
    m.transparent = true;
    m.depthWrite = false;
    return m;
  }, []);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    const o = getAtmosphereOverride();
    // Densest during the opening veil, settling to a lighter ambient presence
    // as the reveal clears, gone by the plunge.
    const veilT = 1 - smoothstep(0, FOG_VEIL_CLEAR_END * 1.5, depth);
    const plungeFade = 1 - smoothstep(BREAKTHROUGH_START, BREAKTHROUGH_END, depth);
    material.uOpacity = (o ? o.cloudOpacity : CLOUD_OPACITY) * (0.55 + 0.45 * veilT) * plungeFade;
    material.uColor = getSceneFog().color;
    material.uTime = reduced ? 0 : state.clock.elapsedTime;
  });

  // frustumCulled off: the verts are view-aligned in the shader, so culling
  // against the raw unit-quad bounds would wrongly drop the whole bank.
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
