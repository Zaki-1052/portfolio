// src/scales/tissue/shaders/tissue-shell.vert.glsl
// Shell SHAPE stage. Displaces the base icosphere by the shared height-field
// (shell-shape.glsl): an oblong tapered ellipsoid carrying the sculpted form
// (central groove, two swelled halves, flat underside) plus GEOMETRIC
// coil-ridge relief — the ridges are real displacement, visible in the
// silhouette. The displacement channel is pre-blurred in the bake (C1,
// band-limited in texel space), so it can never out-run the mesh — the old
// runtime Nyquist clamp is gone with the warped-sine field that needed it.
// The shading normal is finite-differenced from the SMOOTH base map only
// (form without ridges); the fragment stage re-tilts it per pixel with the
// exact coil gradient, so the coarse and fine scales never double-count.
// noise.glsl + shell-shape.glsl are prepended by tissue-shell-material.ts;
// three's ShaderMaterial supplies position/normal/uv + matrices/cameraPosition.

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vSmoothNormal; // pure ellipsoid normal — banding-free fallback for the cavity zone
varying vec3 vViewDir;
varying float vViewDist;
varying vec3 vDir; // unit sphere direction (pre-displacement)
varying vec3 vObjPos; // sphere-space position (pre-displacement, |p| ≈ 12)
varying vec2 vUv;

const float EPS = 0.12; // tangent-plane step for the finite-difference normal

// Smooth base surface (no ridges): parameterized superellipsoid + vertical
// mass profile + sculpted form (uShapeDims/uBoxiness/radialProfile — see
// shell-params.ts). The boxiness factor is a radial correction relative to
// the ellipsoid (identity at exponent 2), pushing diagonal directions outward
// so each half reads as a slab with steeper walls instead of an ovoid. The
// finite-difference of this map gives the coarse shading normal.
vec3 toBase(vec3 sp) {
  vec3 u = normalize(sp);
  vec3 P = sp * uShapeDims * radialProfile(u.y);
  vec3 d = max(abs(normalize(P)), vec3(1e-4));
  float n = uBoxiness;
  float f = pow(pow(d.x, n) + pow(d.y, n) + pow(d.z, n), -1.0 / n);
  vec3 nrm = normalize(u / uShapeDims);
  return P * f + nrm * baseForm(sp);
}

void main() {
  vUv = uv;
  vec3 u = normalize(position);
  vDir = u;
  vObjPos = position;

  vec3 refAxis = abs(u.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(u, refAxis));
  vec3 bitangent = normalize(cross(u, tangent));

  vec3 nrm = normalize(u / uShapeDims);
  vec3 base0 = toBase(position);

  // Coil relief from the pre-blurred displacement channel (vertex texture
  // fetch samples the base mip — the channel is already band-limited, so no
  // explicit lod juggling is needed).
  float ridge = (coilHeightSmooth(u) - COIL_MEAN) * RIDGE_RELIEF;
  vec3 displaced = base0 + nrm * ridge;

  vec3 baseT = toBase(position + tangent * EPS);
  vec3 baseB = toBase(position + bitangent * EPS);
  vec3 baseNormal = normalize(cross(baseT - base0, baseB - base0));
  if (dot(baseNormal, nrm) < 0.0) baseNormal = -baseNormal;

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * baseNormal);
  vSmoothNormal = normalize(mat3(modelMatrix) * nrm);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
