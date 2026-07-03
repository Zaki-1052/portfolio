// src/scales/tissue/tissue-shell-material.ts
// The folded-cortex shell's ShaderMaterial. Built with drei's shaderMaterial so
// uniforms are typed props and settable instance fields (matRef.current.uTime =
// …). The shared noise.glsl is prepended to both stages (raw-string compose; no
// GLSL #include plugin). Lighting + fog are hand-set uniforms — a custom
// ShaderMaterial receives neither scene lights nor three's fog automatically.
import { shaderMaterial } from '@react-three/drei';
import { extend, type ThreeElement } from '@react-three/fiber';
import { Color, DataTexture, RGBAFormat, type Texture } from 'three';
import noise from '@/shaders/noise.glsl?raw';
import vert from './shaders/tissue-shell.vert.glsl?raw';
import frag from './shaders/tissue-shell.frag.glsl?raw';

const vertexShader = `${noise}\n${vert}`;
const fragmentShader = `${noise}\n${frag}`;

// 1×1 placeholder so the uRDTexture sampler is always bound (a null sampler2D
// warns/misbehaves on some drivers). Never sampled until uRDBlend > 0, at which
// point TissueScene has swapped in the real reaction-diffusion texture.
const placeholderRD = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, RGBAFormat);
placeholderRD.needsUpdate = true;

export const TissueShellMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 1,
    uBaseColor: new Color('#6e3d24'), // warm brown matte
    uFresnelColor: new Color('#e5c07b'), // gold rim → bloom source
    uFresnelPower: 2.6,
    uFogColor: new Color('#34302b'),
    uFogDensity: 0.02,
    uRDTexture: placeholderRD as Texture,
    uRDBlend: 0,
    uDissolve: 0,
    uDissolveRadius: 12,
    uDissolveEdgeColor: new Color('#f2a65a'), // warm→magenta burning edge
  },
  vertexShader,
  fragmentShader,
);

extend({ TissueShellMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    tissueShellMaterial: ThreeElement<typeof TissueShellMaterial>;
  }
}
