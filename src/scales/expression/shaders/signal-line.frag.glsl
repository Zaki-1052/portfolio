// src/scales/expression/shaders/signal-line.frag.glsl
// The signal fan: additive glow tubes radiating from the surviving cursor.
// Three brightness systems compose here, each on its own clock (the
// two-clock rule): a soft base glow that GROWS out from the origin with
// scroll (uGrowT — scrub-reversible), ambient traveling pulses on uTime
// (data leaving on slow randomized-phase timers), and ONE event pulse whose
// position is JS-computed from a wall-clock stamp (the mail submit spark /
// the closing movement's final pulse — uEventPulseT is -1 while inactive).
// Focus dims every other channel (the arbor idiom); the warm bookend lerps
// the whole register toward amber at the very bottom. Fog-extinction +
// premultiplied-additive output, the coil-ribbon mold.
uniform vec3 uColor;
uniform vec3 uWarmColor;
uniform float uWarmT;
uniform float uGlowOpacity;
uniform float uOpacity; // band reveal envelope
uniform float uGrowT; // how far out the lines have extended (0..1)
uniform float uFadeStart; // arc fraction where the into-the-void fade begins
uniform float uTime;
uniform float uFlowSpeed;
uniform float uPulseGain; // ambient pulse strength — the wind-down dims it
uniform float uTintStrength;
uniform float uFocusChannel; // -1 none | 0..4 focused channel
uniform float uFocusDim; // the camera pivot blend doubles as the dim
uniform float uFocusDimStrength;
uniform float uHoverChannel; // -1 none
uniform float uEventPulseChannel; // email's ordinal; -1 disables
uniform float uEventPulseT; // event pulse position along the line; -1 inactive
uniform float uFogDensity;

varying float vChannel;
varying float vArcT;
varying vec3 vTint;
varying float vViewDist;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  // Growth gate: fragments past the extension front don't exist yet — the
  // lines reach outward as the band opens, and rewind retracts them.
  float grown = smoothstep(vArcT, vArcT + 0.05, uGrowT);

  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(vViewDir);
  float ndv = abs(dot(N, V));
  float profile = 0.35 + 0.65 * ndv * ndv;

  // The line thins into the distance toward its terminus (§5.1).
  float tail = 1.0 - smoothstep(uFadeStart, 1.0, vArcT) * 0.85;

  // Ambient packet: sawtooth front per channel, desynced by ordinal.
  float wave = fract(uTime * uFlowSpeed + vChannel * 0.29 + 0.13);
  float front = smoothstep(0.07, 0.0, abs(vArcT - wave)) * uPulseGain;

  // The event pulse — the visitor's message visibly leaving the system.
  float isEventChan =
    step(abs(vChannel - uEventPulseChannel), 0.5) * step(0.0, uEventPulseT);
  float eventFront = smoothstep(0.06, 0.0, abs(vArcT - uEventPulseT)) * isEventChan;

  float glow = profile * (0.32 + 0.8 * front + 1.6 * eventFront) * tail;

  // Focus: the chosen line brightens, the others dim (one gesture with the
  // camera pivot — uFocusDim IS the pivot blend).
  float hasFocus = step(0.0, uFocusChannel);
  float isMine = step(abs(vChannel - uFocusChannel), 0.5);
  glow *= 1.0 - uFocusDim * hasFocus * (1.0 - isMine) * uFocusDimStrength;
  glow *= 1.0 + uFocusDim * hasFocus * isMine * 0.5;
  float isHover = step(abs(vChannel - uHoverChannel), 0.5) * step(0.0, uHoverChannel);
  glow *= 1.0 + isHover * 0.3;

  // Green base → per-channel accent at the terminus (accents only) →
  // white-hot pulse fronts → the amber bookend over everything.
  vec3 col = mix(uColor, vTint, smoothstep(0.55, 1.0, vArcT) * uTintStrength);
  col = mix(col, vec3(1.0), 0.4 * front + 0.55 * eventFront);
  col = mix(col, uWarmColor, uWarmT * 0.6);

  float fogK = exp(-uFogDensity * uFogDensity * 0.35 * vViewDist * vViewDist);
  gl_FragColor = vec4(col, 1.0) * (glow * grown * fogK * uGlowOpacity * uOpacity);
}
