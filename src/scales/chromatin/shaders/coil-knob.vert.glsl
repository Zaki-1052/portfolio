// src/scales/chromatin/shaders/coil-knob.vert.glsl
// Cinch-knob SHAPE stage — instanced studs at each drum's thread entry/exit.
// instanceMatrix carries the full placement (wall-frame rotation + uniform
// knobSize scale + translation), rewritten on the CPU each unwind tick. The
// drift matches the drum's exactly (same formula, the drum's seed), so the
// stud stays pinned to its drifting drum. Frozen under reduced motion.

uniform float uTime;
uniform float uDriftAmp;

attribute float aSeed;
attribute float aRegion;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vRegion;

void main() {
  vRegion = aRegion;

  vec3 objectPos = position;
  vec3 objectNormal = normal;
#ifdef USE_INSTANCING
  objectPos = (instanceMatrix * vec4(position, 1.0)).xyz;
  objectNormal = mat3(instanceMatrix) * normal;
#endif

  vec3 drift = vec3(
    sin(uTime * 0.31 + aSeed * 6.2831),
    sin(uTime * 0.27 + aSeed * 6.2831 + 2.094),
    cos(uTime * 0.23 + aSeed * 6.2831 + 4.188)
  ) * uDriftAmp;
  objectPos += drift;

  vec4 worldPos = modelMatrix * vec4(objectPos, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
