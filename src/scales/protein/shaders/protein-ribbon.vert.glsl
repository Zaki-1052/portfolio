// src/scales/protein/shaders/protein-ribbon.vert.glsl
// Ribbon SHAPE stage. The surface itself is honest object-space geometry,
// rewritten on the CPU each scroll tick from the trajectory (protein-geometry's
// write path) — the trajectory's real motion is NOT a shader effect.
//
// The only vertex-side motion is ambient breathing: a small sinusoidal
// displacement along the surface normal that keeps the structure alive when the
// scroll pauses (the idle loop still runs for exactly this). It is scaled by
// each residue's own measured flexibility, so loops flex and the rigid core
// stays put. Amplitude is in ÅNGSTRÖM, like every position here — the mount's
// uniform group scale carries it into world units, so this must never be
// pre-scaled.
//
// Frozen to zero by uTime = 0 under reduced motion.

uniform float uTime;
uniform float uBreathingAmp;
uniform float uBreathingFreq;
uniform float uRmsfFloor;
uniform float uRmsfCeil;

attribute float aResidueIndex;
attribute float aSSType;
attribute float aChainIndex;
attribute float aRmsf;
attribute float aShade;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vViewDist;
varying float vSSType;
varying float vChainIndex;
varying float vRmsfNorm;
varying float vShade;

void main() {
  // Flexibility normalised here rather than baked into the attribute, so the
  // dev panel's range is a uniform write instead of a geometry rebuild.
  float rmsfNorm = clamp((aRmsf - uRmsfFloor) / max(uRmsfCeil - uRmsfFloor, 1e-4), 0.0, 1.0);
  vRmsfNorm = rmsfNorm;
  vSSType = aSSType;
  vChainIndex = aChainIndex;
  vShade = aShade;

  // Per-residue phase offset: the structure shimmers residue by residue
  // instead of pulsing in and out as one body.
  float phase = uTime * uBreathingFreq * 6.2831 + aResidueIndex * 0.7;
  vec3 displaced = position + normal * (sin(phase) * uBreathingAmp * rmsfNorm);

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  // Uniform scale, so normalizing after the mat3 is enough — no inverse
  // transpose needed.
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  vec3 toCam = cameraPosition - worldPos.xyz;
  vViewDir = normalize(toCam);
  vViewDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
