// src/scales/tissue/shaders/atmosphere-motes.vert.glsl
// Drifting dust in the approach corridor. Positions are baked once; the drift
// is a pure function of uTime + per-point seed (no integrated velocity), so
// the motion is deterministic and freezes cleanly under reduced motion.
uniform float uTime;
uniform float uPixelScale; // drawingBufferHeight/2 — matches three's size attenuation

attribute float aSeed;

varying float vAlpha;

void main() {
  float s = aSeed * 6.2831;
  vec3 p = position +
    vec3(
      sin(uTime * 0.11 + s * 3.1),
      cos(uTime * 0.07 + s * 5.7) * 0.7,
      sin(uTime * 0.09 + s * 7.3)
    ) *
      1.6;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  // Near fade (nothing smears across the lens as the camera flies through)
  // and a gentle far fade so the field doesn't end at a hard shell.
  vAlpha = smoothstep(6.0, 18.0, dist) * (1.0 - smoothstep(90.0, 150.0, dist));

  float worldSize = 0.5 + 0.6 * fract(aSeed * 13.7);
  gl_PointSize = clamp(worldSize * uPixelScale / dist, 1.0, 7.0);
  gl_Position = projectionMatrix * mv;
}
