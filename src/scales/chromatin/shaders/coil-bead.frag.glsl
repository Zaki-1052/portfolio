// src/scales/chromatin/shaders/coil-bead.frag.glsl
// Bead SHADING stage — the arbor trunk's craft register settled into the
// band's neutral midpoint: hemisphere ambient + wrapped key + accent fresnel
// rim, hand-set (a custom ShaderMaterial gets no scene lights), manual exp2
// fog against the live scene fog mirror, uOpacity content-phase reveal.
// Wrapped-thread grooves band around each bead's own thread axis (vGroove),
// fbm-wobbled so they read as wound material, not printed stripes. Noise is
// sampled in template-LOCAL space with a per-bead seed phase — the surface
// pattern rides with the bead through the unwind instead of crawling. The
// two publication regions carry a subtle extra rim glow — the invitation
// loci — and while one region is unwound, everything outside it recedes via
// the focus dim. All blend factors, no divergent texture taps.

uniform vec3 uBaseColor;
uniform vec3 uFresnelColor;
uniform float uFresnelPower;
uniform float uGrooveAmp;
uniform float uGrooveFreq;
uniform float uLocusGlow;
uniform float uFocusRegion; // -1 none | 0/1 focused publication region
uniform float uFocusDim; // 0 = no dim … 1 = fully applied (rides the tween)
uniform float uFocusDimStrength;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uOpacity;
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vT;
varying float vRegion;
varying float vLocusW;
varying float vSeed;
varying float vGroove;
varying vec3 vLocalPos;

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewDir);

  // Wrapped-thread grooves: parallel bands stacked along the bead's own
  // thread axis, per-bead phase from the seed, wobbled by a static fbm so
  // the winding reads hand-wound. Valleys darken, ridges keep the base.
  // Template space is unit-radius, so frequencies are the old object-space
  // values × the bead radius (~0.45) — same features-per-bead.
  float wobble = fbm(vLocalPos * 1.1 + vec3(vSeed * 23.0)) * 0.45;
  float ridge = 0.5 + 0.5 * sin((vGroove + wobble * 0.3) * uGrooveFreq * 6.2831 + vSeed * 39.0);
  vec3 albedo = uBaseColor * (1.0 - uGrooveAmp * (1.0 - ridge) * 0.85);

  // Static value mottle — the same breakup family as the arbor bark, so the
  // beads read as material, not injection-molded plastic.
  float mottle = fbm(vLocalPos * 1.4 + vec3(5.2) + vec3(vSeed * 31.0)) * 0.5 + 0.5;
  albedo *= 0.82 + mottle * 0.3;

  // Neutral-cool register: soft hemisphere + wrapped key from above-front.
  // The key carries enough contrast that the lens shape of each disc reads
  // in 3D; the ambient floor stays low so the packed mass keeps its shadowed
  // crevices — the threads and loci, not the bead bodies, are what glow.
  vec3 key = normalize(vec3(0.35, 0.68, 0.62));
  float wrap = dot(N, key) * 0.5 + 0.5;
  float diff = wrap * wrap;
  float hemi = 0.5 + 0.5 * N.y;
  vec3 ambient = mix(vec3(0.09, 0.09, 0.13), vec3(0.21, 0.21, 0.28), hemi);
  vec3 keyCol = vec3(0.9, 0.95, 1.0) * 0.8;
  vec3 color = albedo * (ambient + keyCol * diff);

  // Accent rim — separates the dark discs from the haze and feeds bloom.
  // Kept low-weight: small beads under the band's bloom wash to a solid
  // accent tint if the rim dominates (verified in preview), and the grooves
  // must stay legible.
  // The ridge modulation keeps the winding visible inside the rim itself.
  float ndv = max(dot(N, V), 0.0);
  float fresnel = pow(max(1.0 - ndv, 0.0), uFresnelPower);
  color += uFresnelColor * fresnel * 0.18 * (0.7 + 0.3 * ridge);

  // Publication loci: ONE soft hotspot per region — the hann-windowed
  // aLocusW peaks at the region's center bead and dies at its edges, so the
  // marker reads as a single warm invitation, not a hot band of beads (a
  // flat per-bead glow saturated under the bloom pass — verified in
  // preview). Mostly rim-shaped with a whisper of face glow at the very
  // center; slow beat, static mid-beat under reduced motion (uTime = 0).
  float beat = 0.65 + 0.35 * sin(uTime * 1.4 + vRegion * 2.7);
  color += uFresnelColor * (vLocusW * uLocusGlow * beat * (fresnel * 1.2 + 0.06 * vLocusW));

  // Focus dim: while a region is unwound, everything OUTSIDE it recedes —
  // the other region's beads (locus included) and the unassigned mass alike.
  // Rides the unwind tween via uFocusDim, so the dim eases with the opening.
  float mine = step(abs(vRegion - uFocusRegion), 0.5);
  float dimF = uFocusDim * step(-0.5, uFocusRegion) * (1.0 - mine);
  color *= 1.0 - dimF * uFocusDimStrength;

  // Manual exp2 fog toward the live scene color, then the reveal dim.
  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
  color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));
  color = mix(uFogColor, color, clamp(uOpacity, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);
}
