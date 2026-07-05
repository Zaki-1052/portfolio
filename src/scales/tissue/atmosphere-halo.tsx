// src/scales/tissue/atmosphere-halo.tsx
// The luminous-haze backdrop: a large camera-facing quad parked BEHIND the
// form (opposite the camera along the view axis), carrying a soft radial glow
// in the live fog color. Scene fog only tints geometry — empty space renders
// the flat clear color — so without this the establish shot is a form floating
// in dead black. The quad gives the fog somewhere to BE. The shell occludes
// its center (depth test), so the form silhouettes against the glow. Fades out
// across the plunge; from inside it sits beyond the walls and is culled by
// depth, except through the open aperture — where glow through the opening is
// exactly right. One draw call.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { AdditiveBlending, Color, Vector3, type Mesh } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getSceneFog } from '@/engine/scene-fog';
import { getAtmosphereOverride } from '@/engine/atmosphere-live-params';
import { smoothstep } from '@/utils/math';
import { BREAKTHROUGH_END, BREAKTHROUGH_START } from './breakthrough';
import noise from '@/shaders/noise.glsl?raw';
import vert from './shaders/atmosphere-halo.vert.glsl?raw';
import frag from './shaders/atmosphere-halo.frag.glsl?raw';

export const HALO_INTENSITY = 0.7;
const HALO_BACK = 45; // world units behind the form center, along the view axis
const HALO_SIZE = 170;

const HaloMaterial = shaderMaterial(
  {
    uColor: new Color('#443a2e'),
    uIntensity: 0,
    uTime: 0,
  },
  vert,
  `${noise}\n${frag}`,
);

export function AtmosphereHalo() {
  const reduced = useReducedMotion();
  const meshRef = useRef<Mesh>(null);
  const dir = useRef(new Vector3());

  const material = useMemo(() => {
    const m = new HaloMaterial();
    m.transparent = true;
    m.depthWrite = false; // glow never occludes; shell depth still culls it
    m.blending = AdditiveBlending;
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    const o = getAtmosphereOverride();
    // Full through establish/approach, gone by the time the plunge lands
    // inside (its position is also unstable once the camera nears the center).
    const fade = 1 - smoothstep(BREAKTHROUGH_START, BREAKTHROUGH_END, depth);
    const intensity = (o ? o.haloIntensity : HALO_INTENSITY) * fade;

    material.uIntensity = intensity;
    material.uColor = getSceneFog().color;
    material.uTime = reduced ? 0 : state.clock.elapsedTime;

    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.visible = intensity > 0.005;
    if (mesh.visible) {
      dir.current.copy(state.camera.position).normalize();
      mesh.position.copy(dir.current).multiplyScalar(-HALO_BACK);
      mesh.quaternion.copy(state.camera.quaternion);
    }
  });

  return (
    <mesh ref={meshRef} material={material} visible={false}>
      <planeGeometry args={[HALO_SIZE, HALO_SIZE]} />
    </mesh>
  );
}
