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
uniform float uPulseSpeed;
uniform float uPulseGain; // forced 0 under reduced motion
uniform float uTime;

varying float vT;
varying float vLimb;
varying float vAcross;
varying float vViewDist;
varying float vSeed;
varying float vLevel;

void main() {
  // Soft lens cross-profile; luminosity follows the growth parameter and
  // white-shifts toward the tips so the periphery feeds the bloom pass.
  float profile = 1.0 - vAcross * vAcross;
  float glow = profile * (0.35 + 1.05 * vT * vT);
  vec3 col = mix(uColor, vec3(1.0), 0.10 * vT);

  // Attachment ramp: strands GROW out of their member — sheath-toned where
  // they join, full luminance out in the free reaches. The floor stays
  // fairly bright: a too-dim additive ribbon over the dark reads as a murky
  // translucent film between the members, worse than the seam it fixed.
  float attach = smoothstep(0.4, 2.2, vLevel);
  glow *= mix(0.5, 1.0, attach);
  col = mix(uColor * 0.9, col, mix(0.6, 1.0, attach));

  // Signal CRACKLE: the wave sweeping root→tip flickers at high frequency
  // and sputters (hard on/off segments) instead of gliding as a smooth
  // brightness — electricity, not a lamp on a dimmer. White-hot at the front.
  float wave = fract(uTime * uPulseSpeed + vLimb * 0.29 + 0.13);
  float front = smoothstep(0.09, 0.0, abs(vT - wave));
  float flicker = 0.55 + 0.45 * sin(uTime * 47.0 + vSeed * 61.0 + vT * 90.0);
  float sputter = step(0.35, fract(sin((vSeed + floor(uTime * 24.0)) * 78.233) * 43758.5453));
  float pulse = uPulseGain * front * flicker * (0.55 + 0.45 * sputter);
  glow *= 1.0 + pulse;
  col = mix(col, vec3(1.0), min(0.6 * front * flicker, 0.4));

  float hasFocus = step(0.0, uFocusBranch);
  float isMine = step(abs(vLimb - uFocusBranch), 0.5);
  glow *= 1.0 - uFocusBlend * hasFocus * (1.0 - isMine) * 0.8;
  float isHover = step(abs(vLimb - uHoverBranch), 0.5) * step(0.0, uHoverBranch);
  glow *= 1.0 + isHover * 0.3;

  // Bright sources bloom through mist: the glow layers use a softened
  // extinction so the lights read through the fog BEFORE the solid body
  // resolves (the lights-first reveal).
  float fogK = exp(-uFogDensity * uFogDensity * 0.35 * vViewDist * vViewDist);
  gl_FragColor = vec4(col, 1.0) * (glow * fogK * uGlowOpacity * uOpacity);
}
