// src/scales/tissue/shaders/atmosphere-halo.frag.glsl
// The warm ambient glow behind the form: a soft radial gradient in the fog
// color, additively lifting the void so the establish shot reads as a form
// suspended in luminous haze instead of floating in dead black. A slow noise
// wobble keeps the gradient from reading as a synthetic radial fill.
// Requires noise.glsl (snoise) prepended.
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;

varying vec2 vUv;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float glow = pow(max(1.0 - d, 0.0), 2.4);
  // Slow organic drift — barely-there mottling, frozen under reduced motion
  // (uTime pinned at 0).
  float wobble = 0.85 + 0.15 * snoise(vec3(vUv * 2.6, uTime * 0.05));
  gl_FragColor = vec4(uColor * (glow * wobble * uIntensity), 1.0);
}
