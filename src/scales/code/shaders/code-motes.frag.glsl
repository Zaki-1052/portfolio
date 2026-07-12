// src/scales/code/shaders/code-motes.frag.glsl
// Drift-mote SHADING stage — each point is a soft vertical dash: an abstract
// mark with a hint of the terminal's character grid, far too soft to read
// as a glyph. Very faint, green, brightness seed-varied, distance-fogged.

uniform vec3 uColor;
uniform float uOpacity;
uniform float uFogDensity;

varying float vSeed;
varying float vViewDist;

void main() {
  // Dash mask in point space: narrow in x, taller in y, soft edges.
  vec2 q = gl_PointCoord - 0.5;
  float dash = (1.0 - smoothstep(0.10, 0.22, abs(q.x))) * (1.0 - smoothstep(0.22, 0.46, abs(q.y)));

  float brightness = 0.4 + 0.6 * fract(vSeed * 7.13);
  float fogFade = exp(-uFogDensity * uFogDensity * vViewDist * vViewDist * 40.0);
  float alpha = dash * brightness * uOpacity * fogFade;
  if (alpha <= 0.003) discard;

  gl_FragColor = vec4(uColor, alpha);
}
