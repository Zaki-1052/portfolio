// src/scales/code/shaders/code-grid.frag.glsl
// Environment-grid SHADING stage — sparse anti-aliased green grid lines
// receding into the void (§3.10). Deliberately quiet: thin lines, low
// opacity, a radial falloff centered under the camera so the grid dissolves
// into darkness well before any hard edge, plus the band's manual fog. The
// window is the hero; this is atmosphere that exists mainly to parallax.
// Explicitly NOT code-rain.

uniform vec3 uColor;
uniform float uOpacity;
uniform float uCellSize; // world units per grid cell
uniform float uLineWidth; // line half-width in cells
uniform vec3 uFadeCenter; // world point the visibility pool is centered on
uniform float uFadeRadius; // world units to full fade
uniform vec3 uFogColor;
uniform float uFogDensity;

varying vec3 vWorldPos;
varying float vViewDist;

void main() {
  // Anti-aliased grid: distance to the nearest line in cell space, AA'd by
  // the screen-space derivative (the classic fwidth grid).
  vec2 cell = vWorldPos.xz / uCellSize;
  vec2 dist = abs(fract(cell) - 0.5);
  vec2 aa = fwidth(cell) * 1.2;
  vec2 line =
    1.0 - smoothstep(vec2(0.5 - uLineWidth) - aa, vec2(0.5 - uLineWidth) + aa, 0.5 - dist);
  float grid = max(line.x, line.y);

  // Fade the whole field radially so it pools around the plateau and drains
  // into the void — no visible plane boundary anywhere.
  float radial = 1.0 - smoothstep(uFadeRadius * 0.35, uFadeRadius, distance(vWorldPos, uFadeCenter));

  // Distant cells alias into shimmer as lines converge — retire them early.
  float density = 1.0 - smoothstep(0.15, 0.75, max(aa.x, aa.y));

  float strength = grid * radial * density * uOpacity;
  vec3 color = uColor;
  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
  color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

  gl_FragColor = vec4(color, strength);
}
