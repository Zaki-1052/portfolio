// src/scales/code/shaders/code-grid.vert.glsl
// Environment-grid SHAPE stage — one large horizontal plane parked below the
// band's camera path. World-anchored (unlike the screen-locked window), so
// the pointer parallax and the camera's parked drift slide it subtly — the
// parallax against the locked window is what sells the plateau's depth.

varying vec3 vWorldPos;
varying float vViewDist;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vViewDist = length(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
