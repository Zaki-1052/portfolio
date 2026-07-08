// src/scales/chromatin/shaders/coil-ribbon.vert.glsl
// Loop-ribbon tube vertex: geometry moves on the CPU (rewritten per unwind
// tick alongside the beads and threads), so this stage only forwards the
// varyings the glow needs — arc-length fraction, region membership, per-arc
// ordinal (pulse phase), view distance/direction.
attribute float aArcT;
attribute float aRegion;
attribute float aArc;

varying float vArcT;
varying float vRegion;
varying float vArc;
varying float vViewDist;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  vArcT = aArcT;
  vRegion = aRegion;
  vArc = aArc;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  vViewDist = length(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
