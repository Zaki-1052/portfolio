// src/shaders/shell-shape.glsl
// Shared height-field for the first-scale shell — the ONE source of truth for
// the sculpted form and the packed coil ridges. The macro form is a
// PARAMETERIZED superellipsoid (uniforms, defaults in shell-params.ts, driven
// live by the tissue-preview leva panel): top-heavy vertical mass profile,
// boxiness exponent for slab-like halves, a deep central groove that can close
// toward the rear, a rear-top overhang, and a distinct lower-rear sub-mass
// with its own finer lateral banding, tucked under a separating fold. The
// coils come from a baked Gray-Scott reaction-diffusion texture (see
// coil-bake.glsl): uniform-width worms that turn, loop, branch, and pack into
// each other — by construction. Prepended to BOTH shader stages (after
// noise.glsl, which provides snoise/fbm/fbm2) so vertex displacement and
// per-pixel shading always evaluate the same surface.
// Conventions: `dir` is the unit direction of a point on the base sphere; `p`
// is the raw sphere-space position (|p| ≈ 12). Heights are world units. The
// long axis is Z (uShapeDims, applied in the vertex stage); the groove lies
// in the X=0 plane, so it crosses the crown front-to-back and splits
// left/right halves. The sub-mass sits at the lower rear (−Y/−Z).

uniform float uTime;
uniform sampler2D uCoilTex; // baked coil field: r crisp, g blurred (C1), b mottle, a strands

// -- macro form (see shell-params.ts for the shipped values) --
uniform vec3 uShapeDims; // superellipsoid semi-axes: X width, Y height, Z length
uniform float uBoxiness; // 2 = ellipsoid; higher = slab-like halves, steeper walls
uniform float uShoulderY; // unit-y of the widest shoulder line
uniform float uShoulderBulge; // how strongly the shoulders bulge
uniform float uBaseTuck; // underside pull-in (top-heavy mass distribution)
uniform float uBottomFlat; // extra radial squash at the underside → wide, level base
uniform float uCleftWidth; // half-width of the central groove, |dir.x| units
uniform float uCleftDepth; // groove depth — a deep narrow slot between the halves
uniform float uMoundHeight; // how far each half swells beside the groove
uniform float uGrooveRearFade; // 0..1 — how much the groove closes toward the rear
uniform float uOverhang; // rear-top backward bulge (breaks side-view convexity)
uniform vec2 uSubMassPos; // sub-mass center direction (y, z; normalized here)
uniform float uSubMassCos; // cos(angular radius) of the sub-mass footprint
uniform float uSubMassHeight; // sub-mass height, world units
uniform float uSepFold; // depth of the fold separating sub-mass from main mass
uniform float uFrontLift; // front-lower lift — blunter, slightly raised front
uniform float uProfileFlip; // 0 = flat face DOWN (egg on a table) … 1 = flat plateau UP (the reference read)
uniform float uFineAmp; // crest strand amplitude (fragment-only bump)
uniform float uPleatAmp; // groove-wall pleat amplitude (fragment-only bump)
uniform float uPleatFreq; // pleat corrugation frequency along the groove

const float ASYM_HEIGHT = 0.35; // per-half low-frequency height offset — breaks the perfect mirror
const float COIL_MEAN = 0.5; // shaped-field mean; displacement is centred on this
const float RIDGE_RELIEF = 0.7; // peak-to-valley coil displacement, world units

// Vertical mass profile applied to the BASE radius: widest at the shoulders,
// tucking in toward the underside — the top-heavy distribution that keeps the
// form from reading as a bottom-heavy pill. uProfileFlip moves the flat-face
// squash between the two ends: at 0 it flattens the BOTTOM (egg on a table);
// at 1 it flattens the TOP into the broad crown plateau of the reference
// read, leaving the underside rounded and tucked. The groove, coils, and
// sub-mass are keyed on dir independently, so they stay put either way.
float radialProfile(float y) {
  float shoulder = 1.0 + uShoulderBulge * exp(-pow((y - uShoulderY) / 0.55, 2.0));
  float tuck = mix(1.0 - uBaseTuck, 1.0, smoothstep(-0.95, uShoulderY, y));
  float flatB = mix(1.0, uBottomFlat, smoothstep(0.45, 0.95, mix(-y, y, uProfileFlip)));
  return shoulder * tuck * flatB;
}

