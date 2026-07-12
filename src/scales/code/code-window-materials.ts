// src/scales/code/code-window-materials.ts
// The code band's ShaderMaterials — drei shaderMaterial so each uniform is a
// settable instance field (the coil-materials pattern). Consumed via
// `new CodeWindowChromeMaterial()` + a mesh material prop, never extend().
// The chrome and both environment layers are transparent (SDF-alpha edges /
// additive-quiet atmosphere); use sites set the blending flags.
import { shaderMaterial } from '@react-three/drei';
import { Color } from 'three';
import chromeVert from './shaders/window-chrome.vert.glsl?raw';
import chromeFrag from './shaders/window-chrome.frag.glsl?raw';
import gridVert from './shaders/code-grid.vert.glsl?raw';
import gridFrag from './shaders/code-grid.frag.glsl?raw';
import motesVert from './shaders/code-motes.vert.glsl?raw';
import motesFrag from './shaders/code-motes.frag.glsl?raw';
import { CODE_WINDOW_DEFAULTS as D } from './code-window-params';

export const CodeWindowChromeMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 1,
    uAspect: 1.6,
    uCornerRadius: D.cornerRadius,
    uTitleBarFrac: D.titleBarFrac,
    uBodyColor: new Color(D.bodyColor),
    uTitleBarColor: new Color(D.titleBarColor),
    uAccentColor: new Color(D.accentColor),
    uEdgeGlowStrength: D.edgeGlowStrength,
    uEdgeHighlight: D.edgeHighlight,
    uEdgeShadow: D.edgeShadow,
    uDotRadiusFrac: D.dotRadiusFrac,
    uCursorVisible: 0,
    uCursorUV: [0.085, 0.82],
    uFogColor: new Color('#1d2228'), // band fog anchor; mirrored live per frame
    uFogDensity: 0.014,
  },
  chromeVert,
  chromeFrag,
  (material) => {
    // The SDF chrome depends on clean derivatives at dpr 2 (rim, dots,
    // hairline seam) — same precision guard as the coil beads.
    if (material) material.precision = 'highp';
  },
);

export const CodeGridMaterial = shaderMaterial(
  {
    uColor: new Color(D.accentColor),
    uOpacity: 0.16,
    uCellSize: 4,
    uLineWidth: 0.012,
    uFadeCenter: [-2, -40, -47],
    uFadeRadius: 90,
    uFogColor: new Color('#1d2228'),
    uFogDensity: 0.014,
  },
  gridVert,
  gridFrag,
);

export const CodeMotesMaterial = shaderMaterial(
  {
    uTime: 0,
    uDriftSpeed: 0.35,
    uWrapHeight: 30,
    uSize: 26,
    uColor: new Color(D.accentColor),
    uOpacity: 0.1,
    uFogDensity: 0.014,
  },
  motesVert,
  motesFrag,
);
