// src/scales/protein/protein-params.ts
// Visual parameters for the protein ribbon renderer — world placement,
// cross-section profiles (consumed by the sweep geometry), reveal envelope,
// RMSF normalization, and the uniform-writer stub.
// Pure data + mappers; no three imports beyond types.
import type { Color } from 'three';

// ---- World placement ----

export const PROTEIN_ORIGIN: readonly [number, number, number] = [-4, -28, -42];

/** World units per Ångström. The geometry sweep works in raw Å — the same
 *  units the offline pipeline validated against VMD — and the mount applies
 *  this as a uniform group scale (the origin is already a group transform;
 *  see coil-geometry.ts, which never imports COIL_ORIGIN either).
 *  The complex spans ~123 Å on its long axis; at 0.035 that is ~4.3 world
 *  units, which fills the ~4.2 units of height the band-centre camera sees
 *  from 4.58 units out. Tuned live via the dev panel. */
export const PROTEIN_WORLD_SCALE = 0.035;

// ---- Cross-section profiles ----

/** A ribbon cross-section as a superellipse: |x/a|^n + |y/b|^n = 1, sampled
 *  at 8 fixed angles. `a` is the half-extent along the ribbon's WIDTH axis,
 *  `b` along its surface normal, and `n` is squareness — 2 is a true ellipse,
 *  higher tends toward a rectangle with chamfered corners.
 *
 *  The whole point of this parameterisation: a morph between any two profiles
 *  is a lerp of three scalars. Ring vertex k always means "the point at angle
 *  2πk/8", whatever (a, b, n) currently is, so vertices correspond across
 *  profiles with no per-vertex mapping table — which is what makes the SS
 *  transition and the arrow taper expressible at all. */
export interface RibbonProfile {
  a: number;
  b: number;
  n: number;
}

/** Ring vertices per guide point, for EVERY secondary-structure type.
 *  Constant by necessity, not preference: rings of differing vertex counts
 *  cannot be strip-connected to each other, cannot morph across an SS
 *  boundary, and would break the fixed topology the animation write depends
 *  on (the write rewrites positions only — never counts). Only the
 *  cross-section SHAPE varies between H/E/C. */
export const RIBBON_RADIAL_SEGMENTS = 8;

/** Floor applied to a/b inside the analytic normal's reciprocals ONLY.
 *  The normal carries 1/a and 1/b terms, so the arrowhead's a → 0 would give
 *  1/0 = Infinity, and Infinity · 0^(n-1) = NaN wherever cos/sin is exactly 0.
 *  The POSITION formula multiplies by a/b and is safe at a literal 0 — which
 *  is the correct arrow-tip geometry, so it must not be floored. */
export const PROFILE_FLOOR = 0.02;

/** Flat ellipse, 1.2 Å wide × 0.2 Å thick. The width axis runs along the
 *  helix axis, so the natural rotation of the carbonyl-derived frame produces
 *  the familiar spiralling-tape winding. */
export const HELIX_PROFILE: RibbonProfile = { a: 0.6, b: 0.1, n: 2 };

/** Strand body / arrowhead peak / arrow tip. Width ramps body → peak over the
 *  final residue of a run, then tapers to the tip. */
export const SHEET_PROFILE_BODY: RibbonProfile = { a: 0.3, b: 0.075, n: 4 };
export const SHEET_PROFILE_PEAK: RibbonProfile = { a: 0.9, b: 0.075, n: 4 };
export const SHEET_PROFILE_TIP: RibbonProfile = { a: 0, b: 0, n: 4 };

/** Round tube — a == b, so the superellipse degenerates to a circle. */
export const COIL_PROFILE: RibbonProfile = { a: 0.15, b: 0.15, n: 2 };

/** Runs of consecutive `E` shorter than this render as coil instead. They are
 *  DSSP noise rather than real strands (Gβ1 has 15 such runs), and the arrow
 *  ramp — body → peak → tip across a run's final residue — is undefined for
 *  them. PyMOL applies the same minimum-strand-length rule. */
export const MIN_STRAND_RUN = 3;

export const GUIDE_POINTS_PER_RESIDUE = 4;
export const SS_TRANSITION_GUIDE_POINTS = 2;

// ---- Reveal envelope ----

