// src/scales/cellular/shaders/arbor-trunk.vert.glsl
// Solid limb SHAPE stage. The swept tube rings arrive with clean transported
// normals; a static fbm relief (bark, object-space — it must never crawl)
// displaces along them, scaled by the local radius so thin reaches stay
// smooth as they head toward the luminous periphery. noise.glsl is prepended
// by arbor-trunk-material.ts; three supplies attributes/matrices.

uniform float uReliefAmp;
uniform float uReliefFreq;
uniform float uHubBump;

attribute float aT;
attribute float aRadius;
attribute float aLimb;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vT;
varying float vLimb;
varying vec3 vObjPos;

// The hub's large-scale lumps — low-frequency, so the mass reads as an
// organic 3D body instead of a tacked-on disc.
float hubField(vec3 p) {
  return fbm(p * 0.5 + vec3(3.7));
}

void main() {
  vT = aT;
  vLimb = aLimb;
  vObjPos = position;

  // Bark relief — ridged along the growth axis (stretched y) so it reads as
  // grain running up the limb, not popcorn. Radius-scaled: the trunk carries
  // it, the thin reaches shed it. The hub (aLimb = -2) damps the fine grain
  // and takes LARGE lumps instead, with a numerically recomputed normal so
  // the lumps actually shade (a displaced-but-sphere-lit ball still reads
  // flat). Vertex-stage branch — no texture taps, safe.
  float hubK = 1.0 - step(-1.5, aLimb);
  float grain = fbm(vec3(position.x, position.y * 0.35, position.z) * uReliefFreq);
  vec3 displaced =
    position + normal * grain * uReliefAmp * min(aRadius, 1.0) * mix(1.0, 0.35, hubK);
  vec3 shadeNormal = normal;
  if (hubK > 0.5) {
    float b0 = hubField(position);
    displaced += normal * b0 * uHubBump;
    // Tangent-plane finite difference of the lump field → perturbed normal.
    vec3 refAxis = abs(normal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tgt = normalize(cross(normal, refAxis));
    vec3 btg = cross(normal, tgt);
    float e = 0.35;
    float bT = hubField(position + tgt * e);
    float bB = hubField(position + btg * e);
    shadeNormal = normalize(normal - (tgt * (bT - b0) + btg * (bB - b0)) * (uHubBump / e) * 1.4);
  }

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * shadeNormal);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
