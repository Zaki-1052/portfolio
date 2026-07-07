// src/scales/chromatin/shaders/coil-bead.vert.glsl
// Bead SHAPE stage. Each vertex carries its bead's compact + unwound center
// as attributes and only the small oriented local offset in `position` —
// the unwind interaction is a pure uniform blend between the two centers,
// gated per bead so only the focused region ever opens (with uFocusRegion
// at -1 the morph is a provable no-op). Brownian micro-drift rides on top,
// per-bead phase from aSeed, frozen by uTime=0 / uDriftAmp=0 under reduced
// motion. The USE_INSTANCING guard is the reserved-rewrite seam: a future
// InstancedMesh bead layer defines it automatically and this stage keeps
// working unchanged — do not simplify it away.

uniform float uUnwindBlend;
uniform float uFocusRegion; // -1 none | 0/1 focused publication region
uniform float uTime;
uniform float uDriftAmp;

attribute vec3 aCompactPos;
attribute vec3 aUnwoundPos;
attribute float aSeed;
attribute float aT;
attribute float aRegion;
attribute float aLocusW;
attribute float aGroove;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vT;
varying float vRegion;
varying float vLocusW;
varying float vSeed;
varying float vGroove;
varying vec3 vObjPos;

void main() {
  vT = aT;
  vRegion = aRegion;
  vLocusW = aLocusW;
  vSeed = aSeed;
  vGroove = aGroove;

  // Only the focused region's beads travel toward their unwound target.
  float isMine = step(abs(aRegion - uFocusRegion), 0.5) * step(0.0, uFocusRegion);
  vec3 beadCenter = mix(aCompactPos, aUnwoundPos, uUnwindBlend * isMine);

  // Brownian-like drift: three incommensurate low frequencies per axis with
  // a per-bead phase — suspended stillness, not synchronized breathing.
  vec3 drift = vec3(
    sin(uTime * 0.31 + aSeed * 6.2831),
    sin(uTime * 0.27 + aSeed * 6.2831 + 2.094),
    cos(uTime * 0.23 + aSeed * 6.2831 + 4.188)
  ) * uDriftAmp;

  vec3 localOffset = position;
  vec3 localNormal = normal;
#ifdef USE_INSTANCING
  localOffset = (instanceMatrix * vec4(position, 1.0)).xyz;
  localNormal = mat3(instanceMatrix) * normal;
#endif

  vec3 objectPos = beadCenter + drift + localOffset;
  vObjPos = objectPos;

  vec4 worldPos = modelMatrix * vec4(objectPos, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * localNormal);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
