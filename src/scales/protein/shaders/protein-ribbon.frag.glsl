// src/scales/protein/shaders/protein-ribbon.frag.glsl
// Ribbon SHADING stage — the band's register is cool cyan, sharper and colder
// than the coil's underwater murk, a step toward the digital clarity that
// follows. One hand-set light rig, like every other band (a custom
// ShaderMaterial gets neither scene lights nor three's fog).
//
// The hierarchy between subunits is carried by BRIGHTNESS, not hue: the whole
// structure is one monochrome cyan, and the subject reads as the subject
// because the supporting chains sit dimmer. That is what keeps the ligand's
// gold as the scene's only real second colour.

uniform vec3 uCyanKey;
uniform float uReceptorBrightness;
uniform float uGproteinBrightness;
uniform float uFresnelPower;
uniform float uFresnelStrength;
uniform float uRimShade;
uniform float uSpecStrength;
uniform float uRmsfWarmth;
uniform float uFocusRegion; // -1 none | chain index under focus
uniform float uFocusDim; // 0 = no dim … 1 = fully applied (rides the tween)
uniform float uFocusDimStrength;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uOpacity;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vSSType; // 0 = helix | 1 = sheet | 2 = coil
varying float vChainIndex; // 0 = subject | 1 = supporting
varying float vRmsfNorm;
varying float vShade;

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewDir);

  // Cool key from above-front, picking out the ridges of the barrel.
  vec3 key = normalize(vec3(0.2, 0.85, 0.45));
  float wrap = dot(N, key) * 0.5 + 0.5;
  float diff = mix(0.18, 1.0, wrap * wrap);
  float hemi = pow(0.5 + 0.5 * N.y, 1.4);
  vec3 ambient = mix(vec3(0.10, 0.16, 0.22), vec3(0.23, 0.35, 0.42), hemi);
  vec3 keyCol = vec3(0.85, 0.97, 1.0);

  float chainBright = mix(uReceptorBrightness, uGproteinBrightness, step(0.5, vChainIndex));

  // Flexible loops run warmer and brighter, the rigid core cooler and matte —
  // the dynamics layer painted onto a shape that already carries the
  // structure, so it stays subtle on purpose.
  vec3 base = mix(uCyanKey, uCyanKey * vec3(1.35, 1.1, 0.85), vRmsfNorm * uRmsfWarmth);
  vec3 color = base * (ambient + keyCol * diff) * chainBright;

  // Per-structure specular: a helix's flat face catches the key, sheets are
  // more matte, coils dimmest.
  float specK = vSSType < 0.5 ? 1.0 : (vSSType < 1.5 ? 0.55 : 0.3);
  vec3 H = normalize(key + V);
  color += keyCol * pow(max(dot(N, H), 0.0), 28.0) * uSpecStrength * specK * chainBright;

  // Baked rim occlusion — the thin edge of a flat ribbon recedes, so the broad
  // face reads as a surface catching light rather than a painted band.
  color *= 1.0 - uRimShade * vShade;

  // Fresnel edge glow, same register as the arbor's branch rim.
  float fres = pow(1.0 - max(dot(N, V), 0.0), uFresnelPower);
  color += uCyanKey * fres * uFresnelStrength * chainBright;

  // Focus dim: chains outside the focused region recede.
  float mine = step(abs(vChainIndex - uFocusRegion), 0.5);
  float dimF = uFocusDim * step(-0.5, uFocusRegion) * (1.0 - mine);
  color *= 1.0 - dimF * uFocusDimStrength;

  // Manual exp2 fog toward the live scene color, then the reveal dim.
  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
  color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));
  color = mix(uFogColor, color, clamp(uOpacity, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);
}
