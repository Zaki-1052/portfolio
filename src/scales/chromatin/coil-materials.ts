// src/scales/chromatin/coil-materials.ts
// The coil's ShaderMaterials — drei shaderMaterial so each uniform is a
// settable instance field, raw-string composed (noise.glsl → stage body for
// the bead frag's organic mottle), exactly the arbor-trunk-material pattern.
// Consumed via `new CoilBeadMaterial()` + a mesh material prop, never
// extend() (see tissue-shell-material.ts for why). Only the ribbon material
// is additive glow (the use site sets transparent/depthWrite/blending); the
// thread and knobs are opaque lit layers.
import { shaderMaterial } from '@react-three/drei';
import { Color } from 'three';
import noise from '@/shaders/noise.glsl?raw';
import beadVert from './shaders/coil-bead.vert.glsl?raw';
import beadFrag from './shaders/coil-bead.frag.glsl?raw';
import threadVert from './shaders/coil-thread.vert.glsl?raw';
import threadFrag from './shaders/coil-thread.frag.glsl?raw';
import knobVert from './shaders/coil-knob.vert.glsl?raw';
import knobFrag from './shaders/coil-knob.frag.glsl?raw';
import ribbonVert from './shaders/coil-ribbon.vert.glsl?raw';
import ribbonFrag from './shaders/coil-ribbon.frag.glsl?raw';
import { COIL_DEFAULTS as D } from './coil-params';

const beadFragmentShader = `${noise}\n${beadFrag}`;

export const CoilBeadMaterial = shaderMaterial(
  {
    uOpacity: 1,
    uTime: 0,
    uBaseColor: new Color(D.beadBaseColor),
    uFresnelColor: new Color(D.beadFresnelColor),
    uFresnelPower: D.beadFresnelPower,
    uMottleAmp: D.mottleAmp,
    uRingAmp: D.ringAmp,
    uRingFreq: D.ringFreq,
    uSpecStrength: D.beadSpecStrength,
    uSpecPower: D.beadSpecPower,
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
  beadVert,
  beadFragmentShader,
  (material) => {
    if (material) material.precision = 'highp';
  },
);

// The wound thread and its cinch knobs are OPAQUE lit layers (the 5.5
// register decision) — no blending flags at the use site, fog mixes toward
// the scene color like the beads.
export const CoilThreadMaterial = shaderMaterial(
  {
    uOpacity: 1,
    uTime: 0,
    uDriftAmp: D.driftAmp,
    uColor: new Color(D.threadColor),
    uThreadEmissive: D.threadEmissive,
    uShimmerSpeed: D.shimmerSpeed,
    uFocusRegion: -1,
    uFocusDim: 0,
    uFocusDimStrength: D.focusDimStrength,
    uFogColor: new Color('#2b3038'), // band fog anchor; mirrored live per frame
    uFogDensity: 0.014,
  },
  threadVert,
  threadFrag,
);

export const CoilKnobMaterial = shaderMaterial(
  {
    uOpacity: 1,
    uTime: 0,
    uDriftAmp: D.driftAmp,
    uColor: new Color(D.knobColor),
    uEmissive: D.threadEmissive * 0.5,
    uFocusRegion: -1,
    uFocusDim: 0,
    uFocusDimStrength: D.focusDimStrength,
    uFogColor: new Color('#2b3038'), // band fog anchor; mirrored live per frame
    uFogDensity: 0.014,
  },
  knobVert,
  knobFrag,
);

export const CoilRibbonMaterial = shaderMaterial(
  {
    uOpacity: 1,
    uTime: 0,
    uColor: new Color(D.ribbonColor),
    uGlowOpacity: D.ribbonOpacity,
    uFlowSpeed: D.ribbonFlowSpeed,
    // The bloom gate: uUnwind rides the unwind blend; the arcs exist only
    // for the focused region and only once it is mostly open.
    uFocusRegion: -1,
    uUnwind: 0,
    uFogDensity: 0.014,
  },
  ribbonVert,
  ribbonFrag,
);
