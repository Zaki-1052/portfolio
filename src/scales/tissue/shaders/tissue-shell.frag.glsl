// src/scales/tissue/shaders/tissue-shell.frag.glsl
// Two-scale cortex, part 2 (the DETAIL). The vertex shader gave the ellipsoid
// shape + recessed fissure; here the FINE GYRI are added per-pixel — but as a
// MATTE tissue pattern, not shiny ripples. The trick: the fold field is
// abs(noise), so sulci are thin dark contour lines and gyri are broad; the
// pattern is carried mostly by ALBEDO/occlusion (dark grooves) with only a gentle
// normal bump, and fresnel is small — that's what reads as tissue instead of
// liquid metal. Folds continue INTO the fissure (its walls are gyrified too); the
// cleft reads by recess + shadow, not by a black cutout. Then: soft warm diffuse,
// a subtle RD mottle, faint golden edge (a little bloom), fog, content dimming,
// and the breakthrough dissolve. noise.glsl is prepended by the material.
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

const float BUMP = 0.26; // fine-gyri bump strength (gentle → matte, not metallic)
const float GYRI_FREQ = 0.16; // fine-gyri frequency (lower = larger, less busy folds)

// Fine gyri field: broad matte gyri (→1) with thin dark sulci (→0) along the
// noise zero-crossings. abs(noise) puts thin grooves on the contour lines; the
// smoothstep widens the bright gyri and keeps the sulci thin. Carrying the folds
// as dark albedo grooves (not bright normal-mapped ridges) is what stops it
// looking like brushed metal.
float gyriField(vec3 wp) {
  vec3 warp = vec3(snoise(wp * 0.2 + 3.0), snoise(wp * 0.2 + 13.0), snoise(wp * 0.2 + 23.0));
  vec3 q = wp * GYRI_FREQ + warp * 1.4;
  float n = snoise(q) + 0.35 * snoise(q * 2.1 + 9.0);
  return smoothstep(0.06, 0.5, abs(n));
}

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N; // inner shell, visible through the aperture

  // --- Fine-gyri bump: gentle tilt of N by the fold-field gradient (creases the
  // sulci, leaves the broad gyri flat/matte). ---
  vec3 refAxis = abs(N.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 T = normalize(cross(N, refAxis));
  vec3 Bt = cross(N, T);
  float e = 0.08;
  float h0 = gyriField(vWorldPos);
  float hT = gyriField(vWorldPos + T * e);
  float hB = gyriField(vWorldPos + Bt * e);
  vec3 grad = (T * (hT - h0) + Bt * (hB - h0)) / e;
  N = normalize(N - grad * BUMP);

  vec3 V = normalize(vViewDir);
  float ndv = max(dot(N, V), 0.0);
  // max(…, 0) guards against dot > 1 from float error → pow of a negative → NaN.
  float fresnel = pow(max(1.0 - ndv, 0.0), uFresnelPower);

  // Ambient occlusion carries the folds as ALBEDO (matte): recessed big
  // folds/fissure (vFold) × thin dark sulci (h0). Grooves at either scale darken.
  float ao = mix(0.3, 1.0, clamp(vFold, 0.0, 1.0));
  ao *= mix(0.22, 1.0, h0);

  vec3 color = uBaseColor;

  // Reaction-diffusion mottle — subtle organic colour variation.
  if (uRDBlend > 0.0) {
    float rd = texture2D(uRDTexture, vWorldPos.xy * 0.04 + 0.5).g;
    color *= mix(1.0, 0.85 + rd * 0.35, uRDBlend);
  }

  // Soft, mostly-ambient warm diffuse → matte tissue, not a lit metal ball.
  vec3 key = normalize(vec3(0.4, 0.7, 0.55));
  vec3 fill = normalize(vec3(-0.5, -0.1, 0.6));
  float diff = max(dot(N, key), 0.0) + 0.3 * max(dot(N, fill), 0.0);
  color *= (0.42 + 0.6 * diff) * ao;

  // Faint golden edge — a hint of bloom, small so the surface stays matte.
  color += uFresnelColor * fresnel * 0.16;

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
