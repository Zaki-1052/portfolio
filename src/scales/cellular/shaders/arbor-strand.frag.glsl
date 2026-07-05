// src/scales/cellular/shaders/arbor-strand.frag.glsl
// Ribbon strand glow — additive, premultiplied like the drift sprites so
// overlapping strands sum into light instead of hard edges. Additive layers
// can't mix toward a fog color, so fog extinguishes them with distance (the
// same convention as the drift fields). Brightness rises toward the tips.

uniform vec3 uColor;
uniform float uGlowOpacity;
uniform float uOpacity;
uniform float uFogDensity;
uniform float uFocusBranch;
uniform float uFocusBlend;
uniform float uHoverBranch;

varying float vT;
varying float vLimb;
varying float vAcross;
varying float vViewDist;

void main() {
  // Soft lens cross-profile; luminosity follows the growth parameter and
  // white-shifts toward the tips so the periphery feeds the bloom pass.
  float profile = 1.0 - vAcross * vAcross;
  float glow = profile * (0.35 + 1.05 * vT * vT);
  vec3 col = mix(uColor, vec3(1.0), 0.3 * vT);

  float hasFocus = step(0.0, uFocusBranch);
  float isMine = step(abs(vLimb - uFocusBranch), 0.5);
  glow *= 1.0 - uFocusBlend * hasFocus * (1.0 - isMine) * 0.8;
  float isHover = step(abs(vLimb - uHoverBranch), 0.5) * step(0.0, uHoverBranch);
  glow *= 1.0 + isHover * 0.3;

  float fogK = exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
  gl_FragColor = vec4(col, 1.0) * (glow * fogK * uGlowOpacity * uOpacity);
}
