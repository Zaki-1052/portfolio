// src/scales/protein/protein-materials.ts
// The ribbon's ShaderMaterial — drei shaderMaterial so each uniform is a
// settable instance field, raw-string composed, exactly the coil-materials /
// arbor-trunk-material pattern. Consumed via `new ProteinRibbonMaterial()` +
// a mesh material prop, never extend() (see tissue-shell-material.ts for why).
// An opaque lit layer: the ligand's glow is the band's only additive element.
import { shaderMaterial } from '@react-three/drei';
import { Color } from 'three';
import ribbonVert from './shaders/protein-ribbon.vert.glsl?raw';
import ribbonFrag from './shaders/protein-ribbon.frag.glsl?raw';
import { PROTEIN_CYAN, PROTEIN_LOOK_DEFAULTS as D } from './protein-params';

export const ProteinRibbonMaterial = shaderMaterial(
  {
    uTime: 0,
    // The reveal/exit envelope — ProteinMesh writes it per frame from depth.
    uOpacity: 1,
    uCyanKey: new Color(PROTEIN_CYAN),
    uReceptorBrightness: D.receptorBrightness,
    uGproteinBrightness: D.gproteinBrightness,
    uFresnelPower: D.fresnelPower,
    uFresnelStrength: D.fresnelStrength,
    uRimShade: D.rimShade,
    uSpecStrength: D.specStrength,
    uRmsfWarmth: D.rmsfWarmth,
    uRmsfFloor: D.rmsfFloor,
    uRmsfCeil: D.rmsfCeil,
    uBreathingAmp: D.breathingAmp,
    uBreathingFreq: D.breathingFreq,
    // Session 8 drives these from the focus store; -1 = nothing focused.
    uFocusRegion: -1,
    uFocusDim: 0,
    uFocusDimStrength: 0.65,
    uFogColor: new Color('#1e3038'), // band fog anchor; mirrored live per frame
    uFogDensity: 0.0035,
  },
  ribbonVert,
  ribbonFrag,
);
