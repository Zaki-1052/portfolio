// src/scales/chromatin/shaders/coil-bubbles.vert.glsl
// Rising-bubble SHAPE stage. Positions bake once into a cylinder around the
// cluster; each bubble climbs a wrapped conveyor (re-entering from below),
// sways on its own wake wobble, and rides the band's shared current — all a
// pure function of uTime + per-point seed, so the motion is deterministic
// and freezes cleanly under reduced motion (the layer isn't mounted there
// anyway, per the decorative-particles convention).

uniform float uTime;
uniform float uPixelScale; // drawingBufferHeight/2 — matches three's size attenuation
uniform vec2 uFadeNear; // view distance [start, fully visible]
uniform vec2 uFadeFar; // view distance [start of fade, gone]
uniform vec2 uSize; // world size [min, random span]
uniform float uRise; // climb speed (units/s)
uniform float uRiseRange; // vertical wrap band
uniform float uWobble; // lateral wake sway (world units)
uniform vec2 uCurrentDir; // shared band current (see coil-current.ts)
uniform float uCurrentAmp;
uniform float uCurrentFreq;
uniform float uCurrentK;

attribute float aSeed;

varying float vAlpha;

void main() {
  float s = aSeed * 6.2831;
  vec3 p = position;
  // Wrapped conveyor: each bubble climbs and re-enters from below.
  p.y += mod(uTime * uRise + fract(aSeed * 7.7) * uRiseRange, uRiseRange) - 0.5 * uRiseRange;
  // Wake sway — a slow lateral wander, per-bubble phase.
  p.x += sin(uTime * 0.9 + s * 3.7) * uWobble;
  p.z += cos(uTime * 0.7 + s * 5.3) * uWobble;
  // The band's shared current — same wave as silt, veils, and the coil body.
  float cPhase = uTime * uCurrentFreq + dot(p.xz, uCurrentDir) * uCurrentK;
  p.xz += uCurrentDir * (uCurrentAmp * sin(cPhase));

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  vAlpha =
    smoothstep(uFadeNear.x, uFadeNear.y, dist) * (1.0 - smoothstep(uFadeFar.x, uFadeFar.y, dist));

  float worldSize = uSize.x + uSize.y * fract(aSeed * 13.7);
  gl_PointSize = clamp(worldSize * uPixelScale / dist, 2.0, 24.0);
  gl_Position = projectionMatrix * mv;
}
