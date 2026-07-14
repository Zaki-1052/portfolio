// src/scales/expression/shaders/signal-packet.vert.glsl
// Packet point vertex: positions are JS-computed each frame along the same
// bowed curves as the tubes; this stage sizes the sprite by distance and
// forwards the packet's life fraction so the fragment can breathe it in and
// out (no pop at the curve's endpoints).
attribute float aPacketT;

varying float vPacketT;
varying float vViewDist;

uniform float uSize;

void main() {
  vPacketT = aPacketT;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewDist = length(cameraPosition - worldPos.xyz);
  vec4 mvPosition = viewMatrix * worldPos;
  gl_PointSize = uSize * (180.0 / max(1.0, -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
}
