// src/scales/chromatin/shaders/coil-thread.frag.glsl
// Wound-thread SHADING stage — 5.6 deep-dusk register: a dark slate-teal
// cord with a bright cyan CORE. Still an opaque lit layer (the loop ribbons
// stay the scene's only pure-light element), but the cord's luminance now
// lives in a camera-facing filament instead of the whole tube — the old
// full-value champagne line outlined every drum silhouette and flattened
// the 3D read. Same hand-set deep-dusk environment as the drums (one scene,
// one light rig); real cylindrical modeling (dark underside, a tight moving
// specular line), baked wrap occlusion via aShade (wall contact + crowded
// adjacent turns, bridges tapering free), and a slow traveling pulse — a
// few soft packets of light, replacing the vT*90 shimmer whose stripes
// moiréd into corduroy where stacked drums' wraps nearly touched.
//
// Additive alternative (if the register is re-blessed luminous): premultiply
// the output — `gl_FragColor = vec4(color, 1.0) * glow * fogK * uOpacity` —
// switch fog to extinction (`fogK = exp(-uFogDensity*uFogDensity*0.35*
// vViewDist*vViewDist)`), and set transparent/depthWrite:false/
// AdditiveBlending at the use site in CoilMesh.

uniform vec3 uColor;
uniform vec3 uCoreColor;
uniform float uThreadEmissive;
uniform float uThreadAo;
uniform float uPulseCount;
uniform float uShimmerSpeed;
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
varying float vT;
varying float vRegion;
varying float vShade;

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewDir);

  // The drums' deep-dusk environment, verbatim — one scene, one light rig.
  // The diffuse floor sits LOW (0.15, was 0.35): the cord's underside falls
  // into real shadow, which is what makes it read as a lit cylinder instead
  // of extruded flat color.
  vec3 key = normalize(vec3(0.15, 0.9, 0.35));
  float wrap = dot(N, key) * 0.5 + 0.5;
  float diff = mix(0.15, 1.0, wrap * wrap);
  float hemi = pow(0.5 + 0.5 * N.y, 1.4);
  vec3 ambient = mix(vec3(0.10, 0.13, 0.15), vec3(0.36, 0.44, 0.50), hemi);
  vec3 keyCol = vec3(0.85, 0.95, 1.0) * 0.7;
  vec3 color = uColor * (ambient + keyCol * diff);

  // A tight moving specular line — the wet-cord glint that travels along
  // the tube as the camera orbits; modest, never a hard metal flash.
  vec3 H = normalize(key + V);
  color += keyCol * pow(max(dot(N, H), 0.0), 32.0) * 0.3;

  // Baked occlusion: the cord darkens where it presses into the drum wall
  // and where adjacent turns crowd it — the contact shadow that seats the
  // winding on the drum. Bridges carry it only near their junctions.
  color *= 1.0 - uThreadAo * vShade;

  // Bioluminescent core: brightest where the tube faces the camera — a
  // filament INSIDE the cord, not a painted-on brightness. It carries a
  // slow traveling pulse: uPulseCount soft packets along the whole cord
  // (frozen mid-beat at uTime = 0 under reduced motion).
  float b = 0.5 + 0.5 * sin(vT * 6.2831 * uPulseCount - uTime * uShimmerSpeed);
  float pulse = b * b * b;
  pulse *= pulse; // ^6 — distinct traveling packets, not banding
  float coreK = pow(max(dot(N, V), 0.0), 1.5);
  color += uCoreColor * uThreadEmissive * coreK * (0.55 + 0.45 * pulse);

  // Focus dim: the cord outside an unwound region recedes with the drums.
  float mine = step(abs(vRegion - uFocusRegion), 0.5);
  float dimF = uFocusDim * step(-0.5, uFocusRegion) * (1.0 - mine);
  color *= 1.0 - dimF * uFocusDimStrength;

  // Manual exp2 fog toward the live scene color, then the reveal dim.
  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
  color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));
  color = mix(uFogColor, color, clamp(uOpacity, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);
}
