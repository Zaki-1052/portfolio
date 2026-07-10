// src/scales/tissue/shaders/atmosphere-motes.frag.glsl
// Soft circular sprite — premultiplied for additive blending so overlapping
// motes sum into gentle glow, never hard-edged squares. uRimGlow (default 0)
// mixes toward a defocused-lens profile — dimmer body, brighter edge ring —
// for the near-field bokeh fields; classic fields stay byte-identical.
uniform vec3 uColor;
uniform float uOpacity;
uniform float uRimGlow;

varying float vAlpha;
varying vec3 vColor;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float disc = smoothstep(1.0, 0.25, d);
  float rim = smoothstep(0.45, 0.8, d) * (1.0 - smoothstep(0.85, 1.0, d));
  float shaped = mix(disc, disc * 0.35 + rim * 0.9, uRimGlow);
  gl_FragColor = vec4(uColor * vColor, 1.0) * (shaped * vAlpha * uOpacity);
}
