// src/scales/cellular/shaders/arbor-puncta.frag.glsl
// Bead glow — soft additive sprite in its own palette color, with a hot
// white core so bloom picks the brightest beads. Participates gently in the
// limb signal wave (beads glint as the crackle passes) and dims with focus
// like everything else on a non-focused member.

uniform float uGlowOpacity;
uniform float uOpacity;
uniform float uFogDensity;
uniform float uFocusBranch;
uniform float uFocusBlend;
uniform float uHoverBranch;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uPulseGain;

varying vec3 vColor;
varying float vT;
varying float vLimb;
varying float vViewDist;
varying float vShimmer;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float disc = smoothstep(1.0, 0.25, d);
  float core = smoothstep(0.45, 0.0, d);
  // Keep the hue dominant — a hot white core would launder every bead the
  // same under bloom, and the multicolor IS the point.
  vec3 col = mix(vColor, vec3(1.0), core * 0.3);
  float glow = disc * vShimmer * 1.25;

  // Glint when the member's signal wave passes.
  float wave = fract(uTime * uPulseSpeed + vLimb * 0.29 + 0.13);
  float glint = uPulseGain * smoothstep(0.07, 0.0, abs(vT - wave));
  glow *= 1.0 + glint * 0.9;

  float hasFocus = step(0.0, uFocusBranch);
  float isMine = step(abs(vLimb - uFocusBranch), 0.5);
  glow *= 1.0 - uFocusBlend * hasFocus * (1.0 - isMine) * 0.8;
  float isHover = step(abs(vLimb - uHoverBranch), 0.5) * step(0.0, uHoverBranch);
  glow *= 1.0 + isHover * 0.25;

  // Softened extinction — bright sources bloom through the mist first.
  float fogK = exp(-uFogDensity * uFogDensity * 0.35 * vViewDist * vViewDist);
  gl_FragColor = vec4(col, 1.0) * (glow * fogK * uGlowOpacity * uOpacity);
}
