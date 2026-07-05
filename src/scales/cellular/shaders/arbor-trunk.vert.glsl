// src/scales/cellular/shaders/arbor-trunk.vert.glsl
// Solid limb SHAPE stage. The swept tube rings arrive with clean transported
// normals; a static fbm relief (bark, object-space — it must never crawl)
// displaces along them, scaled by the local radius so thin reaches stay
// smooth as they head toward the luminous periphery. noise.glsl is prepended
// by arbor-trunk-material.ts; three supplies attributes/matrices.

uniform float uReliefAmp;
uniform float uReliefFreq;

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

void main() {
  vT = aT;
  vLimb = aLimb;
  vObjPos = position;

  // Bark relief — ridged along the growth axis (stretched y) so it reads as
  // grain running up the limb, not popcorn. Radius-scaled: the trunk carries
  // it, the thin reaches shed it.
  float grain = fbm(vec3(position.x, position.y * 0.35, position.z) * uReliefFreq);
  vec3 displaced = position + normal * grain * uReliefAmp * min(aRadius, 1.0);

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
