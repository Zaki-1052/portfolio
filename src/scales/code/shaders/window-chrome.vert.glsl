// src/scales/code/shaders/window-chrome.vert.glsl
// Terminal-window SHAPE stage — a flat unit plane; the mesh transform owns
// ALL flight motion (tilt, travel, scale), so this stage only forwards UV
// and the world-space view distance for the manual fog mix. The chrome is
// drawn entirely in the fragment stage in flat UV space and never knows
// about the tilt.

varying vec2 vUv;
varying float vViewDist;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewDist = length(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
