// src/scales/tissue/shaders/tissue-shell.vert.glsl
// Two-scale cortex, part 1 (the SHAPE). Displaces an ELLIPSOID (wider than tall,
// so it doesn't read as a plain orb) by the LARGE smooth fold lobes plus a deep
// sagittal fissure that splits the two hemispheres. Low frequency only — the
// dense fine gyri are bump-mapped per-pixel in the fragment shader, because
// vertex displacement can't out-resolve the triangle grid. A smooth per-vertex
// normal is reconstructed by finite-differencing the displaced-surface map
// (toSurface). noise.glsl (snoise/fbm) is prepended by tissue-shell-material.ts;
// three's ShaderMaterial supplies position/normal/uv + matrix/cameraPosition.
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vFold;
varying vec2 vUv;

const float AMP = 1.1; // depth of the big lobes
const float EPS = 0.2; // tangent-plane step for the finite-difference normal
const float FISSURE_WIDTH = 0.15; // half-width of the central fissure valley (|dir.x| units)
const float FISSURE_DEPTH = 1.2; // how far the fissure valley dips between the hemispheres
const float LOBE_HEIGHT = 0.5; // how much each hemisphere domes out beside the fissure
const vec3 SHAPE = vec3(1.1, 0.88, 1.0); // ellipsoid radii: wider than tall breaks the orb read

// Large smooth fold lobes (additive fbm, low frequency) + the two hemispheres.
// The hemisphere structure is a cross-section profile along the sagittal offset
// m = dir.x: a narrow central VALLEY (the longitudinal fissure) with a rounded
// LOBE doming out on each side, so the cleft reads as a division between two
// masses (front/top view) rather than a dent in a sphere. `extent` runs the
// profile down the whole visible face, easing only at the very bottom where the
// hemispheres merge. Slow z-drift keeps it alive at rest.
float bigFold(vec3 p) {
  vec3 dir = normalize(p);
  vec3 warp = vec3(fbm(p * 0.16 + 5.0), fbm(p * 0.16 + 15.0), fbm(p * 0.16 + 25.0));
  vec3 q = p * 0.30 + warp * 1.4 + vec3(0.0, 0.0, uTime * 0.02);
  float h = 0.5 + 0.5 * fbm(q);

  float wobble = fbm(dir * 1.5 + 40.0) * 0.05;
  float ax = abs(dir.x + wobble);
  float valley = 1.0 - smoothstep(0.0, FISSURE_WIDTH, ax);
  float lobe = smoothstep(FISSURE_WIDTH, 0.35, ax) * (1.0 - smoothstep(0.55, 0.95, ax));
  float extent = smoothstep(-0.85, -0.4, dir.y);
  h += (lobe * LOBE_HEIGHT - valley * FISSURE_DEPTH) * extent;

  return h;
}

// Map a sphere-space point (magnitude ≈12) to the displaced ellipsoid surface.
// Displacement rides the ellipsoid normal; the finite-difference of this map
// gives the correct shading normal regardless of the non-uniform SHAPE scale.
vec3 toSurface(vec3 sp) {
  vec3 u = normalize(sp);
  vec3 nrm = normalize(u / SHAPE);
  return sp * SHAPE + nrm * (bigFold(sp) * AMP);
}

void main() {
  vUv = uv;
  vec3 u = normalize(position);
  vec3 nrm = normalize(u / SHAPE);

  vec3 displaced = toSurface(position);
  vFold = bigFold(position);

  vec3 refAxis = abs(u.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(u, refAxis));
  vec3 bitangent = normalize(cross(u, tangent));
  vec3 dispT = toSurface(position + tangent * EPS);
  vec3 dispB = toSurface(position + bitangent * EPS);
  vec3 foldNormal = normalize(cross(dispT - displaced, dispB - displaced));
  if (dot(foldNormal, nrm) < 0.0) foldNormal = -foldNormal;

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * foldNormal);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
