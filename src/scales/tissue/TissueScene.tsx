// src/scales/tissue/TissueScene.tsx
// The first scale's 3D scene: a folded shell (vertex-displaced icosahedron
// + custom shader) with a reaction-diffusion surface-detail texture, driven by
// scroll depth. Owns the arrival→content dimming (uOpacity), the breakthrough
// dissolve, and the idle breathing loop. Scene fog/clear-color live in
// SceneAtmosphere; particles + ambient rendering are gated on full motion.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SCALES, scaleProgressFor } from '@/engine/scale-manager';
import { setAmbientRendering } from '@/engine/render-loop';
import { lerp, smoothstep } from '@/utils/math';
import { SurfaceShellMaterial } from './tissue-shell-material';
import { useReactionDiffusionWarmup } from './reaction-diffusion';
import { breakthroughProgress, dissolveAmountFor } from './breakthrough';
import { BreakthroughParticles } from './breakthrough-particles';

export function SurfaceScene() {
  const reduced = useReducedMotion();
  const rdTexture = useReactionDiffusionWarmup(reduced);

  // Instantiate the material directly (uniforms are settable instance fields);
  // dispose it when the scene unmounts.
  const material = useMemo(() => {
    const m = new SurfaceShellMaterial();
    m.side = DoubleSide;
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  // Idle breathing only while this scene is mounted and motion is full.
  useEffect(() => {
    setAmbientRendering(!reduced);
    return () => setAmbientRendering(false);
  }, [reduced]);

  // Wire the RD texture in once it exists.
  useEffect(() => {
    if (rdTexture) {
      material.uRDTexture = rdTexture;
      material.uRDBlend = 0.5;
    }
  }, [material, rdTexture]);

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;

    // Dim toward the content phase, but restore full vividness for the breakthrough.
    const prog = scaleProgressFor(depth, SCALES[0]!); // SCALES[0] = this (first) scale's band
    const dimmed = 1.0 - 0.45 * smoothstep(0.35, 0.75, prog);
    material.uOpacity = lerp(dimmed, 1.0, breakthroughProgress(depth));

    material.uDissolve = dissolveAmountFor(depth, reduced);
    material.uTime = reduced ? 0 : state.clock.elapsedTime;
  });

  return (
    <group>
      <mesh material={material}>
        {/* detail 7: the geometric rope-ridge relief facets at 6; still 1 draw call. */}
        <icosahedronGeometry args={[12, 7]} />
      </mesh>
      {!reduced && <BreakthroughParticles />}
    </group>
  );
}
