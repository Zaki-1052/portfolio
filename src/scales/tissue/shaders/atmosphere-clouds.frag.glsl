// src/scales/tissue/shaders/atmosphere-clouds.frag.glsl
// Wispy haze patch: an fbm body inside a soft radial mask, alpha-blended
// (mildly opaque — clouds genuinely veil what drifts behind them, unlike the
// additive glow layers). Internal structure churns very slowly with uTime.
// Requires noise.glsl (fbm) prepended.
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;

varying vec2 vUv;
varying float vSeed;

void main() {
  float r = length(vUv - 0.5) * 2.0;
  float mask = smoothstep(1.0, 0.2, r);
  float w = fbm(vec3(vUv * 2.4 + vSeed * 37.0, uTime * 0.015 + vSeed * 11.0));
  float body = smoothstep(0.18, 0.85, w * 0.5 + 0.5);
  gl_FragColor = vec4(uColor, mask * body * uOpacity);
}