export const PROTEIN_REVEAL_START = 0.58;
export const PROTEIN_REVEAL_END = 0.62;
export const PROTEIN_FADE_START = 0.68;
export const PROTEIN_FADE_END = 0.71;

// ---- RMSF normalization ----

export const RMSF_FLOOR = 0.3;
export const RMSF_CEIL = 4.0;

// ---- Breathing amplitude (§6.3) ----

export const BREATHING_AMP = 0.05;
export const BREATHING_FREQ = 0.3;

// ---- Look ----

/** Chain hierarchy is carried by BRIGHTNESS, not hue — the band is one
 *  monochrome cyan register, which is what leaves the ligand's gold as the
 *  scene's only real second colour. `aChainIndex` selects between these. */
export const RECEPTOR_BRIGHTNESS = 1.0;
export const GPROTEIN_BRIGHTNESS = 0.6;

/** The band's key colour — the same cyan the site's accent token carries. */
export const PROTEIN_CYAN = '#56b6c2';

export const FRESNEL_POWER = 2.4;
export const FRESNEL_STRENGTH = 0.5;
/** How far the thin rim of a flat ribbon recedes (aShade × this). */
export const RIM_SHADE = 0.45;
export const SPEC_STRENGTH = 0.35;
/** How far flexible residues drift warm. Subtle by intent: the ribbon's shape
 *  already carries the structure, this only adds the dynamics layer. */
export const RMSF_WARMTH = 0.5;
export const FOCUS_DIM_STRENGTH = 0.65;

/** The look params the panel drives. Growth-side values (cross-sections) live
 *  in the profiles above and rebuild geometry; these are pure uniform writes. */
export interface ProteinLookParams {
  receptorBrightness: number;
  gproteinBrightness: number;
  fresnelPower: number;
  fresnelStrength: number;
  rimShade: number;
  specStrength: number;
  rmsfWarmth: number;
  rmsfFloor: number;
  rmsfCeil: number;
  breathingAmp: number;
  breathingFreq: number;
}

export const PROTEIN_LOOK_DEFAULTS: ProteinLookParams = {
  receptorBrightness: RECEPTOR_BRIGHTNESS,
  gproteinBrightness: GPROTEIN_BRIGHTNESS,
  fresnelPower: FRESNEL_POWER,
  fresnelStrength: FRESNEL_STRENGTH,
  rimShade: RIM_SHADE,
  specStrength: SPEC_STRENGTH,
  rmsfWarmth: RMSF_WARMTH,
  rmsfFloor: RMSF_FLOOR,
  rmsfCeil: RMSF_CEIL,
  breathingAmp: BREATHING_AMP,
  breathingFreq: BREATHING_FREQ,
};

// ---- Uniform interface + writer ----

export interface ProteinRibbonUniforms {
  uTime: number;
  uFogColor: Color;
  uFogDensity: number;
  uOpacity: number;
  uCyanKey: Color;
  uReceptorBrightness: number;
  uGproteinBrightness: number;
  uFresnelPower: number;
  uFresnelStrength: number;
  uRimShade: number;
  uSpecStrength: number;
  uRmsfWarmth: number;
  uFocusRegion: number;
  uFocusDim: number;
  uFocusDimStrength: number;
  uRmsfFloor: number;
  uRmsfCeil: number;
  uBreathingAmp: number;
  uBreathingFreq: number;
}

/** Write the look params onto a ribbon material's uniforms. Takes the
 *  interface rather than the material class, so it stays decoupled from three
 *  — same shape as applyCoilBeadLook. Called on param change, not per frame;
 *  the per-frame writes are time/fog/focus/reveal only. */
export function applyProteinRibbonLook(m: ProteinRibbonUniforms, p: ProteinLookParams): void {
  m.uReceptorBrightness = p.receptorBrightness;
  m.uGproteinBrightness = p.gproteinBrightness;
  m.uFresnelPower = p.fresnelPower;
  m.uFresnelStrength = p.fresnelStrength;
  m.uRimShade = p.rimShade;
  m.uSpecStrength = p.specStrength;
  m.uRmsfWarmth = p.rmsfWarmth;
  m.uRmsfFloor = p.rmsfFloor;
  m.uRmsfCeil = p.rmsfCeil;
  m.uBreathingAmp = p.breathingAmp;
  m.uBreathingFreq = p.breathingFreq;
  m.uFocusDimStrength = FOCUS_DIM_STRENGTH;
}
