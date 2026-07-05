// src/scales/tissue/shaders/atmosphere-clouds.vert.glsl
// One merged buffer of view-aligned quads — each cloud's center, scale,
// rotation, and seed ride per-vertex attributes, so the whole bank is a single
// draw call with zero per-frame CPU work. Drift is a pure function of uTime +
// seed (deterministic; freezes cleanly at uTime 0 under reduced motion).
uniform float uTime;

attribute vec3 aCenter;
attribute vec3 aParams; // x = scale, y = rotation, z = seed

varying vec2 vUv;
varying float vSeed;

void main() {
  vUv = uv;
  vSeed = aParams.z;

  float s = aParams.z * 6.2831;
  vec3 c = aCenter +
    vec3(
      sin(uTime * 0.045 + s * 2.3),
      cos(uTime * 0.032 + s * 4.1) * 0.6,
      sin(uTime * 0.038 + s * 6.7)
    ) *
      5.0;

  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  float cr = cos(aParams.y);
  float sr = sin(aParams.y);
  mv.xy += mat2(cr, sr, -sr, cr) * position.xy * aParams.x;
  gl_Position = projectionMatrix * mv;
}
