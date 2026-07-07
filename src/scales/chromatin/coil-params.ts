// src/scales/chromatin/coil-params.ts
// The coil's parameter set — growth (re-exported shape from the pure
// generator) + look (colors, grooves, glow, drift) + world placement, one
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
   *  ellipsoids (not thin cylinders), so the power sits looser than the
   *  arbor limbs'. */
  beadFresnelColor: string;
  beadFresnelPower: number;
  /** Wrapped-thread grooves: band darkening strength and bands-per-bead. */
  grooveAmp: number;
  grooveFreq: number;
  /** Subtle extra rim glow on the two publication-region loci — the
   *  invitation markers for the unwind interaction. */
  locusGlow: number;
  /** How far everything OUTSIDE an unwound region recedes while it is
   *  focused (0 = no dim, 1 = black). Rides the unwind tween. */
  focusDimStrength: number;
  /** Brownian micro-drift amplitude per bead (world units; frozen at 0
   *  under reduced motion). */
  driftAmp: number;
  /** Linker threads: faint emissive color, additive opacity, tube radius
   *  (geometry-consumed), time-wave amplitude, shimmer travel speed. */
  linkerColor: string;
  linkerOpacity: number;
  linkerWidth: number;
  linkerWaveAmp: number;
  shimmerSpeed: number;
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
// band accent blue over a desaturated slate bead body, faintly-blue-glowing
// threads — the calm equilibrium between the warm shell and the cold digital
// bands. Distinct from the second band's ELECTRIC blue: this one is quiet.
const LOOK_DEFAULTS: CoilLookParams = {
  beadBaseColor: '#434a56',
  beadFresnelColor: '#61afef',
  beadFresnelPower: 3.4,
  grooveAmp: 0.45,
  grooveFreq: 5,
  locusGlow: 0.25,
  focusDimStrength: 0.55,
  driftAmp: 0.1,
  linkerColor: '#7aa5d8',
  linkerOpacity: 0.6,
  linkerWidth: 0.04,
  linkerWaveAmp: 0.02,
  shimmerSpeed: 1.6,
};

// Three starting points for iteration: 'tight' is the dense crystalline
// default, 'open' breathes the packing apart, 'loose' scatters toward an
// unwound organic read.
export const COIL_PRESETS: Record<'tight' | 'open' | 'loose', CoilParams> = {
  tight: {
    ...COIL_GROWTH_DEFAULTS,
    ...LOOK_DEFAULTS,
  },
  open: {
    ...COIL_GROWTH_DEFAULTS,
    ...LOOK_DEFAULTS,
    coilPitch: 0.8,
    coilRadius: 3.1,
    beadCount: 84,
    jitter: 0.1,
  },
  loose: {
    ...COIL_GROWTH_DEFAULTS,
    ...LOOK_DEFAULTS,
    coilPitch: 1.05,
    coilRadius: 3.5,
    coilTurns: 5,
    beadCount: 72,
    jitter: 0.16,
    linkerSag: 0.2,
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
  uGrooveAmp: number;
  uGrooveFreq: number;
  uLocusGlow: number;
  uFocusDimStrength: number;
}

export interface CoilLinkerUniforms {
  uColor: Color;
  uGlowOpacity: number;
  uWaveAmp: number;
  uShimmerSpeed: number;
  uFocusDimStrength: number;
}

/** Write the look params onto the bead material's uniforms. */
export function applyCoilBeadLook(m: CoilBeadUniforms, p: CoilLookParams): void {
  m.uBaseColor.set(p.beadBaseColor);
  m.uFresnelColor.set(p.beadFresnelColor);
  m.uFresnelPower = p.beadFresnelPower;
  m.uGrooveAmp = p.grooveAmp;
  m.uGrooveFreq = p.grooveFreq;
  m.uLocusGlow = p.locusGlow;
  m.uFocusDimStrength = p.focusDimStrength;
}

/** Write the look params onto the linker material's uniforms. */
export function applyCoilLinkerLook(m: CoilLinkerUniforms, p: CoilLookParams): void {
  m.uColor.set(p.linkerColor);
  m.uGlowOpacity = p.linkerOpacity;
  m.uWaveAmp = p.linkerWaveAmp;
  m.uShimmerSpeed = p.shimmerSpeed;
  m.uFocusDimStrength = p.focusDimStrength;
}