// Groove envelope shared by the height field and the cavity shadow: widest and
// deepest along the crown (where the plunge enters), gone on the underside so
// the base stays unbroken.
float grooveCrown(vec3 dir) {
  return smoothstep(0.15, 0.85, dir.y);
}
float grooveUnderFade(vec3 dir) {
  return 1.0 - smoothstep(0.15, 0.6, -dir.y);
}
// Rear close-over: the halves converge over the sub-mass, so the groove
// shallows toward −Z — strongly, from mid-body back, so the rear genuinely
// reads as ONE merged mass with a fading surface crease (a full-length open
// split is the UNDERSIDE's signature, not the crown's). The plunge entry
// (aperture ≈ z −0.4 crown) keeps ~3/4 of the groove depth.
float grooveAmp(vec3 dir) {
  return 1.0 - uGrooveRearFade * smoothstep(0.15, 0.9, -dir.z);
}

vec3 subMassDir() {
  return normalize(vec3(0.0, uSubMassPos.x, uSubMassPos.y));
}
// Footprint mask of the lower-rear sub-mass (0 outside → 1 at its center).
// Shared: height field, banded texture register, and shading all key on it.
float subMassMask(vec3 dir) {
  float d = dot(dir, subMassDir());
  return smoothstep(uSubMassCos, mix(uSubMassCos, 1.0, 0.55), d);
}
// The fold separating the sub-mass from the main mass — a clean deep crease.
// Shared by the height field (the trench), the ridge gate (coils stand off a
// crease, exactly like the groove), and the cavity shadow (coils running
// through a tangent-viewed trench read as a serrated streak-fan otherwise).
float sepFoldMask(vec3 dir) {
  float d = dot(dir, subMassDir());
  return exp(-pow((d - uSubMassCos) / 0.11, 2.0)) * clamp(uSepFold, 0.0, 1.0);
}

// Large-scale sculpted height: paired swell pressing against the deep central
// groove, per-half asymmetry, rear overhang, the tucked sub-mass with its
// separating fold, and a whisper of broad undulation.
float baseForm(vec3 p) {
  vec3 dir = normalize(p);

  float undulate = fbm2(p * 0.09 + vec3(0.0, 0.0, uTime * 0.015)) * 0.15;

  float crown = grooveCrown(dir);
  // The edge wobble is character at a distance but reads as jagged jitter on
  // the slot rim at the close crack-hover framing — calm it over the crown.
  float wobble = fbm2(dir * 1.3 + 40.0) * 0.03 * (1.0 - 0.75 * crown);
  float ax = abs(dir.x + wobble);

  float underFade = grooveUnderFade(dir);
  float gAmp = grooveAmp(dir);
  // 1.4 crown widening (was 2.5): the crown split is a narrow crease pressed
  // between the halves — a GROOVE, not a gaping crack.
  float cleftW = uCleftWidth * (1.0 + 1.4 * crown * gAmp);
  // pow > 1 rounds the SHOULDER of the slot (gentle entry into the wall)
  // while leaving the deep center untouched — the rim crease stays smooth
  // instead of aliasing across the mesh.
  float valley = pow(1.0 - smoothstep(0.0, cleftW, ax), 1.35);
  // Swell tight to the groove: concentrates each half's mass beside the slot
  // so the two halves read as full rounded lobes pressed together. Fades with
  // the rear close-over — merged halves have no canyon lips.
  float mound = smoothstep(cleftW, 0.3, ax) * (1.0 - smoothstep(0.55, 0.95, ax))
    * (0.45 + 0.55 * gAmp);

  // Per-half asymmetry, gated to zero at the groove so the field stays
  // continuous across the mirror plane.
  float side = step(0.0, dir.x);
  float sideGate = smoothstep(cleftW, 0.35, ax);
  float asym = mix(snoise(dir * 1.1 + 23.0), snoise(dir * 1.1 + 57.0), side) * ASYM_HEIGHT * sideGate;

  // Rear-top overhang: a broad bulge pushing the upper rear outward.
  float over = pow(max(dot(dir, normalize(vec3(0.0, 0.42, -0.91))), 0.0), 2.0) * uOverhang;

  // Lower-rear sub-mass + the fold separating it from the main mass above.
  float sm = subMassMask(dir);
  float subm = pow(sm, 0.8) * uSubMassHeight;
  float dSub = dot(dir, subMassDir());
  float ring = exp(-pow((dSub - uSubMassCos) / 0.11, 2.0)) * uSepFold;

  // Front-lower lift: the front end sits blunter and slightly raised.
  float lift = uFrontLift * smoothstep(0.15, 0.9, dir.z) * smoothstep(0.2, -0.4, dir.y) * 0.8;

  return undulate + asym + mound * uMoundHeight + over + subm - ring + lift
    - valley * uCleftDepth * (1.0 + 0.5 * crown) * underFade * gAmp;
}

