// src/scales/expression/signal-materials.ts
// The signal scene's ShaderMaterials — drei shaderMaterial so each uniform
// is a settable instance field (the coil-materials pattern). Consumed via
// `new SignalLineMaterial()` + a mesh material prop, never extend(). Both
// are additive glow layers: the use site sets transparent / depthWrite /
// blending, and their fog pair is mirrored live from getSceneFog() each
// frame by SignalLines.
import { shaderMaterial } from '@react-three/drei';
import { Color } from 'three';
import lineVert from './shaders/signal-line.vert.glsl?raw';
import lineFrag from './shaders/signal-line.frag.glsl?raw';
import packetVert from './shaders/signal-packet.vert.glsl?raw';
import packetFrag from './shaders/signal-packet.frag.glsl?raw';
import { SIGNAL_LOOK_DEFAULTS as D } from './signal-params';

export const SignalLineMaterial = shaderMaterial(
  {
    uColor: new Color(D.lineColor),
    uWarmColor: new Color(D.warmColor),
    uWarmT: 0,
    uGlowOpacity: D.glowOpacity,
    uOpacity: 1,
    uGrowT: 0,
    uFadeStart: D.fadeStart,
    uTime: 0,
    uFlowSpeed: 0.12,
    uPulseGain: 1,
    uTintStrength: D.tintStrength,
    uFocusChannel: -1,
    uFocusDim: 0,
    uFocusDimStrength: D.focusDimStrength,
    uHoverChannel: -1,
    uEventPulseChannel: -1,
    uEventPulseT: -1,
    uFogDensity: 0.014,
  },
  lineVert,
  lineFrag,
);

export const SignalPacketMaterial = shaderMaterial(
  {
    uColor: new Color(D.lineColor),
    uWarmColor: new Color(D.warmColor),
    uWarmT: 0,
    uOpacity: D.packetOpacity,
    uSize: D.packetSize,
    uFogDensity: 0.014,
  },
  packetVert,
  packetFrag,
);
