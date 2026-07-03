// src/shaders/shell-shape.glsl
// Shared height-field for the first-scale shell — the ONE source of truth for
// the sculpted form (oblong domed mass on a wide flat base, deep central
// groove running front-to-back along the long axis, two subtly asymmetric
// halves) and the coiled rope ridges (a wandering, looping flow field — never
// straight pole-to-pole stripes). Prepended to BOTH shader stages (after
// noise.glsl, which provides snoise/fbm/fbm2) so vertex displacement and
// per-pixel shading always evaluate the same surface.
// Conventions: `dir` is the unit direction of a point on the base sphere; `p`
// is the raw sphere-space position (|p| ≈ 12). Heights are world units. The
// long axis is Z (set by SHAPE in the vertex stage); the groove lies in the
// X=0 plane, so it crosses the crown front-to-back and splits left/right
// halves.

uniform float uTime;

// -- sculpted form --
const float TAPER = 0.94; // base-radius multiplier low on the form — broad, no narrow foot
const float BOTTOM_FLAT = 0.72; // extra radial squash at the underside → wide, level base
const float CLEFT_WIDTH = 0.07; // half-width of the central groove, |dir.x| units
const float CLEFT_DEPTH = 1.9; // groove depth — a deep narrow slot between the halves
const float MOUND_HEIGHT = 0.8; // how far each half swells beside the groove
const float ASYM_HEIGHT = 0.35; // per-half low-frequency height offset — breaks the perfect mirror

// -- coiled rope ridges --
const float RIDGE_N = 44.0; // stripe count over the flow coordinate — dense, intricate packed coils (picked by eye)
const float RIDGE_RELIEF = 0.85; // peak-to-valley ridge displacement, world units
const float RIDGE_MEAN = 0.55; // profile mean; displacement is centred on this
const float FINE_MULT = 3.3; // sub-striation frequency vs the main ropes
const float FINE_AMP = 0.035; // sub-striation height in profile units (bump-only, no displacement)

// Broad domed top over a wide base. Applied to the BASE radius (in the vertex
// map), not to the additive height, so it scales the silhouette. The lower
// hemisphere squashes toward a level underside instead of tapering to a point.
float radialTaper(float y) {
  float t = mix(TAPER, 1.0, smoothstep(-0.3, 0.5, y));
  return t * mix(1.0, BOTTOM_FLAT, smoothstep(0.45, 0.95, -y));
}

// Groove envelope shared by the height field and the cavity shadow: widest and
// deepest along the crown (where the plunge enters), gone on the underside so
// the flat base stays unbroken.
float grooveCrown(vec3 dir) {
  return smoothstep(0.15, 0.85, dir.y);
}
float grooveUnderFade(vec3 dir) {
  return 1.0 - smoothstep(0.15, 0.6, -dir.y);
}

// Large-scale sculpted height: paired swell pressing against the deep central
// groove, per-half asymmetry, and a whisper of broad undulation. No random
// mounds — nothing competes with the groove.
float baseForm(vec3 p) {
  vec3 dir = normalize(p);

  float undulate = fbm2(p * 0.09 + vec3(0.0, 0.0, uTime * 0.015)) * 0.15;

  float crown = grooveCrown(dir);
  // The edge wobble is character at a distance but reads as jagged jitter on
  // the slot rim at the close crack-hover framing — calm it over the crown.
  float wobble = fbm2(dir * 1.3 + 40.0) * 0.03 * (1.0 - 0.75 * crown);
  float ax = abs(dir.x + wobble);

  float underFade = grooveUnderFade(dir);
  float cleftW = CLEFT_WIDTH * (1.0 + 2.5 * crown);
  // pow > 1 rounds the SHOULDER of the slot (gentle entry into the wall)
  // while leaving the deep center untouched — the rim crease stays smooth
  // instead of aliasing across the mesh.
  float valley = pow(1.0 - smoothstep(0.0, cleftW, ax), 1.35);
  // Swell tight to the groove: concentrates each half's mass beside the slot
  // so the two halves read as full rounded lobes pressed together.
  float mound = smoothstep(cleftW, 0.3, ax) * (1.0 - smoothstep(0.55, 0.95, ax));

  // Per-half asymmetry, gated to zero at the groove so the field stays
  // continuous across the mirror plane.
  float side = step(0.0, dir.x);
  float sideGate = smoothstep(cleftW, 0.35, ax);
  float asym = mix(snoise(dir * 1.1 + 23.0), snoise(dir * 1.1 + 57.0), side) * ASYM_HEIGHT * sideGate;

  return undulate + asym + mound * MOUND_HEIGHT
    - valley * CLEFT_DEPTH * (1.0 + 0.5 * crown) * underFade;
}

