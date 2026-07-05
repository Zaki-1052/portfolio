// src/scales/cellular/arbor-glow-material.ts
// The emissive periphery's two ShaderMaterials: ribbon strands (billboarded
// quads with real width taper) and tip sprites (points). Separate vertex
// stages by necessity (triangles vs gl_PointSize) and deliberately separate
// small fragment stages too — a shared frag branching between gl_PointCoord
// and a ribbon varying would read one or the other in a not-taken path,
// exactly the undefined-behavior family the shell's brown-ring bug came
// from. Both render additive / depthWrite:false / premultiplied like the
// drift fields; the use site sets those blending flags.
import { shaderMaterial } from '@react-three/drei';
import { Color } from 'three';
import strandVert from './shaders/arbor-strand.vert.glsl?raw';
import strandFrag from './shaders/arbor-strand.frag.glsl?raw';
import tipVert from './shaders/arbor-tip.vert.glsl?raw';
import tipFrag from './shaders/arbor-tip.frag.glsl?raw';
import punctaVert from './shaders/arbor-puncta.vert.glsl?raw';
import punctaFrag from './shaders/arbor-puncta.frag.glsl?raw';
import { ARBOR_DEFAULTS as D } from './arbor-params';

export const ArborStrandMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 1,
    uColor: new Color(D.strandColor),
    uGlowOpacity: D.strandOpacity,
    uWidthScale: D.strandWidth,
    uSway: D.swayAmp,
    uPulseSpeed: D.pulseSpeed,
    uPulseGain: D.pulseGain,
    uFogDensity: 0.014,
    uFocusBranch: -1,
    uFocusBlend: 0,
    uHoverBranch: -1,
  },
  strandVert,
  strandFrag,
);

export const ArborTipMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 1,
    uColor: new Color(D.strandColor),
    uGlowOpacity: D.strandOpacity,
    uTipSize: D.tipSize,
    uSway: D.swayAmp,
    uPulseSpeed: D.pulseSpeed,
    uPulseGain: D.pulseGain,
    uPixelScale: 500, // drawingBufferHeight/2, written per frame
    uFogDensity: 0.014,
    uFocusBranch: -1,
    uFocusBlend: 0,
    uHoverBranch: -1,
  },
  tipVert,
  tipFrag,
);

// The bead layer: per-vertex palette color (aColor → vColor), so one draw
// call carries the whole multicolor string-of-lights.
export const ArborPunctaMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 1,
    uGlowOpacity: D.strandOpacity,
    uPunctaSize: D.punctaSize,
    uSway: D.swayAmp,
    uPulseSpeed: D.pulseSpeed,
    uPulseGain: D.pulseGain,
    uPixelScale: 500, // drawingBufferHeight/2, written per frame
    uFogDensity: 0.014,
    uFocusBranch: -1,
    uFocusBlend: 0,
    uHoverBranch: -1,
  },
  punctaVert,
  punctaFrag,
);
