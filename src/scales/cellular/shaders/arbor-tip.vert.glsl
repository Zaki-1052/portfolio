// src/scales/cellular/shaders/arbor-tip.vert.glsl
// Tip sprite SHAPE stage — one soft point per leaf node, riding the exact
// sway of its strand endpoint (same seed, same formula), with a slow
// per-sprite pulse computed here so the fragment stage stays trivial.
// Size attenuation matches the drift-field convention (uPixelScale =
// half the drawing-buffer height).

uniform float uTime;
uniform float uPixelScale;
uniform float uTipSize;
uniform float uSway;

attribute float aT;
attribute float aLimb;
attribute float aSeed;

varying float vT;
varying float vLimb;
varying float vViewDist;
varying float vPulse;
varying float vSeed;

void main() {
  vT = aT;
  vLimb = aLimb;
  vSeed = aSeed;

  float ph = aSeed * 6.2831;
  vec3 sway = vec3(
    sin(uTime * 0.32 + ph * 3.7),
    sin(uTime * 0.21 + ph * 9.1) * 0.4,
    cos(uTime * 0.27 + ph * 5.3)
  ) * (uSway * aT * aT);

  // Slow ember-like breathing, never fully dark.
  vPulse = 0.7 + 0.3 * sin(uTime * (0.4 + aSeed * 0.7) + ph * 11.0);

  vec4 mv = modelViewMatrix * vec4(position + sway, 1.0);
  float dist = -mv.z;
  vViewDist = dist;

  float worldSize = uTipSize * (0.6 + 0.8 * fract(aSeed * 13.7));
  gl_PointSize = clamp(worldSize * uPixelScale / dist, 1.0, 26.0);
  gl_Position = projectionMatrix * mv;
}
