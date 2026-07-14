// src/scales/expression/shaders/signal-packet.frag.glsl
// Packet point fragment: a soft disc with a hot core (the arbor-puncta
// idiom), alpha breathing sin(π·t) over the packet's life so packets are
// born dim at the origin and die dim at the terminus — never a pop at the
// wrap. Additive, fog-extinguished.
uniform vec3 uColor;
uniform vec3 uWarmColor;
uniform float uWarmT;
uniform float uOpacity;
uniform float uFogDensity;

varying float vPacketT;
varying float vViewDist;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv) * 2.0;
  float disc = smoothstep(1.0, 0.55, r);
  float core = smoothstep(0.5, 0.0, r);

  float life = sin(vPacketT * 3.14159265);
  vec3 col = mix(uColor, vec3(1.0), core * 0.6);
  col = mix(col, uWarmColor, uWarmT * 0.6);

  float fogK = exp(-uFogDensity * uFogDensity * 0.35 * vViewDist * vViewDist);
  gl_FragColor = vec4(col, 1.0) * (disc * (0.5 + 0.5 * core) * life * fogK * uOpacity);
}
