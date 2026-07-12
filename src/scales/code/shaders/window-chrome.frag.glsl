// src/scales/code/shaders/window-chrome.frag.glsl
// Terminal-window SHADING stage — the entire macOS chrome drawn procedurally
// in one SDF pass over the flat plane: rounded-rect silhouette (the §3.3
// exception — the window keeps macOS rounding; everything inside is HTML and
// sharp), a darker brushed title-bar band with a top sheen, three precise
// traffic-light dots in the true macOS colors, a thin lit rim + soft AO
// faking the extruded edge, an emissive green edge glow that rides the
// shared Bloom threshold, and the flight-beat block cursor (JS-blinked via
// uCursorVisible — the first renderer in the cursor relay). No textures, no
// in-shader text ever; the title string is HTML positioned over the band.

uniform float uTime;
uniform float uOpacity;
uniform float uAspect; // halfW / halfH of the live window rect
uniform float uCornerRadius; // half-height units
uniform float uTitleBarFrac; // fraction of window height
uniform vec3 uBodyColor;
uniform vec3 uTitleBarColor;
uniform vec3 uAccentColor;
uniform float uEdgeGlowStrength;
uniform float uEdgeHighlight;
uniform float uEdgeShadow;
uniform float uDotRadiusFrac; // fraction of the title-bar height
uniform float uCursorVisible; // 0/1 — flight beat only
uniform vec2 uCursorUV;
uniform vec3 uFogColor;
uniform float uFogDensity;

varying vec2 vUv;
varying float vViewDist;

// True macOS traffic lights — close (#ff5f57), minimize (#febc2e),
// zoom (#28c840).
const vec3 DOT_RED = vec3(1.0, 0.373, 0.341);
const vec3 DOT_YELLOW = vec3(0.996, 0.737, 0.180);
const vec3 DOT_GREEN = vec3(0.157, 0.784, 0.251);

float hash11(float p) {
  return fract(sin(p * 127.1) * 43758.5453123);
}

float roundedRectSdf(vec2 p, vec2 halfExt, float r) {
  vec2 q = abs(p) - (halfExt - vec2(r));
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  // Aspect-true frame space: x in [-uAspect, uAspect], y in [-1, 1] —
  // half-height units, so radii and insets keep their proportions at any
  // window aspect (the narrow-viewport clamp reshapes the rect, not the
  // chrome details).
  vec2 p = (vUv - 0.5) * 2.0 * vec2(uAspect, 1.0);
  vec2 halfExt = vec2(uAspect, 1.0);

  float d = roundedRectSdf(p, halfExt, uCornerRadius);
  float aa = fwidth(d) * 1.5;
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  if (alpha <= 0.001) discard;

  // --- Body: matte editor ground with the faintest vertical lift and inner
  // falloff so the panel reads as a surface, not a flat fill. ---
  vec3 color = uBodyColor * (0.97 + 0.06 * vUv.y);
  color *= 1.0 - 0.07 * smoothstep(0.55, 1.0, length(p / halfExt));

  // --- Title bar: darker band, lighter sheen toward its top edge, a fine
  // brushed grain (horizontal streaks), and a hairline seam under it. ---
  float barStart = 1.0 - uTitleBarFrac;
  float inBar = step(barStart, vUv.y);
  float barT = clamp((vUv.y - barStart) / max(uTitleBarFrac, 1e-4), 0.0, 1.0);
  float brushed = (hash11(floor(vUv.y * 900.0)) - 0.5) * 0.04;
  vec3 barColor = uTitleBarColor * (0.94 + 0.18 * barT + brushed);
  color = mix(color, barColor, inBar);
  float seam = smoothstep(0.0035, 0.0, abs(vUv.y - barStart));
  color *= 1.0 - 0.35 * seam;

  // --- Traffic lights: three small precise circles, vertically centered in
  // the bar, macOS-proportioned insets, a soft top-lit gradient inside. ---
  float barH = uTitleBarFrac * 2.0; // bar height in half-height units
  float dotR = uDotRadiusFrac * barH;
  float dotY = 1.0 - barH * 0.5;
  float dotX0 = -uAspect + barH * 0.72;
  float dotSpacing = barH * 0.62;
  for (int i = 0; i < 3; i++) {
    vec2 center = vec2(dotX0 + float(i) * dotSpacing, dotY);
    float c = length(p - center) - dotR;
    float caa = fwidth(c) * 1.5;
    float mask = (1.0 - smoothstep(-caa, caa, c)) * inBar;
    vec3 dotColor = i == 0 ? DOT_RED : (i == 1 ? DOT_YELLOW : DOT_GREEN);
    float dotShade = 0.86 + 0.28 * clamp((p.y - center.y) / max(dotR, 1e-4) * 0.5 + 0.5, 0.0, 1.0);
    color = mix(color, dotColor * dotShade, mask);
  }

  // --- Faked extrusion: soft AO seating the edge, then a thin lit rim just
  // inside it, weighted toward the top (one light rig, from above). ---
  float inside = -d; // distance inward from the silhouette
  color *= 1.0 - uEdgeShadow * 0.5 * (1.0 - smoothstep(0.0, 0.05, inside));
  float rim = smoothstep(0.014, 0.004, inside) * (1.0 - smoothstep(-aa, aa, d));
  float topness = clamp(p.y / halfExt.y * 0.5 + 0.5, 0.0, 1.0);
  color += vec3(0.75, 0.82, 0.88) * rim * uEdgeHighlight * (0.25 + 0.75 * topness);

  // --- The phosphor rim: a whisper of emissive green hugging the border,
  // pushed past the shared Bloom threshold so the silhouette glows against
  // the void — the window IS the light source of this band. ---
  float glowBand = smoothstep(0.02, 0.0, abs(inside - 0.006));
  color += uAccentColor * uEdgeGlowStrength * glowBand * 0.35;

  // --- Flight-beat cursor: one blinking block at the prompt seat. The relay
  // hands off to the CSS cursor the moment the HTML interior goes live. ---
  vec2 cellHalf = vec2(0.0055, 0.013);
  vec2 cd = abs(vUv - uCursorUV) - cellHalf;
  vec2 cAA = fwidth(vUv) * 1.5;
  float cursorMask =
    (1.0 - smoothstep(-cAA.x, cAA.x, cd.x)) * (1.0 - smoothstep(-cAA.y, cAA.y, cd.y));
  color = mix(color, uAccentColor * 1.25, cursorMask * uCursorVisible * (1.0 - inBar));

  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
  color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

  gl_FragColor = vec4(color, alpha * uOpacity);
}