// Deep-shadow factor for the groove (0 = open surface → 1 = cavity floor).
// Slightly wider than the geometric valley so shadow climbs the walls.
float cleftCavity(vec3 dir) {
  float gAmp = grooveAmp(dir);
  float w = uCleftWidth * (1.0 + 1.4 * grooveCrown(dir) * gAmp) * 1.45;
  float v = 1.0 - smoothstep(0.0, w, abs(dir.x));
  return clamp(v * grooveUnderFade(dir) * gAmp, 0.0, 1.0);
}

// Coil texture coordinate: full-turn equirect, NO mirror — abs(atan) folds
// would stamp a Rorschach butterfly down each flank center. u runs 2 aspect-
// balanced repeats around the equator (the sim is toroidal + RepeatWrapping,
// so the u wrap is seamless; the two copies sit on opposite sides of the form
// and are never co-visible). EVERY degeneracy falls in a ridge-gated zone:
// the atan discontinuity meridian is x=0, z<0 — inside the groove strip where
// ridgeGate zeroes the coils — and both poles are ±Y (groove crown / base
// fade).
vec2 coilUv(vec3 dir) {
  return vec2(atan(dir.x, dir.z) / 3.14159265 + 1.0, dir.y * 0.5 + 0.5);
}
// The sub-mass's texture register: the same field in a LOCAL planar frame
// centered on the sub-mass (the equirect pinches near the −Y pole, which the
// sub-mass straddles — mapping it through coilUv paints a radial fan).
// T1 points from the sub-mass toward the main mass, T2 runs laterally; the
// stack axis (T1) is compressed so fine bands run AROUND the mass.
vec2 coilUvBand(vec3 dir) {
  vec3 c = subMassDir();
  vec3 t1 = normalize(vec3(0.0, c.z, -c.y)); // ⊥ c, in the YZ plane — toward the main mass
  vec3 t2 = cross(c, t1); // lateral (±X)
  return vec2(dot(dir, t2), dot(dir, t1) * 2.6) * 0.35 + vec2(0.5, 0.5);
}

// Damp the coil field near both poles, where the equirect UV degenerates.
float poleCapFade(vec3 dir) {
  return 1.0 - smoothstep(0.82, 0.965, abs(dir.y));
}

// Fade the coils out at the underside only, so the base reads as smooth
// material. The crown KEEPS its ridges — the camera skims them during the
// arrival finale.
float ridgeCapFade(vec3 dir) {
  return 1.0 - smoothstep(0.7, 0.92, -dir.y);
}

// Groove-only gating: coils crowd right up against the crease (a dark line
// WITHIN the coil field, not a bald canyon) and stand off the separation
// fold. This part applies to EVERY coil register, including the planar caps.
float grooveGate(vec3 dir) {
  float gapW = 0.035 + 0.06 * grooveCrown(dir) * grooveAmp(dir);
  return smoothstep(0.015, gapW, abs(dir.x)) * (1.0 - 0.85 * sepFoldMask(dir));
}

