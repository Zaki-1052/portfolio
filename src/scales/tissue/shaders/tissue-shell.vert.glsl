// src/scales/tissue/shaders/tissue-shell.vert.glsl
// Shell SHAPE stage. Displaces the base icosphere by the shared height-field
// (shell-shape.glsl): an oblong tapered ellipsoid carrying the sculpted form
// (central groove, two swelled halves, flat underside) plus GEOMETRIC
// rope-ridge relief — the ridges are real displacement, visible in the
// silhouette. The shading normal is
// finite-differenced from the SMOOTH base map only (form without ridges); the
// fragment stage re-tilts it per pixel with the exact ridge gradient, so the
// coarse and fine scales never double-count. noise.glsl + shell-shape.glsl are
// prepended by tissue-shell-material.ts; three's ShaderMaterial supplies
// position/normal/uv + matrices/cameraPosition.

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vSmoothNormal; // pure ellipsoid normal — banding-free fallback for the cavity zone
varying vec3 vViewDir;
varying float vViewDist;
varying vec3 vDir; // unit sphere direction (pre-displacement)
varying vec3 vObjPos; // sphere-space position (pre-displacement, |p| ≈ 12)
varying vec2 vUv;

const float EPS = 0.12; // tangent-plane step for the finite-difference normal
// Oblong proportions: long axis Z, squashed Y — a horizontal loaf-like dome
// over a wide base, never a vertical teardrop. The central groove (X=0 plane,
// shell-shape.glsl) therefore runs front-to-back along the long axis.
const vec3 SHAPE = vec3(1.02, 0.78, 1.32);

// Smooth base surface (no ridges): tapered ellipsoid + sculpted form. The
// finite-difference of this map gives the coarse shading normal.
vec3 toBase(vec3 sp) {
  vec3 u = normalize(sp);
  vec3 nrm = normalize(u / SHAPE);
  return sp * SHAPE * radialTaper(u.y) + nrm * baseForm(sp);
}

// One icosphere(detail 64) edge, in unit-direction space — the sampling step
// the displacement must respect.
const float EDGE = 0.0158;

void main() {
  vUv = uv;
  vec3 u = normalize(position);
  vDir = u;
  vObjPos = position;

  vec3 refAxis = abs(u.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(u, refAxis));
  vec3 bitangent = normalize(cross(u, tangent));

  vec3 nrm = normalize(u / SHAPE);
  vec3 base0 = toBase(position);

  // Frequency-clamped, band-limited ridge displacement. Two defenses, both
  // required: the SHAPE must be band-limited (ridgeProfileSmooth — a sharp
  // crevice has unbounded slope and shreds the mesh), and the PHASE must stay
  // under the mesh Nyquist — the flow field's warp locally compresses stripe
  // frequency ~3×, so we measure the actual phase step across one mesh edge
  // and fade the relief out wherever the field is genuinely unrepresentable.
  // The per-pixel shading normal keeps full detail there (it has fwidth AA);
  // only the geometry yields.
  vec3 flow0 = ridgeFlow(u, position);
  vec3 dirT = normalize(u + tangent * EDGE);
  vec3 dirB = normalize(u + bitangent * EDGE);
  vec3 flowT = ridgeFlow(dirT, dirT * 12.0);
  vec3 flowB = ridgeFlow(dirB, dirB * 12.0);
  float phase0 = RIDGE_N * flow0.x + flow0.y;
  float stepT = RIDGE_N * flowT.x + flowT.y - phase0;
  float stepB = RIDGE_N * flowB.x + flowB.y - phase0;
  // Radians per mesh edge. The field's TYPICAL step is ~1.5–2.7, so the
  // attenuation window must sit just under the π hard limit — starting it
  // lower flattens healthy relief across the whole form (painted-flat look).
  float phaseStep = length(vec2(stepT, stepB));
  float nyqAtt = 1.0 - smoothstep(2.35, 2.95, phaseStep);
  float ridge = (ridgeProfileSmooth(u, flow0) - RIDGE_MEAN) * RIDGE_RELIEF * nyqAtt;
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
