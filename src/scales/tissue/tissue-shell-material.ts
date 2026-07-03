// src/scales/tissue/tissue-shell-material.ts
// The folded-cortex shell's ShaderMaterial. Built with drei's shaderMaterial so
// each uniform is a settable instance field (material.uTime = …). The shared
// noise.glsl is prepended to both stages (raw-string compose; no GLSL #include
// plugin). Lighting + fog are hand-set uniforms — a custom ShaderMaterial gets
// neither scene lights nor three's fog automatically.
//
// Consumed by `new TissueShellMaterial()` + a mesh `material={…}` prop (see
// TissueScene). NOT via extend()/a JSX intrinsic: TissueScene would reference
// this only in a type position, so esbuild would elide the import and the
// extend side-effect would never run ("not part of the THREE namespace").
import { shaderMaterial } from '@react-three/drei';
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
    uBaseColor: new Color('#7e5230'), // warm tan-brown matte (lit gyri read; sulci darken via AO)
    uFresnelColor: new Color('#e5c07b'), // gold rim → bloom source
    uFresnelPower: 3.0, // soft silhouette glow (accent, not the whole surface)
    uFogColor: new Color('#34302b'),
    uFogDensity: 0.01,
    uRDTexture: placeholderRD as Texture,
    uRDBlend: 0,
    uDissolve: 0,
    uDissolveRadius: 12,
    uDissolveEdgeColor: new Color('#f2a65a'), // warm→magenta burning edge
  },
  vertexShader,
  fragmentShader,
);
