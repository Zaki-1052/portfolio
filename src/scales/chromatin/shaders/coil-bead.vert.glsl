// src/scales/chromatin/shaders/coil-bead.vert.glsl
// Bead SHAPE stage — instanced. Each bead is one instance of the shared
// beveled-puck template; instanceMatrix carries the full placement
// (transport-frame rotation + uniform radius scale + translation), written on
// the CPU by the Approach-B unwind engine each animation tick. No morph
// attributes remain — the geometry that arrives here IS the current
// conformation. Brownian micro-drift rides on top, per-instance phase from
// aSeed, frozen by uTime=0 / uDriftAmp=0 under reduced motion. The wound
// thread's vertex stage duplicates this exact drift formula (same
// frequencies, same seed hash) so the wrapped cord rides its drum without
// detaching. The non-instanced fallback keeps the bare template renderable
// as a plain mesh.

uniform float uTime;
uniform float uDriftAmp;
uniform vec2 uCurrentDir; // shared band current (coil-current.ts); amp 0 = still
uniform float uCurrentAmp;
uniform float uCurrentFreq;
uniform float uCurrentK;

attribute float aSeed;
attribute float aRegion;
attribute float aLocusW;
attribute float aCapMask;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vRegion;
varying float vLocusW;
varying float vSeed;
varying float vCapMask;
varying vec3 vLocalPos;

void main() {
  vRegion = aRegion;
  vLocusW = aLocusW;
  vSeed = aSeed;
  vCapMask = aCapMask;
  // Template-local coordinates: the frag's mottle noise samples live HERE
  // (plus a per-drum phase from the seed), so the surface pattern rides WITH
  // the drum through the unwind instead of crawling across it as it travels.
  vLocalPos = position;

  vec3 objectPos = position;
  vec3 objectNormal = normal;
#ifdef USE_INSTANCING
  // Rigid rotation + uniform scale only (aspect + bevel are baked into the
  // template), so transforming the normal by mat3(instanceMatrix) and
  // renormalizing below is exact — never put a non-uniform scale in these
  // matrices.
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

  // The band's shared current — the thread and knob stages evaluate the
  // IDENTICAL expression at their own coil-local positions; the wave's
  // ~105-unit wavelength bounds the phase shear across one drum to a few
  // thousandths of a unit, so the wound cord never detaches.
  float cPhase = uTime * uCurrentFreq + dot(objectPos.xz, uCurrentDir) * uCurrentK;
  objectPos.xz += uCurrentDir * (uCurrentAmp * sin(cPhase));

  vec4 worldPos = modelMatrix * vec4(objectPos, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
