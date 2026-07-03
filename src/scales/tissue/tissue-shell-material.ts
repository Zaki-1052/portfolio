// src/scales/tissue/tissue-shell-material.ts
// The ridged shell's ShaderMaterial. Built with drei's shaderMaterial so
// each uniform is a settable instance field (material.uTime = …). The shared
// chunks are prepended to both stages (raw-string compose; no GLSL #include
// plugin) in dependency order: noise.glsl (snoise/fbm/fbm2) → shell-shape.glsl
// (the single height-field both stages evaluate) → the stage body. Lighting +
// fog are hand-set uniforms — a custom ShaderMaterial gets neither scene
// lights nor three's fog automatically.
//
// Consumed by `new SurfaceShellMaterial()` + a mesh `material={…}` prop (see
// SurfaceScene). NOT via extend()/a JSX intrinsic: SurfaceScene would reference
// this only in a type position, so esbuild would elide the import and the
// extend side-effect would never run ("not part of the THREE namespace").
import { shaderMaterial } from '@react-three/drei';
import { Color, DataTexture, RGBAFormat, type Texture } from 'three';
import noise from '@/shaders/noise.glsl?raw';
import shellShape from '@/shaders/shell-shape.glsl?raw';
import vert from './shaders/tissue-shell.vert.glsl?raw';
import frag from './shaders/tissue-shell.frag.glsl?raw';

const vertexShader = `${noise}\n${shellShape}\n${vert}`;
const fragmentShader = `${noise}\n${shellShape}\n${frag}`;

// 1×1 placeholder so the uRDTexture sampler is always bound (a null sampler2D
// warns/misbehaves on some drivers). Never sampled until uRDBlend > 0, at which
// point SurfaceScene has swapped in the real reaction-diffusion texture.
const placeholderRD = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, RGBAFormat);
placeholderRD.needsUpdate = true;

export const SurfaceShellMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 1,
    uBaseColor: new Color('#e2c288'), // warm gold-amber (DESIGN §4 tissue register), not ivory
    uFresnelColor: new Color('#e6c47d'), // golden silhouette rim → bloom halo
    uFresnelPower: 3.5, // broad golden rim for the warm, bloomy register
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
  (material) => {
    // atan-heavy field math near the poles: force full float precision so
    // lower-tier GPUs don't band or speckle at mediump.
    if (material) material.precision = 'highp';
  },
);
