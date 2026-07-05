// src/scales/cellular/arbor-params.ts
// The arbor's parameter set — growth (re-exported shape from the pure
// generator) + look (colors, relief, glow) + world placement, one source of
// truth mirroring shell-params.ts. Shipped as material defaults AND driven
// live by the arbor dev panel so the tree is iterated by eye and the winning
// values frozen here. Pure data + a mapper; no three imports beyond types.
import type { Color } from 'three';
import { ARBOR_GROWTH_DEFAULTS, type ArborGrowthParams } from '@/utils/arbor-generator';

export interface ArborLookParams {
  /** Trunk register: bark tone at the root → luminous rose at the tips. */
  baseColor: string;
  tipColor: string;
  /** Rose rim + how tight it hugs the silhouette. */
  fresnelColor: string;
  fresnelPower: number;
  /** t²-scaled emissive kick feeding bloom toward the periphery. */
  emissiveStrength: number;
  /** fbm vertex relief on the solid limbs (bark, not smooth plastic). */
  reliefAmp: number;
  reliefFreq: number;
  /** Emissive periphery: ribbon strands + tip sprites. */
  strandColor: string;
  strandOpacity: number;
  /** Ribbon half-width multiplier over the node radius. */
  strandWidth: number;
  tipSize: number;
  /** Canopy sway amplitude (world units at the deepest tips; 0 = still). */
  swayAmp: number;
  /** Signal pulses riding the strands root→tip: sweep rate (cycles/s) and
   *  brightness gain (0 disables; forced 0 under reduced motion). */
  pulseSpeed: number;
  pulseGain: number;
  /** The hub's granular inner glow: two mottled colors + strength. */
  hubGlowA: string;
  hubGlowB: string;
  hubGlowStrength: number;
  /** Hub silhouette lumps (world units) — an organic mass, not a ball. */
  hubBump: number;
  /** Limb encrustation: sheath patch color + coverage (0 = bare body). */
  sheathColor: string;
  sheathAmount: number;
  /** World size of the multicolor beads strung along the members. */
  punctaSize: number;
}

export type ArborParams = ArborGrowthParams & ArborLookParams;

/**
 * World placement of the whole tree group. The interior glide (depth
 * 0.231→0.31) carries the camera toward y≈-1, z≈-6; rooting the arbor
 * ~13 units below and ~22 back puts the canopy mid-height in the camera's
 * existing altitude corridor, offset +X for the off-axis settle framing.
 */
export const ARBOR_ORIGIN: readonly [number, number, number] = [2, -14, -28];

// The fluorescence register (2026-07-05 reference): electric-blue body,
// green-sheathed strands, warm multicolor beads, glowing granular hub.
const LOOK_DEFAULTS: ArborLookParams = {
  baseColor: '#356487', // electric blue-slate body (bright enough to read vs navy)
  tipColor: '#c6ecff', // icy bright reaches
  fresnelColor: '#5fc0ee', // cyan rim (the band accent family)
  fresnelPower: 5.5, // tight — thin cylinders live near grazing everywhere
  emissiveStrength: 1.3,
  reliefAmp: 0.06,
  reliefFreq: 2.6,
  strandColor: '#8be3b4', // green sheath on the fine periphery
  strandOpacity: 0.65, // user-blessed 2026-07-05
  strandWidth: 1.6,
  tipSize: 0.46,
  swayAmp: 0.12,
  pulseSpeed: 0.11,
  pulseGain: 1.0, // user-blessed 2026-07-05
  hubGlowA: '#57b6f0', // granular core glow, blue…
  hubGlowB: '#7fe4c0', // …mottled toward green-cyan
  hubGlowStrength: 2.0, // user-blessed 2026-07-05
  hubBump: 0.1, // user-blessed 2026-07-05
  sheathColor: '#7fd8a4', // the green encrustation riding the blue limbs
  sheathAmount: 0.55,
  punctaSize: 0.65, // user-blessed 2026-07-05
};

/** The bead layer's color pool — warm golds/corals/reds over green/cyan,
 *  hashed per bead (the reference's multicolor puncta strung along arms). */
export const PUNCTA_PALETTE: readonly string[] = [
  '#ffd27d',
  '#ff8a66',
  '#ff6472',
  '#93e88f',
  '#7fd7f2',
];

// Three starting points for iteration: 'sparse' is an airy winter read,
// 'dense' the filled-canopy default guess, 'gnarled' pushes wander/crook hard.
export const ARBOR_PRESETS: Record<'sparse' | 'dense' | 'gnarled', ArborParams> = {
  sparse: {
    ...ARBOR_GROWTH_DEFAULTS,
    ...LOOK_DEFAULTS,
    fineLevels: 5,
    sideSproutRate: 0.18,
    fineSpreadDeg: 24,
  },
  dense: {
    ...ARBOR_GROWTH_DEFAULTS,
    ...LOOK_DEFAULTS,
  },
  gnarled: {
    ...ARBOR_GROWTH_DEFAULTS,
    ...LOOK_DEFAULTS,
    limbCurl: 0.62,
    fineCurl: 0.85,
    fineSpreadDeg: 34,
    limbSpreadDeg: 50,
    seed: 12,
  },
};

// Shipping defaults — updated when a preview iteration is blessed.
export const ARBOR_DEFAULTS: ArborParams = ARBOR_PRESETS.dense;

// The uniform surface the look mapper writes (drei shaderMaterial instance
// fields — see arbor-trunk-material.ts / arbor-glow-material.ts).
export interface ArborTrunkUniforms {
  uBaseColor: Color;
  uTipColor: Color;
  uFresnelColor: Color;
  uFresnelPower: number;
  uEmissiveStrength: number;
  uReliefAmp: number;
  uReliefFreq: number;
  uHubGlowA: Color;
  uHubGlowB: Color;
  uHubGlowStrength: number;
  uHubBump: number;
  uSheathColor: Color;
  uSheathAmount: number;
}

export interface ArborGlowUniforms {
  uColor: Color;
  uGlowOpacity: number;
  uSway: number;
  uPulseSpeed: number;
  uPulseGain: number;
}

/** Write the look params onto the trunk material's uniforms. */
export function applyArborTrunkLook(m: ArborTrunkUniforms, p: ArborLookParams): void {
  m.uBaseColor.set(p.baseColor);
  m.uTipColor.set(p.tipColor);
  m.uFresnelColor.set(p.fresnelColor);
  m.uFresnelPower = p.fresnelPower;
  m.uEmissiveStrength = p.emissiveStrength;
  m.uReliefAmp = p.reliefAmp;
  m.uReliefFreq = p.reliefFreq;
  m.uHubGlowA.set(p.hubGlowA);
  m.uHubGlowB.set(p.hubGlowB);
  m.uHubGlowStrength = p.hubGlowStrength;
  m.uHubBump = p.hubBump;
  m.uSheathColor.set(p.sheathColor);
  m.uSheathAmount = p.sheathAmount;
}

/** Write the glow params onto a strand/tip material's uniforms. */
export function applyArborGlowLook(m: ArborGlowUniforms, p: ArborLookParams): void {
  m.uColor.set(p.strandColor);
  m.uGlowOpacity = p.strandOpacity;
  m.uSway = p.swayAmp;
  m.uPulseSpeed = p.pulseSpeed;
  m.uPulseGain = p.pulseGain;
}