// Deep-shadow factor for the groove (0 = open surface → 1 = cavity floor).
// Slightly wider than the geometric valley so shadow climbs the walls.
float cleftCavity(vec3 dir) {
  float w = CLEFT_WIDTH * (1.0 + 2.5 * grooveCrown(dir)) * 1.45;
  float v = 1.0 - smoothstep(0.0, w, abs(dir.x));
  return clamp(v * grooveUnderFade(dir), 0.0, 1.0);
}

// Flow data for the rope ridges — the ONE place the stripe coordinate is
// defined, consumed identically by the vertex displacement, the per-pixel
// normal, and the fine sub-striations. Returns:
//   x = theta — the blended flow coordinate. Near the groove its isolines run
//       parallel to the groove (front-to-back); out on the flanks they wrap
//       laterally around the form. The blend of the two fields is what makes
//       the ropes turn and pack instead of running straight.
//   y = warp — multi-scale phase warp; large amplitude so ropes meander and
//       fold back rather than merely wiggling.
//   z = branch — dual-density blend (genuine branch/merge, not just wiggle).
//       Capped low: past ~0.5 the two sine systems interfere and dissolve the
//       rope structure into mush instead of branching it.
// This is the expensive part — evaluate ONCE per pixel/vertex and reuse across
// finite-difference taps, where it is locally constant.
const vec3 LAT_AXIS = vec3(0.316, 0.837, -0.446); // pre-normalized tilted latitude axis

vec3 ridgeFlow(vec3 dir, vec3 p) {
  // Vector domain warp: bend the direction the coordinate fields are read at,
  // so the coils turn, loop, and pack while stripe frequency stays bounded.
  // Two-octave warp, chosen BY EYE over the calmer single-octave variant: the
  // fine jitter it adds reads as intricate coil texture. Known tradeoff: its
  // high-octave gradient can push local stripe frequency into light sawtooth
  // in a few compression pockets at grazing angles.
  float n1 = fbm2(p * 0.16 + 51.0);
  float n2 = fbm2(p * 0.16 + 87.0);
  vec3 dirW = normalize(dir + vec3(n1, n2, 0.7 * (n1 - n2)) * 0.3);

  // Two LINEAR coordinates — angular coordinates (atan/asin) densify toward
  // their axes and alias into fingerprint patches, so both fields are plain
  // projections with bounded gradients everywhere. u: distance from the groove
  // plane — isolines run front-to-back, groove-parallel. v: height along a
  // tilted axis — isolines arc diagonally around the flanks.
  float u = dirW.x * 2.2;
  // Higher lateral scale than u: v's gradient sags toward the flank centers,
  // and without the boost the flank ropes stretch into wide flat plates with
  // thin drawn-on separations instead of packed tubes.
  float v = dot(dirW, LAT_AXIS) * 3.5;
  // Handover where u's own gradient fades (flank centers, |dir.x| → 1),
  // capped so a floor of u survives where v's gradient fades in turn.
  float flankT = smoothstep(0.15, 0.6, abs(dir.x)) * 0.8;
  // Interlock fold: stripes periodically hook back along the cross coordinate
  // (the classic sin(u + K·sin(v)) fold), which packs neighboring coils into
  // each other instead of stacking them in parallel. Reuses n2 — no new noise.
  float fold = sin(v * 3.0 + n2 * 2.0) * 0.22;
  float theta = mix(u, v, flankT) + fold;

  float warp = snoise(p * 0.19 + 14.0) * 1.8;
  float branch = smoothstep(-0.1, 0.2, fbm2(p * 0.09 + 31.0)) * 0.4;
  return vec3(theta, warp, branch);
}

