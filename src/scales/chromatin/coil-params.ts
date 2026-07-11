// src/scales/chromatin/coil-params.ts
// The coil's parameter set — growth (re-exported shape from the pure
// generator) + look (colors, organic drum surface, glow, drift) + world placement, one
// source of truth mirroring arbor-params.ts. Shipped as material defaults AND
// driven live by the coil dev panel so the cluster is iterated by eye and the
// winning values frozen here. Pure data + mappers; no three imports beyond
// types.
import type { Color } from 'three';
import { COIL_GROWTH_DEFAULTS, type CoilGrowthParams } from '@/utils/coil-generator';
import { WRAP_Z_FRACTION } from './coil-thread-path';

export interface CoilLookParams {
  /** Bead body: desaturated dark slate — a believable material tone; the
   *  band's blue lives in the lighting and rim, not a dyed bead. */
  beadBaseColor: string;
  /** Accent rim + how tight it hugs the bead silhouette. Beads are chunky
   *  drums (not thin cylinders), so the power sits looser than the
   *  arbor limbs'. */
  beadFresnelColor: string;
  beadFresnelPower: number;
  /** Organic drum surface (5.5): value-mottle amplitude (two-octave fbm,
   *  seed-phased per drum), the decorative ring designs (concentric rings
   *  across the cap faces, soft bands around the walls — fbm-wobbled so
   *  they read hand-made; strength + rings-per-cap), and the Blinn lobe
   *  that lights each rim bevel as a soft form-defining ring. */
  mottleAmp: number;
  ringAmp: number;
  ringFreq: number;
  beadSpecStrength: number;
  beadSpecPower: number;
  /** Rim bevel size in template units (geometry-consumed — rebuilds the
   *  shared puck template, like strandRadius rebuilds the duplex). */
  beadBevel: number;
  /** Cap crown height in template units (geometry-consumed): a shallow
   *  paraboloid dome per cap face — puck, not coin. 0 = flat. */
  beadDome: number;
  /** Subtle extra rim glow on the two publication-region loci — the
   *  invitation markers for the unwind interaction. */
  locusGlow: number;
  /** How far everything OUTSIDE an unwound region recedes while it is
   *  focused (0 = no dim, 1 = black). Rides the unwind tween. */
  focusDimStrength: number;
  /** Brownian micro-drift amplitude per bead (world units; frozen at 0
   *  under reduced motion). */
  driftAmp: number;
  /** Deep-dusk grade (5.6): ambient escape hatch (1 = the blessed dusk
   *  floor; above lifts toward the old ethereal register), and the
   *  vertical-gradient environment reflection — deep tone below the medium,
   *  pale filtered light above, sampled by the reflected ray. */
  duskLift: number;
  envStrength: number;
  envDeepColor: string;
  envPaleColor: string;
  /** Caustic dapple: light-through-the-medium pattern drifting across
   *  up-facing drum surfaces (world-anchored; static under reduced motion).
   *  Amp is brightness, scale is world-space pattern frequency. */
  causticAmp: number;
  causticScale: number;
  /** Cord seating: how strongly the wrapped thread shades the drum wall
   *  band it rides (0 = painted-on, 1 = deeply seated). */
  wrapShadow: number;
  /** Wound thread (teal biolume double helix): dark cord body + bright cyan
   *  CORE color (the camera-facing filament carrying the emissive), the
   *  register dial (0 = fully matte physical cord, higher = luminous core),
   *  revolutions the duplex axis winds around each drum (geometry-consumed),
   *  the baked wrap-occlusion strength, the number of traveling light packets
   *  along the cord, and their travel speed. */
  threadColor: string;
  threadCoreColor: string;
  /** Duplex geometry (all geometry-consumed): each backbone strand's own tube
   *  radius; the axis→strand offset (half the duplex width); the world-space
   *  length per full twist revolution; the bridge-only width multiplier that
   *  tapers linkers thinner than the wraps; and the sparse rung bars' radius +
   *  arc-length spacing. */
  strandRadius: number;
  helixRadius: number;
  twistPitch: number;
  linkerWidthScale: number;
  rungRadius: number;
  rungSpacing: number;
  threadEmissive: number;
  threadAo: number;
  threadPulseCount: number;
  wrapTurns: number;
  shimmerSpeed: number;
  /** Cinch knobs: stud color + world size (geometry-consumed). */
  knobColor: string;
  knobSize: number;
  /** Loop ribbons: the connection streams revealed while a region is
   *  unwound — luminous color, additive opacity, tube radius
   *  (geometry-consumed), traveling-packet speed. */
  ribbonColor: string;
  ribbonOpacity: number;
  ribbonWidth: number;
  ribbonFlowSpeed: number;
}

export type CoilParams = CoilGrowthParams & CoilLookParams;

