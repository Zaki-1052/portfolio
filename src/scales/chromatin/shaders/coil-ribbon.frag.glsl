// src/scales/chromatin/shaders/coil-ribbon.frag.glsl
// The connection streams: additive glow tubes that exist only for the
// focused region, blooming in the LATER half of the unwind (the region
// opens first, then its connections light up). A narrow bright front
// travels each arc — packets flowing between distant loci — over a faint
// full-length base glow. Same fog-extinction and premultiplied-additive
// output as the linker threads.
uniform vec3 uColor;
uniform float uGlowOpacity;
uniform float uOpacity; // band reveal envelope (shared with the threads)
uniform float uFogDensity;
uniform float uFlowSpeed;
uniform float uFocusRegion; // -1 none | 0/1 focused publication region
uniform float uUnwind; // the unwind blend — the bloom gate
uniform float uTime;

varying float vArcT;
varying float vRegion;
varying float vArc;
varying float vViewDist;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  // Only the focused region's arcs exist, and only once the region is
  // mostly open (the JS side also hides the mesh entirely when compact).
  float mine = step(abs(vRegion - uFocusRegion), 0.5) * step(-0.5, uFocusRegion);
  float bloom = mine * smoothstep(0.35, 0.9, uUnwind);

  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(vViewDir);
  float ndv = abs(dot(N, V));
  float profile = 0.35 + 0.65 * ndv * ndv;

  // Traveling packet: sawtooth front per arc, desynced by the arc ordinal;
  // a soft shimmer keeps the base glow alive between packets.
  float wave = fract(uTime * uFlowSpeed + vArc * 0.29);
  float front = smoothstep(0.08, 0.0, abs(vArcT - wave));
  float shimmer = 0.75 + 0.25 * sin(vArcT * 30.0 - uTime * 2.0);
  float glow = profile * (0.4 + 0.85 * front) * shimmer;
  vec3 col = mix(uColor, vec3(1.0), 0.45 * front);

  float fogK = exp(-uFogDensity * uFogDensity * 0.35 * vViewDist * vViewDist);
  gl_FragColor = vec4(col, 1.0) * (glow * fogK * uGlowOpacity * uOpacity * bloom);
}
