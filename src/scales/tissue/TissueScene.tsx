// src/scales/tissue/TissueScene.tsx
// The tissue-scale 3D scene: a folded cortex shell (vertex-displaced icosahedron
// + custom shader) with a reaction-diffusion surface-detail texture, driven by
// scroll depth. Owns the arrival→content dimming (uOpacity), the breakthrough
// dissolve, and the idle breathing loop. Scene fog/clear-color live in
// SceneAtmosphere; particles + ambient rendering are gated on full motion.
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { scaleProgressFor } from '@/engine/scale-manager';
import { setAmbientRendering } from '@/engine/render-loop';
import { lerp, smoothstep } from '@/utils/math';
import { TissueShellMaterial } from './tissue-shell-material';
import { useReactionDiffusionWarmup } from './reaction-diffusion';
import { breakthroughProgress, dissolveAmountFor } from './breakthrough';
import { BreakthroughParticles } from './breakthrough-particles';

type ShellMaterial = InstanceType<typeof TissueShellMaterial>;

export function TissueScene() {
  const matRef = useRef<ShellMaterial>(null);
  const reduced = useReducedMotion();
  const rdTexture = useReactionDiffusionWarmup(reduced);

  // Idle breathing only while this scene is mounted and motion is full.
  useEffect(() => {
    setAmbientRendering(!reduced);
    return () => setAmbientRendering(false);
  }, [reduced]);

  // Wire the RD texture in once it exists.
  useEffect(() => {
    const mat = matRef.current;
    if (mat && rdTexture) {
      mat.uRDTexture = rdTexture;
      mat.uRDBlend = 0.5;
    }
  }, [rdTexture]);

  useFrame((state) => {
    const mat = matRef.current;
    if (!mat) return;
    const depth = useDepthStore.getState().depth;

    // Dim toward the content phase, but restore full vividness for the breakthrough.
    const prog = scaleProgressFor(depth, 'tissue');
    const dimmed = 1.0 - 0.45 * smoothstep(0.35, 0.75, prog);
    mat.uOpacity = lerp(dimmed, 1.0, breakthroughProgress(depth));

    mat.uDissolve = dissolveAmountFor(depth, reduced);
    mat.uTime = reduced ? 0 : state.clock.elapsedTime;
  });

  return (
    <group>
      <mesh>
        {/* detail 6 gives smooth folds; dial against the r3f-perf baseline. */}
        <icosahedronGeometry args={[12, 6]} />
        <tissueShellMaterial ref={matRef} attach="material" side={DoubleSide} />
      </mesh>
      {!reduced && <BreakthroughParticles />}
    </group>
  );
}
