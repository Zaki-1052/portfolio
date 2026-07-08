// src/scales/chromatin/coil-params.ts
// The coil's parameter set — growth (re-exported shape from the pure
// generator) + look (colors, machined-drum surface, glow, drift) + world placement, one
// source of truth mirroring arbor-params.ts. Shipped as material defaults AND
// driven live by the coil dev panel so the cluster is iterated by eye and the
// winning values frozen here. Pure data + mappers; no three imports beyond
// types.
import type { Color } from 'three';
import { COIL_GROWTH_DEFAULTS, type CoilGrowthParams } from '@/utils/coil-generator';

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
   *  shared puck template, like threadRadius rebuilds the tube). */
  beadBevel: number;
  /** Subtle extra rim glow on the two publication-region loci — the
   *  invitation markers for the unwind interaction. */
  locusGlow: number;
  /** How far everything OUTSIDE an unwound region recedes while it is
   *  focused (0 = no dim, 1 = black). Rides the unwind tween. */
  focusDimStrength: number;
  /** Brownian micro-drift amplitude per bead (world units; frozen at 0
   *  under reduced motion). */
  driftAmp: number;
  /** Wound amber thread (5.5): cord color, tube radius (geometry-consumed),
   *  the register dial (0 = fully matte physical cord, ~0.35 = subtle bloom
   *  pickup, higher = luminous), revolutions wrapped around each drum
   *  (geometry-consumed), and the travel speed of the emissive shimmer. */
  threadColor: string;
  threadRadius: number;
  threadEmissive: number;
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
// second band's ELECTRIC blue: this one is quiet. The 5.5 wound thread is
// the deliberate exception: warm amber against the cool drums for maximum
// material contrast, a warm callback inside the cool band.
const LOOK_DEFAULTS: CoilLookParams = {
  // Ethereal retune (2026-07-07, user-directed: "lighter, prettier, not a
  // prison"): the drum body lifts from near-black slate to a luminous pale
  // blue — the band's light lives IN the disks now, with a wider soft rim
  // halo instead of a dark mass edged in accent.
  beadBaseColor: '#7fa3c8',
  beadFresnelColor: '#61afef',
  beadFresnelPower: 2.8,
  mottleAmp: 0.3,
  ringAmp: 0.45,
  ringFreq: 5,
  beadSpecStrength: 0.22,
  beadSpecPower: 26,
  beadBevel: 0.14,
  locusGlow: 0.25,
  focusDimStrength: 0.55,
  // The blessed suspended-stillness amplitude. The wound thread and knobs
  // ride drifting drums via an exact shader-side drift match (same formula,
  // same seeds; bridge junction rings sit at blend 0/1), so drift costs no
  // detachment at any amplitude.
  driftAmp: 0.1,
  // Soft champagne, not hard gold — warmth without the vault-door read.
  threadColor: '#d8b878',
  threadRadius: 0.055,
  threadEmissive: 0.35,
  // Fractional part ≈ 0.6 lands each wrap's exit facing the next drum
  // (entry faces the previous one; the next sits roughly opposite plus the
  // helix advance), so the bridges hop short and tidy instead of looping
  // a further quarter-turn around the drum.
  wrapTurns: 1.6,
  shimmerSpeed: 1.6,
  knobColor: '#c2a978',
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
}

export interface CoilThreadUniforms {
  uColor: Color;
  uThreadEmissive: number;
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

/** Write the look params onto the bead material's uniforms. */
export function applyCoilBeadLook(m: CoilBeadUniforms, p: CoilLookParams): void {
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
}

/** Write the look params onto the thread material's uniforms. */
export function applyCoilThreadLook(m: CoilThreadUniforms, p: CoilLookParams): void {
  m.uColor.set(p.threadColor);
  m.uThreadEmissive = p.threadEmissive;
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
