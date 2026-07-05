// src/scales/tissue/atmosphere-shafts.tsx
// Light shafts, two moments in one merged bank (single draw call):
//   · three EXTERIOR beams raking down through the establish haze — they give
//     the opening veil a light source and fade out by mid-approach;
//   · one INTERIOR beam aligned to the plunge aperture — as the cap dissolves,
//     light visibly pours through the opening into the cavern, then fades as
//     the transit haze settles.
// Beams are axial billboards (vertex stage), authored as fixed constants —
// deterministic composition, not per-visit randomness.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getAtmosphereOverride } from '@/engine/atmosphere-live-params';
import { FOG_INTERIOR_PEAK, FOG_INTERIOR_SETTLE } from '@/engine/fog-density';
import { smoothstep } from '@/utils/math';
import { BREAKTHROUGH_END, BREAKTHROUGH_START, PLUNGE_APERTURE_DIR } from './breakthrough';
import noise from '@/shaders/noise.glsl?raw';
import vert from './shaders/atmosphere-shafts.vert.glsl?raw';
import frag from './shaders/atmosphere-shafts.frag.glsl?raw';

export const SHAFT_INTENSITY = 0.42;

interface Beam {
  origin: [number, number, number];
  dir: [number, number, number]; // normalized in build
  length: number;
  width: number;
  seed: number;
  group: 0 | 1; // 0 exterior · 1 interior
}

const AD = PLUNGE_APERTURE_DIR;
const BEAMS: Beam[] = [
  // Exterior: steep rakes down through the establish space, angled apart so
  // at least one reads broadside from every orbit beat.
  { origin: [45, 75, 30], dir: [-0.25, -1, -0.15], length: 130, width: 14, seed: 0.13, group: 0 },
  { origin: [-30, 70, 60], dir: [0.15, -1, -0.3], length: 120, width: 10, seed: 0.47, group: 0 },
  { origin: [10, 80, -45], dir: [-0.05, -1, 0.22], length: 140, width: 18, seed: 0.82, group: 0 },
  // Interior: enters at the aperture and pushes into the cavern along the
  // plunge axis.
  {
    origin: [AD[0] * 11.5, AD[1] * 11.5, AD[2] * 11.5],
    dir: [-AD[0], -AD[1], -AD[2]],
    length: 17,
    width: 7,
    seed: 0.31,
    group: 1,
  },
];

const ShaftsMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacityOut: 0,
    uOpacityIn: 0,
    uColor: new Color('#e6c88c'), // light itself: paler gold than the surface
  },
  vert,
  `${noise}\n${frag}`,
);

function buildShaftGeometry(): BufferGeometry {
  const n = BEAMS.length;
  const positions = new Float32Array(n * 4 * 3);
  const uvs = new Float32Array(n * 4 * 2);
  const origins = new Float32Array(n * 4 * 3);
  const dirs = new Float32Array(n * 4 * 3);
  const params = new Float32Array(n * 4 * 3);
  const groups = new Float32Array(n * 4);
  const index = new Uint16Array(n * 6);
  const corners = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ] as const;

  BEAMS.forEach((b, i) => {
    const dl = Math.hypot(b.dir[0], b.dir[1], b.dir[2]);
    for (let v = 0; v < 4; v++) {
      const vi = i * 4 + v;
      positions[vi * 3 + 0] = 0; // unused — the shader rebuilds from attributes
      positions[vi * 3 + 1] = 0;
      positions[vi * 3 + 2] = 0;
      uvs[vi * 2 + 0] = corners[v]![0];
      uvs[vi * 2 + 1] = corners[v]![1];
      origins.set(b.origin, vi * 3);
      dirs.set([b.dir[0] / dl, b.dir[1] / dl, b.dir[2] / dl], vi * 3);
      params.set([b.length, b.width, b.seed], vi * 3);
      groups[vi] = b.group;
    }
    index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  });

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setAttribute('uv', new BufferAttribute(uvs, 2));
  geo.setAttribute('aOrigin', new BufferAttribute(origins, 3));
  geo.setAttribute('aDir', new BufferAttribute(dirs, 3));
  geo.setAttribute('aParams', new BufferAttribute(params, 3));
  geo.setAttribute('aGroup', new BufferAttribute(groups, 1));
  geo.setIndex(new BufferAttribute(index, 1));
  return geo;
}

export function AtmosphereShafts() {
  const reduced = useReducedMotion();
  const geometry = useMemo(buildShaftGeometry, []);
  const material = useMemo(() => {
    const m = new ShaftsMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending;
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
    const intensity = o ? o.shaftIntensity : SHAFT_INTENSITY;
    // Exterior beams belong to the far veil — gone by mid-approach, before
    // the camera gets close enough to see their flatness.
    material.uOpacityOut = intensity * (1 - smoothstep(0.05, 0.12, depth));
    // Interior beam rises as the aperture opens, holds through the transit,
    // and drains with the interior haze.
    material.uOpacityIn =
      intensity *
      smoothstep(BREAKTHROUGH_START, BREAKTHROUGH_END, depth) *
      (1 - smoothstep(FOG_INTERIOR_PEAK, FOG_INTERIOR_SETTLE, depth));
    material.uTime = reduced ? 0 : state.clock.elapsedTime;
  });

  // frustumCulled off: verts are rebuilt in the shader from beam attributes,
  // so culling against the degenerate raw bounds would drop the whole bank.
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
