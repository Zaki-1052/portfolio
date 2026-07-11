// src/scales/chromatin/shaders/coil-bead.frag.glsl
// Drum SHADING stage — the DEEP-DUSK register (5.6 underwater pass): the
// band reads as a dark blue-green medium lit softly from above, so the drums
// model as volumes again — a mid-tone slate-blue body, genuinely shadowed
// undersides, a filtered overhead key, and the accent halo as the luminous
// edge. Two reflective terms give the surface life the flat pastel pass
// lacked: a vertical-gradient environment reflection (deep teal below, pale
// filtered light above, fresnel-weighted) and a drifting caustic dapple on
// up-facing faces. The decorative ring designs and two-octave mottle carry
// on underneath, quieter against the darker body. Hand-set lighting (a
// custom ShaderMaterial gets no scene lights), manual exp2 fog against the
// live scene fog mirror, uOpacity content-phase reveal. The two publication
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
uniform float uDuskLift; // ambient escape hatch: 1 = blessed dusk floor
uniform vec3 uEnvDeepColor;
uniform vec3 uEnvPaleColor;
uniform float uEnvStrength;
uniform float uCausticAmp;
uniform float uCausticScale;
uniform float uWrapShadow;
uniform float uWrapBandZ; // wrap band half-extent in template-local z
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

  // Cap dressing (5.6 feedback): a wound SPIRAL across each cap — thread
  // coiled on the spool face — instead of the old concentric rings, which
  // read as a sailing net. The angular term's coefficient is exactly 1, so
  // the spiral is seam-free across the atan cut; a slow fbm wobble keeps it
  // hand-wound. The wall keeps only a whisper of banding — the REAL winding
  // carries the wall now.
  float wobble = fbm(vLocalPos * 2.3 + vec3(vSeed * 19.0)) * 0.35;
  float capAng = atan(vLocalPos.y, vLocalPos.x);
  float capRings =
    0.5 + 0.5 * sin((length(vLocalPos.xy) + wobble * 0.22) * uRingFreq * 6.2831 - capAng);
  float wallBands = 0.5 + 0.5 * sin((vLocalPos.z + wobble * 0.25) * uRingFreq * 9.0 + vSeed * 39.0);
  float ringPattern = mix(wallBands, capRings, vCapMask);
  float ringMask = mix(0.2, 1.0, vCapMask);
  albedo *= 1.0 - uRingAmp * (1.0 - ringPattern) * 0.2 * ringMask;
  albedo += uFresnelColor * uRingAmp * ringPattern * 0.07 * ringMask;
  // Faint lift on the flat faces — a stretched-skin read against the wall.
  albedo *= 1.0 + vCapMask * 0.05;

  // Deep-dusk light rig: the key comes from OVERHEAD — light filtering down
  // through the medium — and the hemisphere floor sits low enough that
  // undersides genuinely fall into shadow. The sharpened hemi exponent
  // steepens the top-lit gradient so each drum reads its orientation.
  vec3 key = normalize(vec3(0.15, 0.9, 0.35));
  float wrap = dot(N, key) * 0.5 + 0.5;
  float diff = wrap * wrap;
  float hemi = pow(0.5 + 0.5 * N.y, 1.4);
  vec3 ambient = mix(vec3(0.10, 0.13, 0.15), vec3(0.36, 0.44, 0.50), hemi) * uDuskLift;
  vec3 keyCol = vec3(0.85, 0.95, 1.0) * 0.7;
  vec3 color = albedo * (ambient + keyCol * diff);

  // A whisper of inner luminance, strongest on the cap faces — keeps
  // shadowed inner disks readable without flattening the new value range.
  color += uFresnelColor * (0.02 + 0.03 * vCapMask);

  // Soft sheen on the bevel ring — form definition with a velvet touch.
  vec3 H = normalize(key + V);
  float spec = pow(max(dot(N, H), 0.0), uSpecPower) * uSpecStrength;
  color += keyCol * spec * (0.75 + 0.25 * tone);

  // Accent halo — the luminous edge of the dusk register; feeds bloom.
  float ndv = max(dot(N, V), 0.0);
  float fresnel = pow(max(1.0 - ndv, 0.0), uFresnelPower);
  color += uFresnelColor * fresnel * 0.28;

  // Environment reflection — a vertical-gradient medium sampled by the
  // reflected ray: deep teal below, pale filtered light above. Grazing
  // faces catch more (fresnel-weighted); this is the reflective life of
  // the surface, cheap and art-directable — no PBR/PMREM switch.
  vec3 R = reflect(-V, N);
  vec3 env = mix(uEnvDeepColor, uEnvPaleColor, smoothstep(-0.6, 0.7, R.y));
  color += env * uEnvStrength * (0.15 + 0.85 * fresnel);

  // Caustic dapple — light through the medium's surface, drifting across
  // up-facing faces only. World-anchored (reconstructed from the view ray)
  // so the pattern crawls over a drifting drum rather than riding it;
  // static mid-beat under reduced motion (uTime = 0).
  vec3 wp = cameraPosition - V * vViewDist;
  float cn = fbm(vec3(wp.xz * uCausticScale, uTime * 0.12));
  float dapple = pow(clamp(cn * 0.9 + 0.55, 0.0, 1.0), 4.0);
  float upK = clamp(N.y, 0.0, 1.0);
  color += keyCol * dapple * uCausticAmp * upK * upK;

  // Cord seating: the wrapped thread shades the wall band it rides — a
  // band-level occlusion that visually presses the winding into the drum.
  // Deliberately NOT per-turn stripes (those would re-introduce moiré).
  float bandK =
    (1.0 - vCapMask) * (1.0 - smoothstep(uWrapBandZ * 0.85, uWrapBandZ * 1.25, abs(vLocalPos.z)));
  color *= 1.0 - uWrapShadow * bandK * 0.5;

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
