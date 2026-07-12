// src/scales/code/shaders/code-motes.vert.glsl
// Drift-mote SHAPE stage — sparse points scattered through the band's void,
// each a soft abstract dash (§3.10 bans readable glyphs / Matrix rain). A
// slow per-mote vertical drift with wraparound keeps the void alive at
// rest; size attenuates with distance; each mote carries a seed for phase
// and brightness variation. Frozen under reduced motion (uTime pinned).

uniform float uTime;
uniform float uDriftSpeed; // world units / s upward
uniform float uWrapHeight; // vertical extent of the scatter box
uniform float uSize; // base point size (px at dist 1 — attenuated)

attribute float aSeed;

varying float vSeed;
varying float vViewDist;

void main() {
  vSeed = aSeed;

  vec3 objectPos = position;
  // Slow upward drift, wrapped inside the scatter box so the field never
  // empties; a whisper of lateral sway keeps the columns from reading as
  // rain streaks.
  float lift = uTime * uDriftSpeed * (0.6 + 0.8 * aSeed);
  // The scatter box is centered on the mesh origin.
  objectPos.y = mod(position.y + lift + uWrapHeight * 0.5, uWrapHeight) - uWrapHeight * 0.5;
  objectPos.x += sin(uTime * 0.11 + aSeed * 6.2831) * 0.6;

  vec4 worldPos = modelMatrix * vec4(objectPos, 1.0);
  vec4 viewPos = viewMatrix * worldPos;
  vViewDist = length(viewPos.xyz);

  gl_PointSize = uSize / max(vViewDist * 0.06, 1.0);
  gl_Position = projectionMatrix * viewPos;
}
