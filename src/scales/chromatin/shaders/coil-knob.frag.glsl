// src/scales/chromatin/shaders/coil-knob.frag.glsl
// Cinch-knob SHADING stage — a small lit teal stud in the drums' deep-dusk
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

  // The drums' deep-dusk environment, verbatim — one scene, one light rig.
  vec3 key = normalize(vec3(0.15, 0.9, 0.35));
  float wrap = dot(N, key) * 0.5 + 0.5;
  float diff = mix(0.15, 1.0, wrap * wrap);
  float hemi = pow(0.5 + 0.5 * N.y, 1.4);
  vec3 ambient = mix(vec3(0.10, 0.13, 0.15), vec3(0.36, 0.44, 0.50), hemi);
  vec3 keyCol = vec3(0.85, 0.95, 1.0) * 0.7;
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
