// src/scales/chromatin/shaders/coil-bead.frag.glsl
// Drum SHADING stage — the ETHEREAL register (2026-07-07 retune, user-
// directed: luminous, pretty, decorative — not a dark mechanical mass). The
// clean beveled-puck geometry carries the form; the surface carries the
// band's light: a pale-blue body over a lifted ambient floor, a faint
// inner luminance strongest on the cap faces, a wide soft accent halo, and
// the decorative ring designs — concentric rings across each cap (tree-ring
// / ripple read) and gentle bands around the wall, fbm-wobbled and
// seed-phased so every drum's ornament is its own. Two-octave value mottle
// keeps the material organic underneath. Hand-set lighting (a custom
// ShaderMaterial gets no scene lights), manual exp2 fog against the live
// scene fog mirror, uOpacity content-phase reveal. The two publication
// regions carry a subtle extra rim glow — the invitation loci — and while
// one region is unwound, everything outside it recedes via the focus dim.

uniform vec3 uBaseColor;
uniform vec3 uFresnelColor;
uniform float uFresnelPower;
uniform float uMottleAmp;
uniform float uRingAmp;
uniform float uRingFreq;
uniform float uSpecStrength;
uniform float uSpecPower;
uniform float uLocusGlow;
uniform float uFocusRegion; // -1 none | 0/1 focused publication region
uniform float uFocusDim; // 0 = no dim … 1 = fully applied (rides the tween)
uniform float uFocusDimStrength;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uOpacity;
uniform float uTime;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vRegion;
varying float vLocusW;
varying float vSeed;
varying float vCapMask;
varying vec3 vLocalPos;

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewDir);

  // Organic value mottle, two octaves, sampled in template-LOCAL space with
  // a per-drum seed phase so the pattern rides WITH the drum through the
  // unwind. On the clean silhouette this reads as material, not lumpiness.
  float broad = fbm(vLocalPos * 1.6 + vec3(vSeed * 31.0)) * 0.5 + 0.5;
  float grain = fbm(vLocalPos * 5.0 + vec3(2.7) + vec3(vSeed * 17.0)) * 0.5 + 0.5;
  float tone = broad * 0.75 + grain * 0.25;
  vec3 albedo = uBaseColor * mix(1.0 - uMottleAmp * 0.4, 1.0 + uMottleAmp * 0.15, tone);

  // Ring designs: concentric rings across the caps (uRingFreq rings from
  // hub to edge), soft bands around the wall, both wobbled by a slow fbm so
  // they read as worked ornament rather than machining. Valleys deepen
  // gently; ridges pick up a whisper of the accent — decoration made of
  // light, not grooves cut into shadow.
  float wobble = fbm(vLocalPos * 2.3 + vec3(vSeed * 19.0)) * 0.35;
  float capRings = 0.5 + 0.5 * sin((length(vLocalPos.xy) + wobble * 0.22) * uRingFreq * 6.2831);
  float wallBands = 0.5 + 0.5 * sin((vLocalPos.z + wobble * 0.25) * uRingFreq * 9.0 + vSeed * 39.0);
  float ringPattern = mix(wallBands, capRings, vCapMask);
  albedo *= 1.0 - uRingAmp * (1.0 - ringPattern) * 0.2;
  albedo += uFresnelColor * uRingAmp * ringPattern * 0.07;
  // Faint lift on the flat faces — a stretched-skin read against the wall.
  albedo *= 1.0 + vCapMask * 0.05;

  // Lifted register: a generous hemisphere floor + wrapped key. The disks
  // should read lit from within the haze — airy, never crushed to black —
  // while the key still models the cap/wall break.
  vec3 key = normalize(vec3(0.35, 0.68, 0.62));
  float wrap = dot(N, key) * 0.5 + 0.5;
  float diff = wrap * wrap;
  float hemi = 0.5 + 0.5 * N.y;
  vec3 ambient = mix(vec3(0.2, 0.23, 0.32), vec3(0.4, 0.45, 0.56), hemi);
  vec3 keyCol = vec3(0.9, 0.95, 1.0) * 0.75;
  vec3 color = albedo * (ambient + keyCol * diff);

  // Inner luminance — the ethereal core. Strongest on the cap faces, a
  // gentle everywhere-glow elsewhere; this is what keeps shadowed inner
  // disks from going hostile-dark inside the spiral.
  color += uFresnelColor * (0.05 + 0.06 * vCapMask);

  // Soft sheen on the bevel ring — form definition with a velvet touch,
  // wide and quiet (the old tight lobe read machined).
  vec3 H = normalize(key + V);
  float spec = pow(max(dot(N, H), 0.0), uSpecPower) * uSpecStrength;
  color += keyCol * spec * (0.75 + 0.25 * tone);

  // Accent halo — wider and brighter than the old rim so each disk floats
  // in a soft blue edge glow; feeds bloom gently.
  float ndv = max(dot(N, V), 0.0);
  float fresnel = pow(max(1.0 - ndv, 0.0), uFresnelPower);
  color += uFresnelColor * fresnel * 0.28;

  // Publication loci: ONE soft hotspot per region — the hann-windowed
  // aLocusW peaks at the region's center bead and dies at its edges, so the
  // marker reads as a single warm invitation, not a hot band of beads.
  // Mostly rim-shaped with a whisper of face glow at the very center; slow
  // beat, static mid-beat under reduced motion (uTime = 0).
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
