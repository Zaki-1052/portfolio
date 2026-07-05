// src/scales/cellular/shaders/arbor-puncta.vert.glsl
// Bead SHAPE stage — the multicolor dots strung along every member (the
// fluorescence reference's signature). Per-bead palette color rides through
// as a varying; gentle shimmer + the member's sway family so beads track
// their strand approximately. Size attenuation per the drift convention.

uniform float uTime;
uniform float uPixelScale;
uniform float uPunctaSize;
uniform float uSway;

attribute vec3 aColor;
attribute float aT;
attribute float aLimb;
attribute float aSeed;

varying vec3 vColor;
varying float vT;
varying float vLimb;
varying float vViewDist;
varying float vShimmer;

void main() {
  vColor = aColor;
  vT = aT;
  vLimb = aLimb;

  float ph = aSeed * 6.2831;
  vec3 sway = vec3(
    sin(uTime * 0.32 + ph * 3.7),
    sin(uTime * 0.21 + ph * 9.1) * 0.4,
    cos(uTime * 0.27 + ph * 5.3)
  ) * (uSway * aT * aT);

  // Slow individual shimmer — the beads breathe out of phase, never dark.
  vShimmer = 0.65 + 0.35 * sin(uTime * (0.5 + aSeed * 0.9) + ph * 17.0);

  vec4 mv = modelViewMatrix * vec4(position + sway, 1.0);
  float dist = -mv.z;
  vViewDist = dist;

  float worldSize = uPunctaSize * (0.55 + 0.9 * fract(aSeed * 13.7));
  gl_PointSize = clamp(worldSize * uPixelScale / dist, 1.0, 18.0);
  gl_Position = projectionMatrix * mv;
}
