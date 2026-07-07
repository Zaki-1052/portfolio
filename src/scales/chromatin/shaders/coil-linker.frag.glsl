// src/scales/chromatin/shaders/coil-linker.frag.glsl
// Linker thread glow — additive, premultiplied like the arbor's strand
// ribbons, so overlapping threads sum into light. Additive layers can't mix
// toward a fog color, so fog extinguishes them with distance (softened, the
// lights-first convention: threads glimmer through the haze before the bead
// mass resolves). A traveling shimmer runs along the fiber; the tube's
// silhouette edges fade via the normal-vs-view profile so the thin thread
// reads soft, not wiry.

uniform vec3 uColor;
uniform float uGlowOpacity;
uniform float uOpacity;
uniform float uFogDensity;
uniform float uShimmerSpeed;
uniform float uTime;

varying float vT;
varying float vRegion;
varying float vViewDist;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(vViewDir);

  // Soft cross-profile: camera-facing tube center bright, silhouette fades.
  float ndv = abs(dot(N, V));
  float profile = 0.3 + 0.7 * ndv * ndv;

  // Traveling shimmer: a brightness wave gliding along the fiber, squared so
  // the crest is a highlight riding a faint constant base, not a strobe.
  float shimmer = 0.5 + 0.5 * sin(vT * 40.0 - uTime * uShimmerSpeed);
  float glow = profile * (0.45 + 0.75 * shimmer * shimmer);
  vec3 col = mix(uColor, vec3(1.0), 0.12 * shimmer);

  float fogK = exp(-uFogDensity * uFogDensity * 0.35 * vViewDist * vViewDist);
  gl_FragColor = vec4(col, 1.0) * (glow * fogK * uGlowOpacity * uOpacity);
}
