// src/scales/chromatin/shaders/coil-thread.vert.glsl
// Wound-thread SHAPE stage. The tube's positions/normals are honest object-
// space geometry, rewritten on the CPU each unwind tick (wrap + bridge path
// from coil-thread-path). The only vertex-side motion is the drift match:
// the drums drift in THEIR vertex shader, so the cord carries the identical
// formula — wrap verts ride their drum's seed exactly (aDriftMix = 0),
// bridge verts blend their two endpoint drums — keeping the winding pinned
// to a drifting drum instead of floating off it. Frozen by uTime = 0 /
// uDriftAmp = 0 under reduced motion.

uniform float uTime;
uniform float uDriftAmp;

attribute float aT;
attribute float aRegion;
attribute float aSeedA;
attribute float aSeedB;
attribute float aDriftMix;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vT;
varying float vRegion;

// Identical to the bead vert's drift — same frequencies, same phase layout.
vec3 driftFor(float seed) {
  return vec3(
    sin(uTime * 0.31 + seed * 6.2831),
    sin(uTime * 0.27 + seed * 6.2831 + 2.094),
    cos(uTime * 0.23 + seed * 6.2831 + 4.188)
  );
}

void main() {
  vT = aT;
  vRegion = aRegion;

  vec3 drift = mix(driftFor(aSeedA), driftFor(aSeedB), aDriftMix) * uDriftAmp;
  vec4 worldPos = modelMatrix * vec4(position + drift, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
