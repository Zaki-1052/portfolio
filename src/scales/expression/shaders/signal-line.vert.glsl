// src/scales/expression/shaders/signal-line.vert.glsl
// Signal-line tube vertex: geometry moves on the CPU (rewritten per frame
// from the live resolved origin), so this stage only forwards the varyings
// the glow needs — channel ordinal, arc-length fraction, terminus tint,
// view distance/direction (the coil-ribbon shape).
attribute float aChannel;
attribute float aArcT;
attribute vec3 aTint;

varying float vChannel;
varying float vArcT;
varying vec3 vTint;
varying float vViewDist;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  vChannel = aChannel;
  vArcT = aArcT;
  vTint = aTint;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  vViewDist = length(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
