// src/scales/chromatin/shaders/coil-bubbles.frag.glsl
// Bubble sprite: a thin bright rim, a faint interior fill, and one offset
// specular dot — the lens read of a small air pocket, not a glowing mote.
// Premultiplied for additive blending like the drift fields.
uniform vec3 uColor;
uniform float uOpacity;

varying float vAlpha;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q) * 2.0;
  float rim = smoothstep(0.55, 0.85, d) * (1.0 - smoothstep(0.88, 1.0, d));
  float fill = (1.0 - smoothstep(0.0, 0.9, d)) * 0.12;
  float specDot = 1.0 - smoothstep(0.0, 0.28, length(q - vec2(-0.12, 0.14)) * 2.0);
  float a = (rim * 0.85 + fill + specDot * 0.5) * vAlpha * uOpacity;
  gl_FragColor = vec4(uColor, 1.0) * a;
}
