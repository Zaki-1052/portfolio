// src/engine/post-fx.tsx
// The single merged post-processing pass for the whole descent. Order matters:
// Bloom in HDR → ToneMapping (ACES) → Noise grain + Vignette in LDR. The
// explicit ToneMapping is REQUIRED — mounting EffectComposer forces
// gl.toneMapping = NoToneMapping for its lifetime, so without it the scene is
// untonemapped.
//
// FOOTGUN — do not "fix" by passing a depth value as a prop: every effect here
// takes STATIC literal args only. A changing prop remounts the effect and, via
// the composer's children-keyed pass assembly, tears down and rebuilds the
// whole chain every frame. All depth-driven values are mutated through refs in
// the single useFrame below. This component is memo()'d with zero props so its
// element identity never changes.
import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ToneMapping, Noise, Vignette } from '@react-three/postprocessing';
import {
  BlendFunction,
  ToneMappingMode,
  type BloomEffect,
  type NoiseEffect,
  type VignetteEffect,
} from 'postprocessing';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { postFxCurveFor } from './post-fx-curves';

export const PostFX = memo(function PostFX() {
  const bloom = useRef<BloomEffect | null>(null);
  const noise = useRef<NoiseEffect | null>(null);
  const vignette = useRef<VignetteEffect | null>(null);

  useFrame(() => {
    const curve = postFxCurveFor(useDepthStore.getState().depth);
    const reduced = useMotionStore.getState().reduced;

    if (bloom.current) {
      bloom.current.intensity = curve.bloomIntensity;
      bloom.current.luminanceMaterial.threshold = curve.bloomThreshold;
    }
    if (noise.current) {
      // Reduced motion: kill the per-frame grain (its randomization is motion).
      noise.current.blendMode.opacity.value = reduced ? 0 : curve.grainOpacity;
    }
    if (vignette.current) {
      vignette.current.darkness = curve.vignetteDarkness;
    }
  });

  return (
    <EffectComposer enableNormalPass={false} multisampling={4}>
      <Bloom
        ref={bloom}
        mipmapBlur
        intensity={1.25}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Noise ref={noise} blendFunction={BlendFunction.OVERLAY} opacity={0.05} />
      <Vignette ref={vignette} eskil={false} offset={0.32} darkness={0.5} />
    </EffectComposer>
  );
});
