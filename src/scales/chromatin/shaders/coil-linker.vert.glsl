// src/scales/chromatin/shaders/coil-linker.vert.glsl
// Linker thread SHAPE stage. True tube geometry (positions are honest
// object-space coordinates — the bounding sphere needs no override here,
// unlike the bead layer). A slight time-driven radial wave keeps the taut
// threads from reading as rigid wire; frozen by uTime=0 / uWaveAmp=0 under
// reduced motion.

uniform float uTime;
uniform float uWaveAmp;

attribute float aT;
attribute float aRegion;

varying float vT;
varying float vRegion;
varying float vViewDist;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  vT = aT;
  vRegion = aRegion;

  vec3 waved = position + normal * (sin(uTime * 0.6 + aT * 24.0) * uWaveAmp);

  vec4 worldPos = modelMatrix * vec4(waved, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
