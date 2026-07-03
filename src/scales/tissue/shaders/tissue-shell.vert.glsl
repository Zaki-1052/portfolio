// src/scales/tissue/shaders/tissue-shell.vert.glsl
// Displaces a sphere into a folded cortex-like shell via domain-warped ridged
// noise along the normal. noise.glsl (snoise/fbm/ridgedFbm/domainWarp) is
// prepended by tissue-shell-material.ts. three's ShaderMaterial supplies
// position/normal/uv and the matrix + cameraPosition uniforms.
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vFold;
varying vec2 vUv;

void main() {
  vUv = uv;

  // Slow drift keeps the surface alive at rest (frozen when uTime is held).
  vec3 warped = domainWarp(position * 0.14 + vec3(0.0, 0.0, uTime * 0.02), 0.5);
  float fold = ridgedFbm(warped * 1.1);
  vFold = fold;

  // Displace along the normal; ridges push out, cavities stay in.
  vec3 displaced = position + normal * (fold * 2.2);

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
