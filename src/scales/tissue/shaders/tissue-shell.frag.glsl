// src/scales/tissue/shaders/tissue-shell.frag.glsl
// Shell SHADING stage. The vertex stage displaced real coil relief into the
// silhouette under a smooth base normal; here the SAME baked coil field
// (shared shell-shape.glsl, same equirect mapping) re-tilts the normal per
// pixel via its crisp channel, so shading and silhouette always agree. The
// texture's mips give distance anti-aliasing for free — no phase-based fades.
// Look: warm cream, matte — hemisphere ambient + wrapped warm key from
// above/front give soft rounded gradients; a faint broad sheen suggests
// dampness without gloss; cavity AO carries the deep central-groove shadow and
// the narrow coil crevices (shadow, not color). Existing plumbing kept: mottle,
// fog, content dimming (uOpacity), and the breakthrough dissolve aperture.
uniform float uOpacity;
uniform vec3 uBaseColor;
uniform vec3 uFresnelColor;
uniform float uFresnelPower;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uRDBlend;
uniform float uDissolve;
uniform float uDissolveRadius;
uniform vec3 uDissolveEdgeColor;
uniform vec3 uApertureDir;
uniform float uLook; // 0 = crisp matte sculpture … 1 = soft dreamy bloom-glow

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vSmoothNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying vec3 vDir;
varying vec3 vObjPos;
varying vec2 vUv;

const float GRAD_EPS = 0.012; // dir-space step for the per-pixel coil gradient
const float RADIUS = 12.0; // base sphere radius (dir-space → world slope)

