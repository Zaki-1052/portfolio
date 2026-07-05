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
import { useIntroStore } from '@/stores/intro';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { scaleProgressFor } from '@/engine/scale-manager';
import { setAmbientRendering } from '@/engine/render-loop';
import { getSceneFog } from '@/engine/scene-fog';
import { getAtmosphereOverride } from '@/engine/atmosphere-live-params';
import { lookFor } from '@/engine/look-curve';
import { lerp, smoothstep } from '@/utils/math';
import { SurfaceShellMaterial } from './tissue-shell-material';
import { useCoilTexture } from './reaction-diffusion';
import { applyShellParams } from './shell-params';
import { getShellParamsOverride } from './shell-live-params';
import { PLUNGE_APERTURE_DIR, breakthroughProgress, dissolveAmountFor } from './breakthrough';
import { BreakthroughParticles } from './breakthrough-particles';
import { AtmosphereHalo } from './atmosphere-halo';
import { AtmosphereEmbers, AtmosphereMotes } from './atmosphere-motes';
import { AtmosphereClouds } from './atmosphere-clouds';
import { AtmosphereShafts } from './atmosphere-shafts';
import { StalkMesh } from './stalk-mesh';

export function SurfaceScene() {
  const reduced = useReducedMotion();
  const coilTexture = useCoilTexture();

  // Instantiate the material directly (uniforms are settable instance fields);
  // dispose it when the scene unmounts.
  const material = useMemo(() => {
    const m = new SurfaceShellMaterial();
    m.side = DoubleSide;
    // Aim the dissolve aperture at the incoming flight path (a constant of the
    // baked camera table, so set once).
    m.uApertureDir.set(PLUNGE_APERTURE_DIR[0], PLUNGE_APERTURE_DIR[1], PLUNGE_APERTURE_DIR[2]);
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  // Idle breathing only while this scene is mounted and motion is full.
  useEffect(() => {
    setAmbientRendering(!reduced);
    return () => setAmbientRendering(false);
  }, [reduced]);

  // Wire the baked coil texture in once it exists (until then the shell
  // renders smooth on the mid-gray placeholder). The bake landing is also the
  // overture's honest scene-ready signal — the push-in never reveals a
  // half-sculpted form.
  useEffect(() => {
    if (coilTexture) {
      material.uCoilTex = coilTexture;
      material.uRDBlend = 0.5;
      useIntroStore.getState().markSceneReady();
    }
  }, [material, coilTexture]);

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;

    // Dev-only macro-form override (shell-dev-tools leva panel). Null in
    // production — one check per frame.
    const shellOverride = getShellParamsOverride();
    if (shellOverride) applyShellParams(material, shellOverride);

    // Fully vivid through the approach journey; dimmed while the hero text
    // plays in front of the still-outside form; restored to full vividness
    // for the plunge (and the interior transit after it — clamped at 1).
    const prog = scaleProgressFor(depth, 'tissue');
    const dimmed = 1 - 0.45 * smoothstep(0.05, 0.35, prog);
    material.uOpacity = lerp(dimmed, 1, breakthroughProgress(depth));

    material.uDissolve = dissolveAmountFor(depth, reduced);
    material.uTime = reduced ? 0 : state.clock.elapsedTime;

    // Look curve: dreamy golden register at establish → crisp by the hover
    // (the stalk companion mirrors uLook from this material each frame).
    const atmo = getAtmosphereOverride();
    material.uLook = atmo ? lookFor(depth, atmo.lookEstablish, atmo.lookCrisp) : lookFor(depth);

    // Match the shell's hand-rolled exp2 fog to the live scene fog —
    // SceneAtmosphere's useFrame runs first (mounted earlier in the Canvas).
    const fog = getSceneFog();
    material.uFogColor = fog.color;
    material.uFogDensity = fog.density;
  });

  return (
    <group>
      <mesh material={material}>
        {/* IcosahedronGeometry detail is LINEAR: tris = 20·(detail+1)². detail 64
            ≈ 84.5k tris (edge ≈0.19u); the baked coil texture's displacement
            channel is band-limited in texel space, so the mesh never tears.
            Still 1 draw call. */}
        <icosahedronGeometry args={[12, 64]} />
        {/* The stalk rides as a child so it tracks any parent transform. */}
        <StalkMesh shellMaterial={material} />
      </mesh>
      {/* The void-fillers: glow backdrop + haze patches (always — static
          atmosphere, frozen under reduced); drifting dust, light shafts,
          interior embers, and the burst (full motion only). */}
      <AtmosphereHalo />
      <AtmosphereClouds />
      {!reduced && <AtmosphereMotes />}
      {!reduced && <AtmosphereShafts />}
      {!reduced && <AtmosphereEmbers />}
      {!reduced && <BreakthroughParticles />}
    </group>
  );
}