/**
 * World placement of the whole cluster group. The camera's single 0.43→1.0
 * keyframe segment carries it from [-11.5,-4,5] toward the void tail;
 * parking the cluster ~26 down and ~40 back keeps it inside the vertical
 * frustum for the entire band (bottom-of-frame at 0.43, comfortably framed
 * by ~0.48) until the band's own camera knots land in a later stage.
 */
export const COIL_ORIGIN: readonly [number, number, number] = [0, -26, -40];

// The home-base register (2026-07-07 palette revision, user-directed: blue
// restored to this band per the master plan; rose moved down one band): the
// band accent blue over desaturated slate drums — the calm equilibrium
// between the warm shell and the cold digital bands. Distinct from the
// second band's ELECTRIC blue: this one is quiet. The 5.6 wound thread
// speaks the medium's own language: a teal biolume cord (user-directed —
// the 5.5 warm amber washed to beige against the pale drums and read
// uncanny), its light carried by a cyan core filament.
const LOOK_DEFAULTS: CoilLookParams = {
  // Deep-dusk grade (5.6, user-directed: an underwater medium, lit softly
  // from above): the drum body drops from the ethereal pastel (#7fa3c8) to
  // a mid-tone slate-blue so the disks model as volumes against the teal
  // haze — the luminous work moves to the rim halo, the env reflection,
  // and the thread core. Starters, re-blessed by eye in the preview.
  beadBaseColor: '#607e9a',
  beadFresnelColor: '#61afef',
  beadFresnelPower: 2.8,
  mottleAmp: 0.3,
  // 5.6 feedback: the concentric cap rings read as an old sailing net —
  // the pattern is now a wound SPIRAL (thread coiled on the spool face),
  // quieter, and the real winding carries the structure.
  ringAmp: 0.3,
  ringFreq: 4,
  beadSpecStrength: 0.22,
  beadSpecPower: 26,
  beadBevel: 0.2,
  beadDome: 0.1,
  locusGlow: 0.25,
  focusDimStrength: 0.55,
  // The blessed suspended-stillness amplitude. The wound thread and knobs
  // ride drifting drums via an exact shader-side drift match (same formula,
  // same seeds; bridge junction rings sit at blend 0/1), so drift costs no
  // detachment at any amplitude.
  driftAmp: 0.1,
  duskLift: 1.0,
  envStrength: 0.35,
  envDeepColor: '#16323a',
  envPaleColor: '#8fd0da',
  causticAmp: 0.18,
  causticScale: 0.45,
  wrapShadow: 0.35,
  // Teal biolume cord (5.6): a slate-teal body whose light lives in the
  // bright cyan core filament — the old full-value champagne cord outlined
  // every silhouette and read as fondant. Body sits close to the drum
  // wall's value (face-on fix: a much darker cord read as cracks cut INTO
  // the wall, not a cord raised on it).
  threadColor: '#4c8d9b',
  threadCoreColor: '#7fe3f2',
  // Double-helix duplex: two thin strands (strandRadius) offset ±helixRadius
  // off the axis give an envelope Ø ≈ 0.18 — ~18% of the disc diameter, close
  // to the real ~20% DNA-to-octamer ratio, so the wire reads clearly THINNER
  // than the disc and its turns leave gaps instead of a solid caging mass.
  // twistPitch 2.4 world-units/turn → a gentle twist (~2–3 crossings per wrap,
  // orderly not tangled). linkerWidthScale 0.6 tapers the linkers slim.
  strandRadius: 0.03,
  helixRadius: 0.06,
  twistPitch: 2.4,
  linkerWidthScale: 0.6,
  // Sparse base-pair rungs — occasional cross-bars, restrained enough to stay
  // organic underwater.
  rungRadius: 0.018,
  rungSpacing: 0.6,
  threadEmissive: 1.0,
  // The per-strand occlusion rotates with the twist (more dynamic than the old
  // static tube bake), so it sits a touch lighter than the old 0.6.
  threadAo: 0.45,
  threadPulseCount: 3,
  // The superhelical wind of the duplex axis around each drum — the exact
  // nucleosomal ~1.65 turns; its fractional part (0.65) also lands each wrap's
  // exit facing the next drum, so the linkers route cleanly (the double-helix
  // twist carries the "wound" read, so far fewer axis turns than the old 2.6).
  wrapTurns: 1.65,
  shimmerSpeed: 0.6,
  knobColor: '#45737f',
  knobSize: 0.11,
  ribbonColor: '#9fd0f5',
  ribbonOpacity: 0.85,
  ribbonWidth: 0.08,
  ribbonFlowSpeed: 0.5,
};