// Full per-pixel detail height: gated coil crests + fine strands riding the
// crest tops (fineK is pre-scaled by the grazing damp, constant across the FD
// taps) + pleat corrugations filling the groove walls — so the crack never
// reads as an unrendered blank.
// capK (interior pole caps only): the equirect pinches at ±Y — seen from
// inside, that's the blurry smear on the ceiling strip and the radial spider
// on the floor. Swap those zones to a planar projection, which is
// distortion-free exactly where the equirect degenerates. The planar
// coordinate derives from dir (not the fixed fragment position), so the FD
// taps still see a real gradient and the caps shade as modeled coils.
float shellDetail(vec3 dir, float fineK, float capK) {
  vec4 t = coilTap(dir);
  float gate = ridgeGate(dir);
  float h = mix(COIL_MEAN, t.r, gate);
  h += (t.a - 0.5) * fineK * smoothstep(0.55, 0.78, h) * gate;
  if (capK > 0.001) {
    // 0.32 ≈ (12 texel wavelength / 512) · π⁻¹-matched: planar tube width equals
    // the equirect's equator tube width, so the blend zone stays scale-continuous.
    // The planar register still respects the groove stand-off (grooveGate) —
    // coils must never run across the crease.
    vec4 tc = texture2D(uCoilTex, dir.xz * 0.32 + 0.5);
    float gGate = grooveGate(dir);
    float hc = mix(COIL_MEAN, tc.r, gGate);
    hc += (tc.a - 0.5) * fineK * smoothstep(0.55, 0.78, hc) * gGate;
    // Interlock blend: crest-weighted, so the two registers WEAVE through the
    // transition band (junctions read as natural coil merges) instead of
    // linearly averaging into the mid-tone mush ring around the cap.
    float wPl = capK * (0.02 + hc * hc * hc);
    float wEq = (1.0 - capK) * (0.02 + h * h * h);
    h = (h * wEq + hc * wPl) / (wEq + wPl);
  }
  // Pleats last: they live in the crease apron, where both coil registers are
  // gated out — the cap blend must not erase them.
  h += pleats(dir) * uPleatAmp * grooveWall(dir);
  return h;
}

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N; // inner wall, visible through the aperture

  vec3 dir = normalize(vDir);
  float interior = gl_FrontFacing ? 0.0 : 1.0;

  // Grazing damp for the micro layers: at the silhouette, the fresnel rim and
  // wrapped key amplify per-pixel normal noise into bright speckle — fade the
  // clay grain out as the base surface turns edge-on.
  float grazeK = smoothstep(0.05, 0.3, max(dot(N, normalize(vViewDir)), 0.0));

  // --- Per-pixel coil normal: 3 taps of the detail height (crisp channel +
  // strands + pleats). The mips fade the gradient naturally at distance and
  // grazing minification, so no explicit AA fade is needed. ---
  vec3 refAxis = abs(dir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 T = normalize(cross(dir, refAxis));
  vec3 B = cross(dir, T);
  float fineK = uFineAmp * grazeK;
  // Pole caps get the planar-projected coils: exterior crown + both interior
  // caps (locally constant across the FD taps, like fineK).
  float capK = capBlendK(dir, interior);
  float h0 = shellDetail(dir, fineK, capK);
  float hT = shellDetail(normalize(dir + T * GRAD_EPS), fineK, capK);
  float hB = shellDetail(normalize(dir + B * GRAD_EPS), fineK, capK);
  // ×1.7: exaggerated tilt so each coil shades as a rounded tube under the soft
  // light (physically-exact tilt reads nearly flat at this softness), and holds
  // its rounded read at the close crack-hover framing.
  vec3 grad = (T * (hT - h0) + B * (hB - h0)) * (1.7 * RIDGE_RELIEF / (GRAD_EPS * RADIUS));
  grad -= N * dot(grad, N); // keep the tilt tangent to the surface
  N = normalize(N - grad);

  // Tonal mottle from the raw chem channel — same register as the height
  // (planar on the caps). A mismatched register paints a brown halo around
  // the cap blend: the equirect's pinched .b smears near the poles while
  // poleCapFade only partially damps it across the blend band.
  float mottle = mix(coilTap(dir).b, texture2D(uCoilTex, dir.xz * 0.32 + 0.5).b, capK);
  float rdK = uRDBlend * mix(poleCapFade(dir), 1.0, capK);

  vec3 V = normalize(vViewDir);
  float ndv = max(dot(N, V), 0.0);
  // max(…, 0) guards against dot > 1 from float error → pow of a negative → NaN.
  float fresnel = pow(max(1.0 - ndv, 0.0), uFresnelPower);

  // Occlusion as SHADOW, not paint: deep ambient pool in the cleft AND in the
  // sub-mass separation fold, plus narrow dark crevices where adjacent coils
  // meet (height → 0).
  // Inside these recesses the vertex FD normal bands across the steep trench
  // (sparse sampling of a deep valley) — swap toward the smooth ellipsoid
  // normal there and let the cavity AO carry the recess instead.
  float cavity = clamp(cleftCavity(dir) + sepFoldMask(dir) * 0.75, 0.0, 1.0);
  vec3 smoothN = normalize(vSmoothNormal);
  if (!gl_FrontFacing) smoothN = -smoothN;
  N = normalize(mix(N, smoothN, cavity * 0.85));

  // --- Look dial (uLook): interpolates the whole shading register between a
  // crisp matte sculpture (0) and the DESIGN §4 dreamy golden bloom-glow (1).
  // The geometry (detail 64) is identical either way; only the light/shadow/
  // bloom balance moves. ---
  float look = clamp(uLook, 0.0, 1.0);
  float gFloor = mix(0.05, 0.22, look); // groove shadow floor: near-black → soft
  float gLo = mix(0.14, 0.05, look); // groove ramp onset: tight line → gentle
  float kBright = mix(0.50, 0.98, look); // key brightness: only crests bloom → whole surface glows
  float ambK = mix(0.82, 1.34, look); // ambient fill scale
  float sheenK = mix(0.10, 0.18, look); // broad damp sheen
  float streakK = mix(0.58, 0.92, look); // crest liquid-light streak
  float rimK = mix(0.20, 0.50, look); // golden silhouette rim / bloom halo

  float ao = mix(1.0, 0.07, cavity);
  // Groove shadow: floor + ramp move with the look dial (crisp → dark tight
  // line; dreamy → softer, letting the warm bloom breathe).
  ao *= mix(gFloor, 1.0, smoothstep(gLo, 0.6, h0));

  // Occlusion with hue-in-shadow: same VALUE structure as plain gray AO (the
  // shadow floor is never lifted), but shadows roll warm — crevices sink
  // through amber into umber instead of gray. Crests untouched (cream).
  vec3 occl = ao * mix(vec3(1.30, 0.95, 0.55), vec3(1.0), ao);

  // Golden key from above/front with a sideways bias — the packed coils need a
  // light component across their crests or their cross-tilt never changes N·L
  // and the tubes shade flat. Wrapped (no hard terminator) over hemisphere
  // ambient.
  vec3 key = normalize(vec3(0.35, 0.70, 0.62));
  float wrap = dot(N, key) * 0.5 + 0.5;
  float diff = wrap * wrap;
  float hemi = 0.5 + 0.5 * N.y;
  vec3 ambient = mix(vec3(0.16, 0.13, 0.10), vec3(0.30, 0.25, 0.19), hemi) * ambK;
  // Golden key; brightness rides the look dial. Dreamy end pushes most of the
  // warm-lit surface across the 0.6 bloom threshold so it glows; crisp end
  // keeps bloom to the crests only.
  vec3 keyCol = vec3(1.0, 0.86, 0.62) * kBright;

  // Clay micro-grain — keeps open surfaces alive without touching albedo;
  // fades at grazing with the other micro layers (rim speckle).
  float micro = 0.94 + 0.06 * snoise(vObjPos * 2.3) * grazeK;

  vec3 color = uBaseColor * (ambient + keyCol * diff * micro) * occl;

  // Damp sheen: one broad low lobe over the whole form — matted down on the
  // interior, where a stretched gloss lobe at grazing angles smears the inner
  // floor into a blurry streak.
  vec3 H = normalize(key + V);
  float ndh = max(dot(N, H), 0.0);
  float sheen = pow(ndh, 20.0) * sheenK * mix(1.0, 0.3, interior);
  color += vec3(1.0, 0.97, 0.90) * sheen * ao;

  // …plus liquid-light streaks: a tight golden lobe masked to coil crests,
  // broken into runs by the micro-grain — bright enough to feed the depth-0
  // bloom so the ridges themselves glow. Nearly off inside (same streak smear).
  float streak = pow(ndh, 60.0) * smoothstep(0.55, 0.85, h0) * (0.55 + 0.45 * micro);
  color += vec3(1.0, 0.92, 0.70) * streak * streakK * ao * mix(1.0, 0.15, interior);

  // Reaction-diffusion mottle — organic tonal breakup (SPEC §9 / DESIGN:
  // procedural RD surface texture), ~±15% so the coils carry visible material
  // variation coherently from every orbit angle.
  color *= mix(1.0, 0.82 + mottle * 0.36, rdK);

  // Golden silhouette rim — a warm bloom halo separating the form from the
  // dark bg; strength rides the look dial.
  color += uFresnelColor * fresnel * rimK;

  // --- Breakthrough dissolve aperture ---
  // Opens a hole on the cap facing the incoming camera (uApertureDir, derived
  // from the flight path) as uDissolve rises 0→1. Radius is measured from the
  // aperture axis, not a fixed world axis, so the hole stays circular whatever
  // direction the plunge arrives from.
  vec3 radVec = vWorldPos - uApertureDir * dot(vWorldPos, uApertureDir);
  float radial = clamp(length(radVec) / uDissolveRadius, 0.0, 1.0);
  float front = smoothstep(-0.35, 0.7, dot(normalize(vWorldPos), uApertureDir));
  float openness = clamp((1.0 - radial) * front + fbm(vWorldPos * 0.35) * 0.15, 0.0, 1.0);
  float cut = 1.0 - uDissolve;
  if (openness > cut) discard;
  float edge = smoothstep(cut - 0.1, cut, openness) * smoothstep(0.0, 0.05, uDissolve);
  color += uDissolveEdgeColor * edge * 2.2;

  // Manual exp2 fog toward the atmospheric color.
  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
  color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

  // Content-phase dimming: recede toward fog (no alpha blending needed).
  color = mix(uFogColor, color, clamp(uOpacity, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);
}
