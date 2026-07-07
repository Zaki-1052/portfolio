// src/scales/chromatin/coil-materials.ts
// The coil's two ShaderMaterials — drei shaderMaterial so each uniform is a
// settable instance field, raw-string composed (noise.glsl → stage body for
// the bead material's fbm grooves), exactly the arbor-trunk-material pattern.
// Consumed via `new CoilBeadMaterial()` + a mesh material prop, never
// extend() (see tissue-shell-material.ts for why). The linker material is
// additive glow; the use site sets transparent/depthWrite/blending.
import { shaderMaterial } from '@react-three/drei';
import { Color } from 'three';
import noise from '@/shaders/noise.glsl?raw';
import beadVert from './shaders/coil-bead.vert.glsl?raw';
import beadFrag from './shaders/coil-bead.frag.glsl?raw';
import linkerVert from './shaders/coil-linker.vert.glsl?raw';
import linkerFrag from './shaders/coil-linker.frag.glsl?raw';
import { COIL_DEFAULTS as D } from './coil-params';

const beadVertexShader = `${noise}\n${beadVert}`;
const beadFragmentShader = `${noise}\n${beadFrag}`;

export const CoilBeadMaterial = shaderMaterial(
  {
    uOpacity: 1,
    uTime: 0,
    uBaseColor: new Color(D.beadBaseColor),
    uFresnelColor: new Color(D.beadFresnelColor),
    uFresnelPower: D.beadFresnelPower,
    uGrooveAmp: D.grooveAmp,
    uGrooveFreq: D.grooveFreq,
    uLocusGlow: D.locusGlow,
    uDriftAmp: D.driftAmp,
    // Focus dim only — the unwind itself is CPU-rebuilt geometry (Approach
    // B), not a shader blend. CoilMesh writes these from the focus store.
    uFocusRegion: -1,
    uFocusDim: 0,
    uFocusDimStrength: D.focusDimStrength,
    uFogColor: new Color('#2b3038'), // band fog anchor; mirrored live per frame
    uFogDensity: 0.014,
  },
  beadVertexShader,
  beadFragmentShader,
  (material) => {
    if (material) material.precision = 'highp';
  },
);

export const CoilLinkerMaterial = shaderMaterial(
  {
    uOpacity: 1,
    uTime: 0,
    uColor: new Color(D.linkerColor),
    uGlowOpacity: D.linkerOpacity,
    uWaveAmp: D.linkerWaveAmp,
    uShimmerSpeed: D.shimmerSpeed,
    uFocusRegion: -1,
    uFocusDim: 0,
    uFocusDimStrength: D.focusDimStrength,
    uFogDensity: 0.014,
  },
  linkerVert,
  linkerFrag,
);
