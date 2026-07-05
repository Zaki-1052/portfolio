// src/scales/cellular/arbor-trunk-material.ts
// The solid limbs' ShaderMaterial — drei shaderMaterial so each uniform is a
// settable instance field, raw-string composed (noise.glsl → stage body),
// exactly the tissue-shell-material pattern. Consumed via
// `new ArborTrunkMaterial()` + a mesh material prop, never extend()
// (see tissue-shell-material.ts for why).
import { shaderMaterial } from '@react-three/drei';
import { Color } from 'three';
import noise from '@/shaders/noise.glsl?raw';
import vert from './shaders/arbor-trunk.vert.glsl?raw';
import frag from './shaders/arbor-trunk.frag.glsl?raw';
import { ARBOR_DEFAULTS as D } from './arbor-params';

const vertexShader = `${noise}\n${vert}`;
const fragmentShader = `${noise}\n${frag}`;

export const ArborTrunkMaterial = shaderMaterial(
  {
    uOpacity: 1,
    uBaseColor: new Color(D.baseColor),
    uTipColor: new Color(D.tipColor),
    uFresnelColor: new Color(D.fresnelColor),
    uFresnelPower: D.fresnelPower,
    uEmissiveStrength: D.emissiveStrength,
    uReliefAmp: D.reliefAmp,
    uReliefFreq: D.reliefFreq,
    uFogColor: new Color('#232c40'), // band fog anchor; mirrored live per frame
    uFogDensity: 0.014,
    uFocusBranch: -1,
    uFocusBlend: 0,
    uHoverBranch: -1,
    uHubGlowA: new Color(D.hubGlowA),
    uHubGlowB: new Color(D.hubGlowB),
    uHubGlowStrength: D.hubGlowStrength,
    uHubBump: D.hubBump,
    uSheathColor: new Color(D.sheathColor),
    uSheathAmount: D.sheathAmount,
  },
  vertexShader,
  fragmentShader,
  (material) => {
    if (material) material.precision = 'highp';
  },
);
