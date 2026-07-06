// src/scales/tissue/shell-params.ts
// The shell's macro-form parameter set — one source of truth for the sculpted
// silhouette (proportions, mass distribution, groove behavior, rear sub-mass,
// fine-detail dials). Shipped as material uniform defaults AND driven live by
// the tissue-preview leva panel, so the form can be iterated by eye and the
// winning values frozen here. Pure data + a mapper; no three imports beyond
// types, so it stays trivially testable.
import type { Vector2, Vector3 } from 'three';

export interface ShellParams {
  // Superellipsoid base: semi-axes (X width, Y height, Z length) + boxiness
  // exponent (2 = pure ellipsoid; higher = slab-like halves, steeper walls).
  dimX: number;
  dimY: number;
  dimZ: number;
  boxiness: number;
  // Vertical mass distribution: where the widest shoulder sits (unit y), how
  // strongly it bulges, how much the underside tucks in, and the flat-base
  // squash.
  shoulderY: number;
  shoulderBulge: number;
  baseTuck: number;
  bottomFlat: number;
  // Groove: half-width, depth, the paired swell beside it, and how much the
  // groove closes toward the rear (where the halves converge over the
  // sub-mass).
  cleftWidth: number;
  cleftDepth: number;
  moundHeight: number;
  grooveRearFade: number;
  // Rear-top overhang bulge (breaks side-view convexity).
  overhang: number;
  // Lower-rear sub-mass: center direction (unit y/z, normalized in-shader),
  // angular radius in degrees, height, and the separating fold depth.
  subMassY: number;
  subMassZ: number;
  subMassRadius: number;
  subMassHeight: number;
  sepFold: number;
  // The stalk: a rounded column stub from the underside — rendered by the
  // COMPANION mesh only (stalk-mesh.tsx); the main shell always zeroes it (a
  // displaced stalk digs a matching pit into the interior wall). Direction
  // (unit y/z), footprint radius in degrees, protrusion height.
  stalkY: number;
  stalkZ: number;
  stalkRadius: number;
  stalkHeight: number;
  // Front-lower lift — blunter, slightly raised front end.
  frontLift: number;
  // 0 = flat face down (egg on a table) … 1 = flat plateau up (reference read:
  // broad flattened crown, rounded tucked underside).
  profileFlip: number;
  // Per-half low-frequency height offset (world units): each side samples a
  // different noise seed, gated to zero at the groove — the halves stop being
  // perfect mirrors.
  asymmetry: number;
  // Fine detail: crest strand amplitude, groove-wall pleat amplitude/frequency.
  fineAmp: number;
  pleatAmp: number;
  pleatFreq: number;
}

// Three starting points for iteration. 'loaf' ≈ the pre-rework form (baseline
// for comparison); 'crown' is the reference-proportion guess (top-heavy, boxy
// halves, rear close-over + sub-mass); 'bluff' pushes the rear build harder.
export const SHELL_PRESETS: Record<'loaf' | 'crown' | 'bluff', ShellParams> = {
  loaf: {
    dimX: 1.02,
    dimY: 0.78,
    dimZ: 1.32,
    boxiness: 2.0,
    shoulderY: 0.1,
    shoulderBulge: 0.0,
    baseTuck: 0.0,
    bottomFlat: 0.72,
    cleftWidth: 0.07,
    cleftDepth: 1.9,
    moundHeight: 0.8,
    grooveRearFade: 0.0,
    overhang: 0.0,
    subMassY: -0.52,
    subMassZ: -0.86,
    subMassRadius: 30,
    subMassHeight: 0.0,
    sepFold: 0.0,
    frontLift: 0.0,
    profileFlip: 0.0,
    asymmetry: 0.35,
    stalkY: -0.92,
    stalkZ: -0.2,
    stalkRadius: 16,
    stalkHeight: 0.0,
    fineAmp: 0.13,
    pleatAmp: 0.22,
    pleatFreq: 60,
  },
  // crown = the user-blessed iteration values (2026-07-04 slider session):
  // narrow slab halves, knife crease confined to the crown, fully merged
  // rear, pronounced sub-mass + stalk, maxed fine detail.
  crown: {
    dimX: 0.6,
    dimY: 1.02,
    dimZ: 1.28,
    boxiness: 2.3,
    shoulderY: 0.3,
    shoulderBulge: 0.14,
    baseTuck: 0.3,
    bottomFlat: 0.95,
    cleftWidth: 0.02,
    cleftDepth: 1.5,
    moundHeight: 0.0,
    grooveRearFade: 1.0,
    overhang: 1.1,
    subMassY: -0.52,
    subMassZ: -0.86,
    subMassRadius: 32,
    subMassHeight: 2.8,
    sepFold: 0.0,
    frontLift: -1.0,
    profileFlip: 1.0,
    asymmetry: 0.35,
    stalkY: -0.92,
    stalkZ: -0.2,
    stalkRadius: 16,
    stalkHeight: 3.5,
    fineAmp: 0.3,
    pleatAmp: 0.3,
    pleatFreq: 60,
  },
  bluff: {
    dimX: 0.66,
    dimY: 1.08,
    dimZ: 1.22,
    boxiness: 2.9,
    shoulderY: 0.35,
    shoulderBulge: 0.16,
    baseTuck: 0.34,
    bottomFlat: 0.85,
    cleftWidth: 0.02,
    cleftDepth: 1.6,
    moundHeight: 0.0,
    grooveRearFade: 1.0,
    overhang: 2.0,
    subMassY: -0.5,
    subMassZ: -0.87,
    subMassRadius: 36,
    subMassHeight: 3.2,
    sepFold: 0.0,
    frontLift: -1.0,
    profileFlip: 1.0,
    asymmetry: 0.35,
    stalkY: -0.92,
    stalkZ: -0.2,
    stalkRadius: 18,
    stalkHeight: 3.8,
    fineAmp: 0.3,
    pleatAmp: 0.35,
    pleatFreq: 60,
  },
};

