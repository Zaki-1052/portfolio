// src/scales/tissue/shaders/tissue-shell.frag.glsl
// Warm matte shell with a golden fresnel rim (this rim is what clears the bloom
// threshold and produces the golden glow — Bloom has no tint knob), a
// reaction-diffusion surface-detail layer, manual exp2 fog, content-phase
// dimming, and the breakthrough dissolve aperture with a glowing burning edge.
// noise.glsl (fbm) is prepended by tissue-shell-material.ts.
uniform float uOpacity;
uniform vec3 uBaseColor;
uniform vec3 uFresnelColor;
uniform float uFresnelPower;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform sampler2D uRDTexture;
uniform float uRDBlend;
uniform float uDissolve;
uniform float uDissolveRadius;
uniform vec3 uDissolveEdgeColor;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vFold;
varying vec2 vUv;

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(vViewDir);
  float ndv = max(dot(N, V), 0.0);
  float fresnel = pow(1.0 - ndv, uFresnelPower);

  // Ridges brighter, cavities darker.
  float shade = mix(0.3, 1.0, clamp(vFold * 0.6 + 0.3, 0.0, 1.0));
  vec3 color = uBaseColor * shade;

  // Reaction-diffusion detail (skipped when unblended / not yet warmed).
  if (uRDBlend > 0.0) {
    float rd = texture2D(uRDTexture, vUv * 3.0).g;
    color = mix(color, color * (0.55 + rd * 1.1), uRDBlend);
  }

  // Fixed warm key light (custom ShaderMaterial gets no scene lights).
  vec3 L = normalize(vec3(0.55, 0.8, 0.5));
  float diff = max(dot(N, L), 0.0);
  color *= (0.45 + 0.75 * diff);

  // Golden fresnel rim — the bloom source.
  color += uFresnelColor * fresnel * 1.7;

  // --- Breakthrough dissolve aperture ---
  // Opens a central hole on the camera-facing cap as uDissolve rises 0→1.
  float radial = clamp(length(vWorldPos.xy) / uDissolveRadius, 0.0, 1.0);
  float front = smoothstep(-0.35, 0.7, normalize(vWorldPos).z);
  float openness = clamp((1.0 - radial) * front + fbm(vWorldPos * 0.35) * 0.15, 0.0, 1.0);
  float cut = 1.0 - uDissolve;
  if (openness > cut) discard;
  float edge = smoothstep(cut - 0.1, cut, openness) * smoothstep(0.0, 0.05, uDissolve);
  color += uDissolveEdgeColor * edge * 2.2;

  // Manual exp2 fog toward the atmospheric color.
  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
  color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

  // Content-phase dimming: recede toward fog (no alpha blending needed).
  color = mix(uFogColor, color, clamp(uOpacity, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);
}
