// src/scales/tissue/flag-flight-material.ts
// The flag card's ShaderMaterial (drei shaderMaterial → each uniform is a
// settable instance field, like tissue-shell-material.ts). Small and self-
// contained: a textured, billboarded plane with an optional cloth-ripple
// (uWaveAmp) and the same hand-rolled exp2 fog the shell uses — a custom
// ShaderMaterial gets neither three's automatic fog nor texture color decode,
// so both are done here explicitly.
//
// Color pipeline: the scene renders through EffectComposer, which treats shader
// output as LINEAR and encodes to sRGB at its final pass (this is why the shell
// outputs its already-linearized `new Color(hex)` uniforms raw). The flag's
// texels are sRGB bytes drawn on a 2D canvas, so we decode sRGB→linear here and
// output linear, matching the shell. The flag texture is therefore uploaded
// with colorSpace = NoColorSpace (see flag-flight.tsx) so three does not also
// touch it.
import { shaderMaterial } from '@react-three/drei';
import { Color, DataTexture, RGBAFormat, type Texture } from 'three';

// 1×1 fully-transparent placeholder so the sampler is always bound and the flag
// is simply invisible until the rasterized SVG lands (no gray flash).
const placeholderMap = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAFormat);
placeholderMap.needsUpdate = true;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWaveAmp;
  uniform float uWaveFreq;
  varying vec2 vUv;
  varying float vViewDist;

  void main() {
    vUv = uv;
    vec3 p = position;
    // Cloth ripple: out-of-plane (local +z) travelling sine along the card's
    // width, drifting in time, tapering toward the leading edge so it reads as
    // fabric rather than a rigid warp. uWaveAmp = 0 → a perfectly flat card.
    float phase = p.x * uWaveFreq + uTime * 3.0;
    float taper = 0.35 + 0.65 * vUv.x;
    p.z += uWaveAmp * sin(phase) * taper;
    vec4 worldPos = modelMatrix * vec4(p, 1.0);
    vViewDist = length(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  varying vec2 vUv;
  varying float vViewDist;

  vec3 srgbToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
  }

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float alpha = tex.a * uOpacity;
    if (alpha < 0.01) discard;
    vec3 color = srgbToLinear(tex.rgb);
    // Same exp2 fog as tissue-shell.frag.glsl so the card recedes into the void
    // on exactly the same curve as the form around it.
    float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
    color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));
    gl_FragColor = vec4(color, alpha);
  }
`;

export const FlagFlightMaterial = shaderMaterial(
  {
    uMap: placeholderMap as Texture,
    uOpacity: 0, // starts hidden; the flight envelope drives it
    uTime: 0,
    uWaveAmp: 0, // flat by default; the ripple toggle raises it
    uWaveFreq: 4,
    uFogColor: new Color('#34302b'),
    uFogDensity: 0.014,
  },
  vertexShader,
  fragmentShader,
);
