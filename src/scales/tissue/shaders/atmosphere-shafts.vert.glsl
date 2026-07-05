// src/scales/tissue/shaders/atmosphere-shafts.vert.glsl
// Axial-billboard beam quads: each vertex carries its beam's origin/direction,
// and the quad's side vector swings around the beam axis to face the camera —
// so a flat quad reads as a volumetric shaft from any orbit angle. One merged
// buffer, zero per-frame CPU.
attribute vec3 aOrigin;
attribute vec3 aDir; // normalized beam direction
attribute vec3 aParams; // x = length, y = width, z = seed
attribute float aGroup; // 0 = exterior establish beams · 1 = interior aperture beam

varying vec2 vUv;
varying float vSeed;
varying float vGroup;

void main() {
  vUv = uv;
  vSeed = aParams.z;
  vGroup = aGroup;

  vec3 along = aOrigin + aDir * (uv.y * aParams.x);
  // Side vector faces the camera around the beam axis; the epsilon keeps the
  // cross well-defined at the degenerate looking-straight-down-the-beam angle.
  vec3 side = normalize(cross(aDir, cameraPosition - along) + vec3(1e-4));
  vec3 world = along + side * ((uv.x - 0.5) * aParams.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
