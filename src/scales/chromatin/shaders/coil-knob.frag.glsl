// src/scales/chromatin/shaders/coil-knob.frag.glsl
// Cinch-knob SHADING stage — a small lit amber stud in the drums'
// environment, with a share of the thread's emissive so the clasp reads as
// part of the winding system. Focus dim, fog, and reveal mirror the other
// layers.

uniform vec3 uColor;
uniform float uEmissive;
uniform float uFocusRegion;
uniform float uFocusDim;
uniform float uFocusDimStrength;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uOpacity;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vRegion;

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewDir);

  vec3 key = normalize(vec3(0.35, 0.68, 0.62));
  float wrap = dot(N, key) * 0.5 + 0.5;
  float diff = mix(0.35, 1.0, wrap * wrap);
  float hemi = 0.5 + 0.5 * N.y;
  vec3 ambient = mix(vec3(0.2, 0.23, 0.32), vec3(0.4, 0.45, 0.56), hemi);
  vec3 keyCol = vec3(0.9, 0.95, 1.0) * 0.75;
  vec3 color = uColor * (ambient + keyCol * diff);

  // Soft stud highlight — a gentle catch of light, not a metal point.
  vec3 H = normalize(key + V);
  color += keyCol * pow(max(dot(N, H), 0.0), 24.0) * 0.18;

  color += uColor * uEmissive;

  float mine = step(abs(vRegion - uFocusRegion), 0.5);
  float dimF = uFocusDim * step(-0.5, uFocusRegion) * (1.0 - mine);
  color *= 1.0 - dimF * uFocusDimStrength;

  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
  color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));
  color = mix(uFogColor, color, clamp(uOpacity, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);
}