// Full gating for the EQUIRECT register: groove stand-off + underside fade
// (the sub-mass punches through — its banded register IS its identity) + the
// pole damp where the equirect UV degenerates.
float ridgeGate(vec3 dir) {
  float capFade = mix(ridgeCapFade(dir), 1.0, 0.85 * subMassMask(dir));
  return grooveGate(dir) * capFade * poleCapFade(dir);
}

// Planar-cap blend: the equirect pinches at both ±Y poles (kaleidoscope
// streaks on the exterior crown, blurry smear/spider on the interior caps).
// Those zones swap to a planar XZ projection — distortion-free exactly where
// the equirect degenerates. Exterior crown: yes. Interior (pass 1): both
// caps. Exterior underside stays bald (flat clean base by design).
float capBlendK(vec3 dir, float interior) {
  float capBase = smoothstep(0.5, 0.78, abs(dir.y));
  return capBase * max(interior, smoothstep(0.05, 0.25, dir.y));
}

// One blended tap of the coil texture: main register crossfaded to the
// sub-mass's banded register by its footprint mask (two samples blended —
// never a warped UV, which would smear the transition).
vec4 coilTap(vec3 dir) {
  vec4 t = texture2D(uCoilTex, coilUv(dir));
  float m = subMassMask(dir);
  if (m > 0.001) {
    t = mix(t, texture2D(uCoilTex, coilUvBand(dir)), m);
  }
  return t;
}

// SHADING height (per-pixel normal + crevice AO): the crisp baked channel —
// broad rounded crests, narrow deep crevices. Gated toward the neutral mean so
// the groove walls and base shade smooth.
float coilHeight(vec3 dir) {
  return mix(COIL_MEAN, coilTap(dir).r, ridgeGate(dir));
}

// DISPLACEMENT height: the blurred channel — C1 and band-limited BY THE BAKE
// (a gaussian in texel space bounds the slope everywhere), so the mesh never
// tears and no runtime frequency-clamping is needed. The crisp crevices live
// in the per-pixel normal; geometry carries smooth rounded waves.
// MAIN register only: the sub-mass's banded register compresses v 3×, which
// puts its wavelength under the mesh edge — geometry there calms toward the
// mean and the fragment normal carries the fine banding instead.
// The exterior crown cap blends to the planar register (same blur-limited
// channel at matched world scale, so it is equally mesh-safe) — the crown
// silhouette keeps real scallops instead of going smooth at the pole.
float coilHeightSmooth(vec3 dir) {
  float hEq = mix(COIL_MEAN, texture2D(uCoilTex, coilUv(dir)).g, ridgeGate(dir));
  float capK = capBlendK(dir, 0.0); // vertices have no facing — exterior rule
  if (capK > 0.001) {
    float hPl = mix(COIL_MEAN, texture2D(uCoilTex, dir.xz * 0.32 + 0.5).g, grooveGate(dir));
    hEq = mix(hEq, hPl, capK);
  }
  return mix(hEq, COIL_MEAN + (hEq - COIL_MEAN) * 0.35, subMassMask(dir));
}

// Groove-wall zone (the apron between the coil stand-off and the slot floor)
// — carries the pleat corrugations so the crack never reads unrendered.
float grooveWall(vec3 dir) {
  float crown = grooveCrown(dir) * grooveAmp(dir);
  float w = uCleftWidth * (1.0 + 1.4 * crown);
  return smoothstep(w * 3.2, w * 1.1, abs(dir.x)) * crown * grooveUnderFade(dir);
}

// Pleats: fine corrugations descending the groove walls, phase along the slot
// (front-to-back) with a slow jitter so they read grown, not machined.
float pleats(vec3 dir) {
  return sin(dir.z * uPleatFreq + snoise(dir * 6.0) * 1.4);
}