// Damp the RD texture near both poles, where its equirect UV degenerates.
float poleCapFade(vec3 dir) {
  return 1.0 - smoothstep(0.82, 0.965, abs(dir.y));
}

// Fade the ropes AND their sub-striations out at the underside only, so the
// flat base reads as smooth material. The crown KEEPS its ridges — the camera
// skims them during the arrival finale.
float ridgeCapFade(vec3 dir) {
  return 1.0 - smoothstep(0.7, 0.92, -dir.y);
}

// Shared stripe field (dual-density branch/merge blend) for both profiles.
float ridgeStripe(vec3 flow) {
  return mix(
    sin(RIDGE_N * flow.x + flow.y),
    sin(RIDGE_N * 0.5 * flow.x + flow.y * 1.1),
    flow.z
  );
}

// Shared gating: ropes run right up to the groove edge at mid-body, but stand
// back from the steepened crown walls — their terminations would otherwise
// castellate the slot rim into a jagged silhouette at the crack-hover framing
// — and fade out at the flat underside.
float ridgeGate(vec3 dir) {
  float gapW = 0.05 + 0.11 * grooveCrown(dir);
  return smoothstep(0.02, gapW, abs(dir.x)) * ridgeCapFade(dir);
}

// SHADING cross-profile (per-pixel normal only): 0 = groove floor → 1 =
// crest. `t^0.45` gives the broad rounded crest; the extra smoothstep carves
// the bottom of the cycle into a thin deep crevice so ropes stay defined (not
// melted together) at close framing under heavy bloom.
float ridgeProfile(vec3 dir, vec3 flow) {
  float t = 0.5 + 0.5 * ridgeStripe(flow);
  float ridge = pow(t, 0.45) * smoothstep(0.0, 0.18, t);
  return mix(RIDGE_MEAN, ridge, ridgeGate(dir));
}

// DISPLACEMENT cross-profile: the same stripe field shaped as a C1 smoothstep
// bump, whose slope is bounded by the stripe frequency. The sharp shading
// profile must NEVER displace vertices — pow's slope is unbounded at the
// crevice floor, so adjacent vertices leap between floor and crest and the
// mesh tears into triangle shards at grazing angles that no subdivision can
// fix. Geometry carries smooth rounded waves; the crisp crevices live in the
// per-pixel normal above.
float ridgeProfileSmooth(vec3 dir, vec3 flow) {
  float t = 0.5 + 0.5 * ridgeStripe(flow);
  float ridge = t * t * (3.0 - 2.0 * t);
  return mix(RIDGE_MEAN, ridge, ridgeGate(dir));
}

// Main ropes + fine sub-striations riding their flanks (strands within each
// coil). Fragment-only detail height for the per-pixel normal: `finePhase` is
// the slow per-position phase jitter, `fineScale` the anti-alias fade, and
// `rdMod` the reaction-diffusion micro-relief modulation — all precomputed
// once per pixel and held constant across the FD taps.
float detailHeight(vec3 dir, vec3 flow, float finePhase, float fineScale, float rdMod) {
  float main = ridgeProfile(dir, flow);
  float fine = sin(RIDGE_N * FINE_MULT * flow.x + flow.y * 2.2 + finePhase);
  // Crest-top mask (0.45→0.72): strands ride the tops of the ropes only.
  // A wall-inclusive mask paints hairline onion-ring echoes around every
  // channel and clutters the side read.
  return main
    + fine * (FINE_AMP * fineScale * rdMod) * smoothstep(0.45, 0.72, main) * ridgeCapFade(dir);
}