// Three starting points for iteration around the 5.5 rising-coil packing:
// 'tight' is the shipping staircase, 'open' raises the climb and breathes the
// turns apart, 'loose' drops a turn for a shorter, airier spiral. Keys are
// stable across passes — preview `?preset=` URLs and the panel buttons keep
// working.
export const COIL_PRESETS: Record<'tight' | 'open' | 'loose', CoilParams> = {
  tight: {
    ...COIL_GROWTH_DEFAULTS,
    ...LOOK_DEFAULTS,
  },
  open: {
    ...COIL_GROWTH_DEFAULTS,
    ...LOOK_DEFAULTS,
    coilPitch: 1.25,
    coilRadius: 2.5,
  },
  loose: {
    ...COIL_GROWTH_DEFAULTS,
    ...LOOK_DEFAULTS,
    coilTurns: 5,
    beadCount: 46,
    coilPitch: 1.35,
  },
};

// Shipping defaults — updated when a preview iteration is blessed.
export const COIL_DEFAULTS: CoilParams = COIL_PRESETS.tight;

// The uniform surface the look mappers write (drei shaderMaterial instance
// fields — see coil-materials.ts).
export interface CoilBeadUniforms {
  uBaseColor: Color;
  uFresnelColor: Color;
  uFresnelPower: number;
  uMottleAmp: number;
  uRingAmp: number;
  uRingFreq: number;
  uSpecStrength: number;
  uSpecPower: number;
  uLocusGlow: number;
  uFocusDimStrength: number;
  uDuskLift: number;
  uEnvDeepColor: Color;
  uEnvPaleColor: Color;
  uEnvStrength: number;
  uCausticAmp: number;
  uCausticScale: number;
  uWrapShadow: number;
  uWrapBandZ: number;
}

export interface CoilThreadUniforms {
  uColor: Color;
  uCoreColor: Color;
  uThreadEmissive: number;
  uThreadAo: number;
  uPulseCount: number;
  uShimmerSpeed: number;
  uFocusDimStrength: number;
}

export interface CoilKnobUniforms {
  uColor: Color;
  uEmissive: number;
  uFocusDimStrength: number;
}

export interface CoilRibbonUniforms {
  uColor: Color;
  uGlowOpacity: number;
  uFlowSpeed: number;
}

/** Write the look params onto the bead material's uniforms. Takes the full
 *  param set: the wrap-band shadow extent derives from the GROWTH aspect
 *  (template-local z of the wound band, mirroring the thread-path bake). */
export function applyCoilBeadLook(
  m: CoilBeadUniforms,
  p: CoilLookParams & Pick<CoilGrowthParams, 'beadAspect'>,
): void {
  m.uBaseColor.set(p.beadBaseColor);
  m.uFresnelColor.set(p.beadFresnelColor);
  m.uFresnelPower = p.beadFresnelPower;
  m.uMottleAmp = p.mottleAmp;
  m.uRingAmp = p.ringAmp;
  m.uRingFreq = p.ringFreq;
  m.uSpecStrength = p.beadSpecStrength;
  m.uSpecPower = p.beadSpecPower;
  m.uLocusGlow = p.locusGlow;
  m.uFocusDimStrength = p.focusDimStrength;
  m.uDuskLift = p.duskLift;
  m.uEnvDeepColor.set(p.envDeepColor);
  m.uEnvPaleColor.set(p.envPaleColor);
  m.uEnvStrength = p.envStrength;
  m.uCausticAmp = p.causticAmp;
  m.uCausticScale = p.causticScale;
  m.uWrapShadow = p.wrapShadow;
  m.uWrapBandZ = WRAP_Z_FRACTION * p.beadAspect;
}

/** Write the look params onto the thread material's uniforms. */
export function applyCoilThreadLook(m: CoilThreadUniforms, p: CoilLookParams): void {
  m.uColor.set(p.threadColor);
  m.uCoreColor.set(p.threadCoreColor);
  m.uThreadEmissive = p.threadEmissive;
  m.uThreadAo = p.threadAo;
  m.uPulseCount = p.threadPulseCount;
  m.uShimmerSpeed = p.shimmerSpeed;
  m.uFocusDimStrength = p.focusDimStrength;
}

/** Write the look params onto the knob material's uniforms. The stud takes
 *  a half share of the thread's emissive so the clasp reads as part of the
 *  winding without becoming its own light. */
export function applyCoilKnobLook(m: CoilKnobUniforms, p: CoilLookParams): void {
  m.uColor.set(p.knobColor);
  m.uEmissive = p.threadEmissive * 0.5;
  m.uFocusDimStrength = p.focusDimStrength;
}

/** Write the look params onto the ribbon material's uniforms. */
export function applyCoilRibbonLook(m: CoilRibbonUniforms, p: CoilLookParams): void {
  m.uColor.set(p.ribbonColor);
  m.uGlowOpacity = p.ribbonOpacity;
  m.uFlowSpeed = p.ribbonFlowSpeed;
}