// Shipping defaults — updated when a preview iteration is blessed.
export const SHELL_DEFAULTS: ShellParams = SHELL_PRESETS.crown;

// The uniform surface the mapper writes. Matches the drei shaderMaterial's
// generated instance fields (see tissue-shell-material.ts).
export interface ShellParamUniforms {
  uShapeDims: Vector3;
  uBoxiness: number;
  uShoulderY: number;
  uShoulderBulge: number;
  uBaseTuck: number;
  uBottomFlat: number;
  uCleftWidth: number;
  uCleftDepth: number;
  uMoundHeight: number;
  uGrooveRearFade: number;
  uOverhang: number;
  uSubMassPos: Vector2;
  uSubMassCos: number;
  uSubMassHeight: number;
  uSepFold: number;
  uStalkPos: Vector2;
  uStalkCos: number;
  uStalkHeight: number;
  uFrontLift: number;
  uProfileFlip: number;
  uAsymmetry: number;
  uFineAmp: number;
  uPleatAmp: number;
  uPleatFreq: number;
}

/**
 * Write a ShellParams set onto a material's uniforms (degrees → cosine).
 * stalkOn defaults to FALSE: only the companion stalk mesh (stalk-mesh.tsx)
 * opts in — a stalk displaced into the MAIN shell digs a matching pit into
 * the interior wall (the interior-artifact family).
 */
export function applyShellParams(m: ShellParamUniforms, p: ShellParams, stalkOn = false): void {
  m.uShapeDims.set(p.dimX, p.dimY, p.dimZ);
  m.uBoxiness = p.boxiness;
  m.uShoulderY = p.shoulderY;
  m.uShoulderBulge = p.shoulderBulge;
  m.uBaseTuck = p.baseTuck;
  m.uBottomFlat = p.bottomFlat;
  m.uCleftWidth = p.cleftWidth;
  m.uCleftDepth = p.cleftDepth;
  m.uMoundHeight = p.moundHeight;
  m.uGrooveRearFade = p.grooveRearFade;
  m.uOverhang = p.overhang;
  m.uSubMassPos.set(p.subMassY, p.subMassZ);
  m.uSubMassCos = Math.cos((p.subMassRadius * Math.PI) / 180);
  m.uSubMassHeight = p.subMassHeight;
  m.uSepFold = p.sepFold;
  m.uStalkPos.set(p.stalkY, p.stalkZ);
  m.uStalkCos = Math.cos((p.stalkRadius * Math.PI) / 180);
  m.uStalkHeight = stalkOn ? p.stalkHeight : 0;
  m.uFrontLift = p.frontLift;
  m.uProfileFlip = p.profileFlip;
  m.uAsymmetry = p.asymmetry;
  m.uFineAmp = p.fineAmp;
  m.uPleatAmp = p.pleatAmp;
  m.uPleatFreq = p.pleatFreq;
}
