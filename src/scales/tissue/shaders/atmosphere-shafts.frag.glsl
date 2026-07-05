// src/scales/tissue/shaders/atmosphere-shafts.frag.glsl
// Soft light beam: quadratic lateral falloff × soft-ended length profile ×
// a slow noise shimmer drifting along the beam. Premultiplied for additive
// blending. The two beam groups fade on independent envelopes (exterior
// establish beams vs the interior aperture shaft).
// Requires noise.glsl (snoise) prepended.
uniform vec3 uColor;
uniform float uOpacityOut;
uniform float uOpacityIn;
uniform float uTime;

varying vec2 vUv;
varying float vSeed;
varying float vGroup;

void main() {
  float lateral = 1.0 - abs(vUv.x * 2.0 - 1.0);
  lateral *= lateral;
  float along = sin(vUv.y * 3.14159265);
  float shimmer = 0.8 + 0.2 * snoise(vec3(vSeed * 41.0, vUv.y * 2.2 - uTime * 0.035, 0.0));
  float opacity = mix(uOpacityOut, uOpacityIn, vGroup);
  gl_FragColor = vec4(uColor, 1.0) * (lateral * along * shimmer * opacity);
}
