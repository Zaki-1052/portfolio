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
import { Color, DataTexture, RGBAFormat, Vector2, Vector3, type Texture } from 'three';
import noise from '@/shaders/noise.glsl?raw';
import shellShape from '@/shaders/shell-shape.glsl?raw';
import vert from './shaders/tissue-shell.vert.glsl?raw';
import frag from './shaders/tissue-shell.frag.glsl?raw';
import { SHELL_DEFAULTS as P } from './shell-params';

const vertexShader = `${noise}\n${shellShape}\n${vert}`;
const fragmentShader = `${noise}\n${shellShape}\n${frag}`;

// 1×1 mid-gray placeholder so the uCoilTex sampler is always bound (a null
// sampler2D warns/misbehaves on some drivers). Mid-gray = the coil field's
// neutral mean, so until SurfaceScene swaps in the baked reaction-diffusion
// texture the form renders smooth (zero relief) rather than crevice-dark.
const placeholderCoil = new DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1, RGBAFormat);
placeholderCoil.needsUpdate = true;

export const SurfaceShellMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 1,
    // -- macro form (shipping values live in shell-params.ts; the
    // tissue-preview leva panel drives these live for iteration) --
    uShapeDims: new Vector3(P.dimX, P.dimY, P.dimZ),
    uBoxiness: P.boxiness,
    uShoulderY: P.shoulderY,
    uShoulderBulge: P.shoulderBulge,
    uBaseTuck: P.baseTuck,
    uBottomFlat: P.bottomFlat,
    uCleftWidth: P.cleftWidth,
    uCleftDepth: P.cleftDepth,
    uMoundHeight: P.moundHeight,
    uGrooveRearFade: P.grooveRearFade,
    uOverhang: P.overhang,
    uSubMassPos: new Vector2(P.subMassY, P.subMassZ),
    uSubMassCos: Math.cos((P.subMassRadius * Math.PI) / 180),
    uSubMassHeight: P.subMassHeight,
    uSepFold: P.sepFold,
    uStalkPos: new Vector2(P.stalkY, P.stalkZ),
    uStalkCos: Math.cos((P.stalkRadius * Math.PI) / 180),
    uStalkHeight: P.stalkHeight,
    uFrontLift: P.frontLift,
    uProfileFlip: P.profileFlip,
    uFineAmp: P.fineAmp,
    uPleatAmp: P.pleatAmp,
    uPleatFreq: P.pleatFreq,
    uLook: 0, // 0 = crisp matte sculpture (shipping default) … 1 = soft dreamy bloom-glow
    uBaseColor: new Color('#e2c288'), // warm gold-amber (DESIGN §4 tissue register), not ivory
    uFresnelColor: new Color('#e6c47d'), // golden silhouette rim → bloom halo
    uFresnelPower: 3.5, // broad golden rim for the warm, bloomy register
    uFogColor: new Color('#34302b'),
    uFogDensity: 0.01,
    uCoilTex: placeholderCoil as Texture,
    uRDBlend: 0,
    uDissolve: 0,
    uDissolveRadius: 12,
    uDissolveEdgeColor: new Color('#f2a65a'), // warm burning edge
    uApertureDir: new Vector3(0, 0, 1), // which cap the dissolve opens; set from PLUNGE_APERTURE_DIR
  },
  vertexShader,
  fragmentShader,
  (material) => {
    // atan-heavy field math near the poles: force full float precision so
    // lower-tier GPUs don't band or speckle at mediump.
    if (material) material.precision = 'highp';
  },
);
