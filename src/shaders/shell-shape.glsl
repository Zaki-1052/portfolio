// src/shaders/shell-shape.glsl
// Shared height-field for the first-scale shell — the ONE source of truth for
// the sculpted form (broad domed top, tapered base, deep central cleft, paired
// lower lobes, bottom notch) and the flow-aligned rope ridges. Prepended to
// BOTH shader stages (after noise.glsl, which provides snoise/fbm/fbm2) so
// vertex displacement and per-pixel shading always evaluate the same surface.
// Conventions: `dir` is the unit direction of a point on the base sphere; `p`
// is the raw sphere-space position (|p| ≈ 12). Heights are world units.

uniform float uTime;

// -- sculpted form --
const float TAPER = 0.84; // base-radius multiplier at the bottom (broad top, narrower low waist)
const float CLEFT_WIDTH = 0.055; // half-width of the central cleft valley, |dir.x| units — a SEAM, not a canyon
const float CLEFT_DEPTH = 1.6; // cleft recession between the two halves
const float NOTCH_EXTRA = 1.1; // additional cleft depth at the bottom notch
const float MOUND_HEIGHT = 0.9; // how far each half swells beside the cleft
const float LOBE_HEIGHT = 2.8; // paired lower-lobe bulge amplitude
const float LOBE_K = 9.0; // lobe compactness (higher = smaller, rounder bulge)
const vec3 LOBE_DIR_L = vec3(-0.301, -0.941, 0.150); // ≈unit; ~18° off straight-down → two bumps flanking the bottom notch
const vec3 LOBE_DIR_R = vec3(0.301, -0.941, 0.150);

// -- rope ridges --
const float RIDGE_N = 36.0; // stripe count over the mirrored longitude → a few dozen ropes
const float RIDGE_RELIEF = 0.6; // peak-to-valley ridge displacement, world units
const float RIDGE_MEAN = 0.6; // profile mean; displacement is centred on this
const float FINE_MULT = 3.3; // sub-striation frequency vs the main ropes
const float FINE_AMP = 0.06; // sub-striation height in profile units (bump-only, no displacement)

// Broad domed top tapering to a narrower base. Applied to the BASE radius (in
// the vertex map), not to the additive height, so it scales the silhouette.
float radialTaper(float y) {
  return mix(TAPER, 1.0, smoothstep(-0.3, 0.5, y));
}

// Large-scale sculpted height: paired swell pressing against a deep cleft
// (continuous over the crown — no apex fade), extra notch depth at the bottom,
// two lower lobes, and a whisper of broad undulation. No random mounds —
// nothing competes with the cleft.
float baseForm(vec3 p) {
  vec3 dir = normalize(p);

  float undulate = fbm2(p * 0.09 + vec3(0.0, 0.0, uTime * 0.015)) * 0.15;

  float wobble = fbm2(dir * 1.3 + 40.0) * 0.03;
  float ax = abs(dir.x + wobble);
  float valley = 1.0 - smoothstep(0.0, CLEFT_WIDTH, ax);
  float mound = smoothstep(CLEFT_WIDTH, 0.22, ax) * (1.0 - smoothstep(0.5, 0.9, ax));
  float notch = smoothstep(0.3, 0.85, -dir.y);

  float lobeL = pow(max(dot(dir, LOBE_DIR_L), 0.0), LOBE_K);
  float lobeR = pow(max(dot(dir, LOBE_DIR_R), 0.0), LOBE_K);

  // Slightly shallower over the crown: keeps the top-of-silhouette dip but
  // stops the narrow slot from reading jagged at the sparse pole sampling.
  float crownEase = 1.0 - 0.45 * smoothstep(0.75, 0.97, dir.y);

  return undulate + mound * MOUND_HEIGHT - valley * (CLEFT_DEPTH * crownEase + NOTCH_EXTRA * notch)
    + (lobeL + lobeR) * LOBE_HEIGHT;
}

// Deep-shadow factor for the cleft/notch (0 = open surface → 1 = cavity floor).
// Slightly wider than the geometric valley so shadow climbs the walls.
float cleftCavity(vec3 dir) {
  float v = 1.0 - smoothstep(0.0, CLEFT_WIDTH * 1.3, abs(dir.x));
  float notch = smoothstep(0.3, 0.85, -dir.y);
  return clamp(v * (0.8 + 0.4 * notch), 0.0, 1.0);
}

// Flow data for the rope ridges: x = phase warp (long arcs low on the form,
// tighter coils toward the crown), y = dual-density blend (genuine
// branch/merge, not just wiggle). This is the expensive part — evaluate ONCE
// per pixel/vertex and reuse across finite-difference taps, where it is
// locally constant.
vec2 ridgeFlow(vec3 dir, vec3 p) {
  float top = smoothstep(0.25, 0.85, dir.y);
  float warp = fbm2(p * 0.13 + 4.0) * mix(2.2, 4.5, top) + snoise(p * 0.5 + 14.0) * 0.7;
  // Blend capped low: past ~0.5 the two sine systems interfere and dissolve
  // the rope structure into mush instead of branching it.
  float branch = smoothstep(-0.1, 0.2, fbm2(p * 0.09 + 31.0)) * 0.35;
  return vec2(warp, branch);
}

// Rounded rope cross-profile at a direction, given precomputed flow: 0 =
// groove floor → 1 = crest. Trig-only, cheap enough to re-run per
// finite-difference tap. The mirrored longitude keeps the pattern bilaterally
// symmetric with its phase kink hidden inside the cleft; the epsilon avoids
// the undefined atan(0, 0) at the poles. Fat domed crests, narrow grooves.
float ridgeProfile(vec3 dir, vec2 flow) {
  float theta = atan(dir.z, abs(dir.x) + 1e-4);
  float s = mix(
    sin(RIDGE_N * theta + flow.x),
    sin(RIDGE_N * 0.5 * theta + flow.x * 1.1),
    flow.y
  );
  // Packed-tube profile: each cycle is one full softly-domed rope — steep out
  // of the groove (thin crevice), broad rounded crest. No plateaus.
  float ridge = pow(0.5 + 0.5 * s, 0.42);

  float cleftGap = smoothstep(0.015, 0.05, abs(dir.x)); // ropes run up to the seam
  float poleFade = 1.0 - smoothstep(0.955, 0.985, abs(dir.y)); // anti-singularity cone only
  return mix(RIDGE_MEAN, ridge, cleftGap * poleFade);
}

// Main ropes + fine sub-striations riding their flanks (strands within each
// coil). Fragment-only detail height for the per-pixel normal: `finePhase` is
// the slow per-position phase jitter and `fineScale` the anti-alias fade —
// both precomputed once per pixel and held constant across the FD taps.
float detailHeight(vec3 dir, vec2 flow, float finePhase, float fineScale) {
  float main = ridgeProfile(dir, flow);
  float theta = atan(dir.z, abs(dir.x) + 1e-4);
  float fine = sin(RIDGE_N * FINE_MULT * theta + flow.x * 2.2 + finePhase);
  return main + fine * (FINE_AMP * fineScale) * smoothstep(0.15, 0.5, main);
}

// Total additive height over the tapered base ellipsoid at sphere point p.
float shellHeight(vec3 p) {
  vec3 dir = normalize(p);
  return baseForm(p) + (ridgeProfile(dir, ridgeFlow(dir, p)) - RIDGE_MEAN) * RIDGE_RELIEF;
}
