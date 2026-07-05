// src/scales/cellular/shaders/arbor-tip.frag.glsl
// Tip sprite glow — soft circular falloff (drift-sprite convention),
// additive/premultiplied, extinguished by distance fog. The brightest
// points of the whole tree: these are what the bloom pass catches.

uniform vec3 uColor;
uniform float uGlowOpacity;
uniform float uOpacity;
uniform float uFogDensity;
uniform float uFocusBranch;
uniform float uFocusBlend;
uniform float uHoverBranch;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uPulseGain; // forced 0 under reduced motion

varying float vT;
varying float vLimb;
varying float vViewDist;
varying float vPulse;
varying float vSeed;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float disc = smoothstep(1.0, 0.2, d);
  // The hottest points of the tree — white-shifted core so bloom catches them.
  float glow = disc * (0.5 + 1.1 * vT) * vPulse;
  vec3 col = mix(uColor, vec3(1.0), 0.14 * vT);

  // The tip FIRES when its limb's signal wave arrives (same phase as the
  // strand crackle — the discharge sparks rather than swelling).
  float wave = fract(uTime * uPulseSpeed + vLimb * 0.29 + 0.13);
  float spark = 0.5 + 0.5 * sin(uTime * 43.0 + vSeed * 57.0);
  float fire = uPulseGain * smoothstep(0.09, 0.0, abs(vT - wave)) * spark;
  glow *= 1.0 + fire * 1.8;
  col = mix(col, vec3(1.0), min(fire, 0.45));

  float hasFocus = step(0.0, uFocusBranch);
  float isMine = step(abs(vLimb - uFocusBranch), 0.5);
  glow *= 1.0 - uFocusBlend * hasFocus * (1.0 - isMine) * 0.8;
  float isHover = step(abs(vLimb - uHoverBranch), 0.5) * step(0.0, uHoverBranch);
  glow *= 1.0 + isHover * 0.35;

  // Softened extinction — bright sources bloom through the mist first.
  float fogK = exp(-uFogDensity * uFogDensity * 0.35 * vViewDist * vViewDist);
  gl_FragColor = vec4(col, 1.0) * (glow * fogK * uGlowOpacity * uOpacity);
}
