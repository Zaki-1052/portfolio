// src/scales/chromatin/shaders/coil-bead.vert.glsl
// Bead SHAPE stage — instanced. Each bead is one instance of the shared
// oblate template; instanceMatrix carries the full placement (transport-frame
// rotation + uniform radius scale + translation), written on the CPU by the
// Approach-B unwind engine each animation tick. No morph attributes remain —
// the geometry that arrives here IS the current conformation. Brownian
// micro-drift rides on top, per-instance phase from aSeed, frozen by uTime=0
// / uDriftAmp=0 under reduced motion. The non-instanced fallback keeps the
// bare template renderable as a plain mesh.

uniform float uTime;
uniform float uDriftAmp;

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
varying vec3 vLocalPos;

void main() {
  vT = aT;
  vRegion = aRegion;
  vLocusW = aLocusW;
  vSeed = aSeed;
  vGroove = aGroove;
  // Template-local coordinates: the frag's noise samples live HERE (plus a
  // per-bead phase from the seed), so grooves and mottle ride WITH the bead
  // through the unwind instead of crawling across its surface as it travels.
  vLocalPos = position;

  vec3 objectPos = position;
  vec3 objectNormal = normal;
#ifdef USE_INSTANCING
  // Rigid rotation + uniform scale only (aspect is baked into the template),
  // so transforming the normal by mat3(instanceMatrix) and renormalizing
  // below is exact — never put a non-uniform scale in these matrices.
  objectPos = (instanceMatrix * vec4(position, 1.0)).xyz;
  objectNormal = mat3(instanceMatrix) * normal;
#endif

  // Brownian-like drift: three incommensurate low frequencies per axis with
  // a per-bead phase — suspended stillness, not synchronized breathing.
  vec3 drift = vec3(
    sin(uTime * 0.31 + aSeed * 6.2831),
    sin(uTime * 0.27 + aSeed * 6.2831 + 2.094),
    cos(uTime * 0.23 + aSeed * 6.2831 + 4.188)
  ) * uDriftAmp;
  objectPos += drift;

  vec4 worldPos = modelMatrix * vec4(objectPos, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
