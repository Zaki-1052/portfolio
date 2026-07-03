// src/scales/tissue/shaders/tissue-shell.frag.glsl
// Shell SHADING stage. The vertex stage displaced real ridge relief into the
// silhouette under a smooth base normal; here the SAME ridge field (shared
// shell-shape.glsl, same sphere-space domain) re-tilts the normal per pixel,
// so shading and silhouette always agree. Look: pale uniform cream, matte —
// hemisphere ambient + wrapped warm key from above/front give soft rounded
// gradients; a faint broad sheen suggests dampness without gloss; cavity AO
// carries the deep cleft/notch shadow and the narrow groove crevices (shadow,
// not color). Existing plumbing kept: RD mottle (now a whisper), fog, content
// dimming (uOpacity), and the breakthrough dissolve aperture.
uniform float uOpacity;
uniform vec3 uBaseColor;
uniform vec3 uFresnelColor;
uniform float uFresnelPower;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform sampler2D uRDTexture;
uniform float uRDBlend;
uniform float uDissolve;
uniform float uDissolveRadius;
uniform vec3 uDissolveEdgeColor;
uniform float uLook; // 0 = crisp matte sculpture … 1 = soft dreamy bloom-glow

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vSmoothNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying vec3 vDir;
varying vec3 vObjPos;
varying vec2 vUv;

const float GRAD_EPS = 0.012; // dir-space step for the per-pixel ridge gradient
const float RADIUS = 12.0; // base sphere radius (dir-space → world slope)

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N; // inner wall, visible through the aperture

  vec3 dir = normalize(vDir);

  // --- Per-pixel ridge normal: expensive flow once, cheap profile at 3 taps. ---
  vec2 flow = ridgeFlow(dir, vObjPos);
  float h0 = ridgeProfile(dir, flow);

  // fwidth AA: fade the ridges out as the stripe phase nears ~1 cycle/pixel —
  // grazing angles during the interior pass-through would otherwise strobe.
  float phase = RIDGE_N * atan(dir.z, abs(dir.x) + 1e-4) + flow.x;
  float aaFade = 1.0 - smoothstep(2.5, 6.0, fwidth(phase));

  // Sub-striation phase jitter + its own (finer) AA fade, both constant
  // across the FD taps below.
  float finePhase = snoise(vObjPos * 0.7 + 7.0) * 2.0;
  float fineScale = 1.0 - smoothstep(1.6, 4.0, fwidth(phase) * FINE_MULT);

  vec3 refAxis = abs(dir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 T = normalize(cross(dir, refAxis));
  vec3 B = cross(dir, T);
  float hD0 = detailHeight(dir, flow, finePhase, fineScale);
  float hDT = detailHeight(normalize(dir + T * GRAD_EPS), flow, finePhase, fineScale);
  float hDB = detailHeight(normalize(dir + B * GRAD_EPS), flow, finePhase, fineScale);
  // ×1.7: exaggerated tilt so each rope shades as a rounded tube under the soft
  // light (physically-exact tilt reads nearly flat at this softness), and holds
  // its rounded read at the close z=26 framing.
  vec3 grad = (T * (hDT - hD0) + B * (hDB - hD0)) * (1.7 * RIDGE_RELIEF / (GRAD_EPS * RADIUS));
  grad -= N * dot(grad, N); // keep the tilt tangent to the surface
  N = normalize(N - grad * aaFade);

  vec3 V = normalize(vViewDir);
  float ndv = max(dot(N, V), 0.0);
  // max(…, 0) guards against dot > 1 from float error → pow of a negative → NaN.
  float fresnel = pow(max(1.0 - ndv, 0.0), uFresnelPower);

  // Occlusion as SHADOW, not paint: deep ambient pool in the cleft/notch plus
  // narrow dark crevices where adjacent ropes meet (profile → 0).
  // Inside the cavity the vertex FD normal bands across the steep narrow slot
  // (sparse sampling of a deep valley) — swap toward the smooth ellipsoid
  // normal there and let the cavity AO carry the recess instead.
  float cavity = cleftCavity(dir);
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

  float hAA = mix(RIDGE_MEAN, h0, aaFade);
  float ao = mix(1.0, 0.07, cavity);
  // Groove shadow: floor + ramp move with the look dial (crisp → dark tight
  // line; dreamy → softer, letting the warm bloom breathe).
  ao *= mix(gFloor, 1.0, smoothstep(gLo, 0.6, hAA));

  // Occlusion with hue-in-shadow: same VALUE structure as plain gray AO (the
  // shadow floor is never lifted), but shadows roll warm — crevices sink
  // through amber into umber instead of gray. Crests untouched (cream).
  vec3 occl = ao * mix(vec3(1.30, 0.95, 0.55), vec3(1.0), ao);

  // Golden key from above/front with a sideways bias — vertical ropes need a
  // lateral light component or their cross-tilt never changes N·L and the
  // tubes shade flat. Wrapped (no hard terminator) over hemisphere ambient.
  vec3 key = normalize(vec3(0.35, 0.70, 0.62));
  float wrap = dot(N, key) * 0.5 + 0.5;
  float diff = wrap * wrap;
  float hemi = 0.5 + 0.5 * N.y;
  vec3 ambient = mix(vec3(0.16, 0.13, 0.10), vec3(0.30, 0.25, 0.19), hemi) * ambK;
  // Golden key; brightness rides the look dial. Dreamy end pushes most of the
  // warm-lit surface across the 0.6 bloom threshold so it glows; crisp end
  // keeps bloom to the crests only.
  vec3 keyCol = vec3(1.0, 0.86, 0.62) * kBright;

  // Clay micro-grain — keeps open surfaces alive without touching albedo.
  float micro = 0.94 + 0.06 * snoise(vObjPos * 2.3);

  vec3 color = uBaseColor * (ambient + keyCol * diff * micro) * occl;

  // Damp sheen: one broad low lobe over the whole form…
  vec3 H = normalize(key + V);
  float ndh = max(dot(N, H), 0.0);
  float sheen = pow(ndh, 20.0) * sheenK;
  color += vec3(1.0, 0.97, 0.90) * sheen * ao;

  // …plus liquid-light streaks: a tight golden lobe masked to rope crests,
  // broken into runs by the micro-grain — bright enough to feed the depth-0
  // bloom so the ridges themselves glow.
  float streak = pow(ndh, 60.0) * smoothstep(0.55, 0.85, h0) * (0.55 + 0.45 * micro);
  color += vec3(1.0, 0.92, 0.70) * streak * streakK * ao;

  // Reaction-diffusion mottle — subtle organic tonal variation (SPEC §9 /
  // DESIGN: procedural RD surface texture), restored to a visible but gentle
  // ~±5% so the warm surface has organic life without turning noisy.
  if (uRDBlend > 0.0) {
    float rd = texture2D(uRDTexture, vWorldPos.xy * 0.04 + 0.5).g;
    color *= mix(1.0, 0.9 + rd * 0.2, uRDBlend);
  }

  // Golden silhouette rim — a warm bloom halo separating the form from the
  // dark bg; strength rides the look dial.
  color += uFresnelColor * fresnel * rimK;

  // --- Breakthrough dissolve aperture ---
  // Opens a central hole on the camera-facing cap as uDissolve rises 0→1.
  float radial = clamp(length(vWorldPos.xy) / uDissolveRadius, 0.0, 1.0);
  float front = smoothstep(-0.35, 0.7, normalize(vWorldPos).z);
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
