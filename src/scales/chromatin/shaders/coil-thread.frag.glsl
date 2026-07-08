// src/scales/chromatin/shaders/coil-thread.frag.glsl
// Wound-thread SHADING stage — an OPAQUE lit cord with an emissive dial, not
// an additive glow line: the amber winding must read as tangible material
// against the cool slate drums, and the loop ribbons stay the scene's only
// pure-light element. Same hand-set environment as the drums (hemisphere
// ambient + wrapped key + Blinn lobe) so the two layers sit in one scene;
// the warmth comes from the albedo and the emissive term, not a second
// light rig. uThreadEmissive is the register dial: 0 = fully matte physical
// cord, ~0.35 = subtle bloom pickup, higher = luminous.
//
// Additive alternative (if the register is re-blessed luminous): premultiply
// the output — `gl_FragColor = vec4(color, 1.0) * glow * fogK * uOpacity` —
// switch fog to extinction (`fogK = exp(-uFogDensity*uFogDensity*0.35*
// vViewDist*vViewDist)`), and set transparent/depthWrite:false/
// AdditiveBlending at the use site in CoilMesh.

uniform vec3 uColor;
uniform float uThreadEmissive;
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

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewDir);

  // The drums' lifted environment, verbatim — one scene, one light rig
  // (ethereal retune: generous ambient floor, gentler key). The wrapped
  // diffuse is softened toward flat so the cord reads as warm ribbon, not
  // hard metal.
  vec3 key = normalize(vec3(0.35, 0.68, 0.62));
  float wrap = dot(N, key) * 0.5 + 0.5;
  float diff = mix(0.35, 1.0, wrap * wrap);
  float hemi = 0.5 + 0.5 * N.y;
  vec3 ambient = mix(vec3(0.2, 0.23, 0.32), vec3(0.4, 0.45, 0.56), hemi);
  vec3 keyCol = vec3(0.9, 0.95, 1.0) * 0.75;
  vec3 color = uColor * (ambient + keyCol * diff);

  // A wide quiet sheen — a soft running light along the cord, never a hard
  // metallic glint.
  vec3 H = normalize(key + V);
  color += keyCol * pow(max(dot(N, H), 0.0), 16.0) * 0.14;

  // Emissive warmth with a slow traveling shimmer along the thread — the
  // idle-motion register (frozen mid-beat at uTime = 0 under reduced
  // motion). Squared so the pulse reads as moving light, not banding.
  float shimmer = 0.5 + 0.5 * sin(vT * 90.0 - uTime * uShimmerSpeed);
  color += uColor * uThreadEmissive * (0.6 + 0.4 * shimmer * shimmer);

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
