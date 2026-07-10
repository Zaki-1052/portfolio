// src/scales/tissue/shaders/atmosphere-motes.vert.glsl
// Drifting particle field (dust, embers). Positions are baked once; the drift
// is a pure function of uTime + per-point seed (no integrated velocity), so
// the motion is deterministic and freezes cleanly under reduced motion. The
// envelope uniforms let one shader serve both the exterior dust (far shell,
// wide fades) and the interior embers (tight shell, close fades, slow rise).
uniform float uTime;
uniform float uPixelScale; // drawingBufferHeight/2 — matches three's size attenuation
uniform vec2 uFadeNear; // view distance [start, fully visible]
uniform vec2 uFadeFar; // view distance [start of fade, gone]
uniform vec2 uSize; // world size [min, random span]
uniform float uWobble; // drift amplitude (world units)
uniform float uRise; // upward conveyor speed (units/s; embers)
uniform float uRiseRange; // vertical wrap band (0 disables the conveyor)
uniform float uMaxPx; // point-size ceiling (7 = classic mote; large = bokeh disc)
uniform vec2 uCurrentDir; // shared traveling-wave current (amp 0 disables)
uniform float uCurrentAmp;
uniform float uCurrentFreq;
uniform float uCurrentK;

attribute float aSeed;
attribute vec3 aColor; // per-particle tint (white ⇒ single-color field unchanged)

varying float vAlpha;
varying vec3 vColor;

void main() {
  vColor = aColor;
  float s = aSeed * 6.2831;
  vec3 p = position +
    vec3(
      sin(uTime * 0.11 + s * 3.1),
      cos(uTime * 0.07 + s * 5.7) * 0.7,
      sin(uTime * 0.09 + s * 7.3)
    ) *
      uWobble;
  if (uRiseRange > 0.0) {
    // Wrapped conveyor: each ember climbs and re-enters from below. A vertex
    // branch is fine — the no-divergent-taps rule is about fragment samplers.
    p.y += mod(uTime * uRise + fract(aSeed * 7.7) * uRiseRange, uRiseRange) - 0.5 * uRiseRange;
  }
  // Shared traveling-wave current (coil-current.ts) — zero-amp for the
  // classic fields, so they stay byte-identical.
  float cPhase = uTime * uCurrentFreq + dot(p.xz, uCurrentDir) * uCurrentK;
  p.xz += uCurrentDir * (uCurrentAmp * sin(cPhase));

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  // Near fade (nothing smears across the lens as the camera flies through)
  // and a far fade so the field doesn't end at a hard shell.
  vAlpha = smoothstep(uFadeNear.x, uFadeNear.y, dist) * (1.0 - smoothstep(uFadeFar.x, uFadeFar.y, dist));

  float worldSize = uSize.x + uSize.y * fract(aSeed * 13.7);
  gl_PointSize = clamp(worldSize * uPixelScale / dist, 1.0, uMaxPx);
  gl_Position = projectionMatrix * mv;
}
