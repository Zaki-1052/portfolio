// src/scales/cellular/shaders/arbor-strand.vert.glsl
// Ribbon strand SHAPE stage. Each strand edge is a quad whose `position`
// holds the true endpoint; here it inflates into a camera-facing ribbon —
// axis = cross(edgeDir, viewRay) — with a real width taper (WebGL lines
// clamp to 1px). Sway is a pure function of uTime + per-NODE seed (adjacent
// segments share endpoints' seeds, so chains stay watertight), scaled by t²
// so only the periphery breathes. Frozen under reduced motion (uTime = 0).

uniform float uTime;
uniform float uWidthScale;
uniform float uSway;

attribute vec3 aEdgeDir;
attribute float aSide;
attribute float aT;
attribute float aRadius;
attribute float aLimb;
attribute float aSeed;

varying float vT;
varying float vLimb;
varying float vAcross;
varying float vViewDist;

void main() {
  vT = aT;
  vLimb = aLimb;
  vAcross = aSide;

  float ph = aSeed * 6.2831;
  vec3 sway = vec3(
    sin(uTime * 0.32 + ph * 3.7),
    sin(uTime * 0.21 + ph * 9.1) * 0.4,
    cos(uTime * 0.27 + ph * 5.3)
  ) * (uSway * aT * aT);

  vec4 world = modelMatrix * vec4(position + sway, 1.0);
  vec3 toCam = cameraPosition - world.xyz;
  vec3 edgeW = normalize(mat3(modelMatrix) * aEdgeDir);
  vec3 axis = cross(edgeW, toCam);
  float axisLen = length(axis);
  // Edge parallel to the view ray → axis degenerates; any perpendicular works
  // (the ribbon is end-on and covers ~no pixels).
  axis = axisLen > 1e-5 ? axis / axisLen : vec3(0.0, 1.0, 0.0);

  float halfWidth = max(aRadius * uWidthScale, 0.012);
  world.xyz += axis * (aSide * halfWidth);

  vViewDist = length(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
