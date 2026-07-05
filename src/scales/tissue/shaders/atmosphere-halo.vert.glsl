// src/scales/tissue/shaders/atmosphere-halo.vert.glsl
// Passthrough for the billboarded glow quad — the component orients the mesh
// toward the camera each frame; the gradient lives entirely in the fragment.
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
