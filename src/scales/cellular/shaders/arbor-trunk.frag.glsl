// src/scales/cellular/shaders/arbor-trunk.frag.glsl
// Solid limb SHADING stage — the shell's craft register cooled into the rose
// band: hemisphere ambient + wrapped key + fresnel rim, hand-set (a custom
// ShaderMaterial gets no scene lights), manual exp2 fog against the live
// scene fog mirror, uOpacity content-phase dim. The solid→luminous gradient
// rides the growth parameter: bark at the root, emissive rose at the reaches.
// All blend factors, no divergent texture taps (there are none at all).

uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform vec3 uFresnelColor;
uniform float uFresnelPower;
uniform float uEmissiveStrength;
uniform float uReliefFreq;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uOpacity;
uniform float uFocusBranch; // -1 none | 0/1/2 focused limb
uniform float uFocusBlend; // 0..1 focus pivot progress
uniform float uHoverBranch; // -1 none | 0/1/2 hovered limb
uniform vec3 uHubGlowA; // granular core glow, mottled between two hues
uniform vec3 uHubGlowB;
uniform float uHubGlowStrength;
uniform vec3 uSheathColor; // the green encrustation riding the blue limbs
uniform float uSheathAmount;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vT;
varying float vLimb;
varying vec3 vObjPos;

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewDir);

  // Solid → luminous gradient along the growth parameter: bark owns the lower
  // two thirds, the emissive takeover happens out in the reaches.
  float glowK = smoothstep(0.45, 0.95, vT);
  vec3 albedo = mix(uBaseColor, uTipColor, glowK * 0.55);

  // Static bark mottle — value breakup only, same field family as the relief.
  float mottle = fbm(vObjPos * (uReliefFreq * 2.3)) * 0.5 + 0.5;
  albedo *= 0.8 + mottle * 0.34;

  // The limbs are ENCRUSTED, never bare (the reference's arms): green sheath
  // patches ride the blue body, bright speckle grains catch the light, and
  // each member drifts its own tint slightly. Members only — the trunk/hub
  // (vLimb < 0) keep the clean blue core register. All blend factors.
  float memberK = step(-0.5, vLimb);
  float sheath =
    smoothstep(0.22, 0.70, fbm(vObjPos * (uReliefFreq * 1.5) + vec3(7.3)) * 0.5 + 0.5);
  albedo = mix(albedo, uSheathColor, sheath * uSheathAmount * memberK * (0.55 + 0.45 * glowK));
  float speck = smoothstep(0.62, 0.95, snoise(vObjPos * 7.5));
  albedo += mix(uSheathColor, vec3(1.0), 0.5) * (speck * 0.55 * memberK);
  float tintShift = fract(vLimb * 0.37 + 0.21);
  albedo *= mix(vec3(1.0), vec3(0.88, 1.04, 1.12), tintShift * 0.5 * memberK);

  // Cool register: soft hemisphere + wrapped key from above-front,
  // kept low so the body stays mass against the haze — the periphery,
  // not the core, is what glows.
  vec3 key = normalize(vec3(0.3, 0.72, 0.58));
  float wrap = dot(N, key) * 0.5 + 0.5;
  float diff = wrap * wrap;
  float hemi = 0.5 + 0.5 * N.y;
  vec3 ambient = mix(vec3(0.1, 0.12, 0.16), vec3(0.22, 0.27, 0.34), hemi);
  vec3 keyCol = vec3(0.85, 0.94, 1.0) * 0.7;
  vec3 color = albedo * (ambient + keyCol * diff);

  // Rose rim — separates the dark limbs from the haze and feeds bloom.
  // NB: on thin cylinders most of the visible surface is near-grazing, so
  // the rim needs a much tighter power than the shell's or it tints the
  // whole bark pink; the base weight stays low and glowK carries it out
  // into the reaches.
  float ndv = max(dot(N, V), 0.0);
  float fresnel = pow(max(1.0 - ndv, 0.0), uFresnelPower);
  color += uFresnelColor * fresnel * (0.12 + 0.55 * glowK);

  // Emissive kick toward the periphery — the limbs dissolve into light.
  // White-shifted so the reaches cross the bloom threshold in this band.
  vec3 emissive = mix(uTipColor, vec3(1.0), 0.15 * glowK);
  color += emissive * (uEmissiveStrength * glowK * glowK * 0.8);

  // The hub is LIT FROM WITHIN: a granular two-hue glow, brightest facing
  // the camera (inverse of the rim) — the reference's luminous core. A
  // finer-grained field carries the granularity so the mass reads alive.
  float hubK = 1.0 - step(-1.5, vLimb);
  float grain2 = fbm(vObjPos * (uReliefFreq * 5.2)) * 0.5 + 0.5;
  vec3 hubGlow = mix(uHubGlowA, uHubGlowB, smoothstep(0.2, 0.8, grain2));
  color += hubGlow *
    (hubK * uHubGlowStrength * (0.25 + 0.75 * pow(ndv, 1.4)) * (0.55 + 0.65 * grain2));

  // Focus dim: while a branch is focused the other limbs recede; the shared
  // trunk (vLimb < 0) never dims. Hover lifts its limb slightly.
  float hasFocus = step(0.0, uFocusBranch);
  float isMine = step(abs(vLimb - uFocusBranch), 0.5);
  float isLimb = step(0.0, vLimb);
  color *= 1.0 - uFocusBlend * hasFocus * (1.0 - isMine) * isLimb * 0.72;
  float isHover = step(abs(vLimb - uHoverBranch), 0.5) * step(0.0, uHoverBranch);
  color *= 1.0 + isHover * 0.18;

  // Manual exp2 fog toward the live scene color, then content-phase dim.
  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
  color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));
  color = mix(uFogColor, color, clamp(uOpacity, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);
}
