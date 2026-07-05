// src/scales/tissue/shaders/atmosphere-motes.frag.glsl
// Soft circular sprite — premultiplied for additive blending so overlapping
// motes sum into gentle glow, never hard-edged squares.
uniform vec3 uColor;
uniform float uOpacity;

varying float vAlpha;
varying vec3 vColor;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float disc = smoothstep(1.0, 0.25, d);
  gl_FragColor = vec4(uColor * vColor, 1.0) * (disc * vAlpha * uOpacity);
}
