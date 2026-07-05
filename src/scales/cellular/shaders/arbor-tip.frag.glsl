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

varying float vT;
varying float vLimb;
varying float vViewDist;
varying float vPulse;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float disc = smoothstep(1.0, 0.2, d);
  // The hottest points of the tree — white-shifted core so bloom catches them.
  float glow = disc * (0.5 + 1.1 * vT) * vPulse;
  vec3 col = mix(uColor, vec3(1.0), 0.45 * vT);

  float hasFocus = step(0.0, uFocusBranch);
  float isMine = step(abs(vLimb - uFocusBranch), 0.5);
  glow *= 1.0 - uFocusBlend * hasFocus * (1.0 - isMine) * 0.8;
  float isHover = step(abs(vLimb - uHoverBranch), 0.5) * step(0.0, uHoverBranch);
  glow *= 1.0 + isHover * 0.35;

  float fogK = exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
  gl_FragColor = vec4(col, 1.0) * (glow * fogK * uGlowOpacity * uOpacity);
}
