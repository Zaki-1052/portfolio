// src/scales/code/code-window-params.ts
// The terminal window's look parameters — chrome colors, macOS geometry
// fractions, edge treatment, glow — one source of truth mirroring the
// coil-params convention. Shipped as material defaults AND driven live by
// the code dev panel so the chrome is iterated by eye and the winning
// values frozen here. Pure data + a uniform applier; no three imports
// beyond types.
import type { Color } from 'three';

export interface CodeWindowLookParams {
  /** Matte body — --aod-bg-deep, the One-Dark editor ground. */
  bodyColor: string;
  /** Title-bar band — a step darker than the body with a subtle brushed
   *  finish and a lighter top sheen (the macOS chrome read). */
  titleBarColor: string;
  /** Phosphor green — the edge glow, the shader cursor. */
  accentColor: string;
  /** Corner rounding in half-height units — the §3.3 exception: the WINDOW
   *  keeps macOS rounding while everything inside it is sharp. */
  cornerRadius: number;
  /** Title-bar height as a fraction of the window height. */
  titleBarFrac: number;
  /** Emissive strength of the thin green edge glow — values pushed past the
   *  shared Bloom threshold so the rim blooms lightly (never a second
   *  EffectComposer). */
  edgeGlowStrength: number;
  /** Inner rim highlight strength — the lit top edge of the faked extrusion. */
  edgeHighlight: number;
  /** Inner rim AO strength — the soft shadow seating the faked extrusion. */
  edgeShadow: number;
  /** Traffic-light dot radius as a fraction of the title-bar height. */
  dotRadiusFrac: number;
  /** Fraction of the viewport height the locked window fills. */
  fillFraction: number;
}

export const CODE_WINDOW_DEFAULTS: Readonly<CodeWindowLookParams> = Object.freeze({
  bodyColor: '#21252b',
  titleBarColor: '#191c21',
  accentColor: '#98c379',
  cornerRadius: 0.035,
  titleBarFrac: 0.055,
  edgeGlowStrength: 1.3,
  edgeHighlight: 0.35,
  edgeShadow: 0.5,
  dotRadiusFrac: 0.16,
  fillFraction: 0.86,
});

/** The uniform surface applyWindowLook writes — matches the chrome material's
 *  field names (drei shaderMaterial exposes each uniform as a property). */
interface WindowChromeUniforms {
  uBodyColor: Color;
  uTitleBarColor: Color;
  uAccentColor: Color;
  uCornerRadius: number;
  uTitleBarFrac: number;
  uEdgeGlowStrength: number;
  uEdgeHighlight: number;
  uEdgeShadow: number;
  uDotRadiusFrac: number;
}

export function applyWindowLook(m: WindowChromeUniforms, p: CodeWindowLookParams): void {
  m.uBodyColor.set(p.bodyColor);
  m.uTitleBarColor.set(p.titleBarColor);
  m.uAccentColor.set(p.accentColor);
  m.uCornerRadius = p.cornerRadius;
  m.uTitleBarFrac = p.titleBarFrac;
  m.uEdgeGlowStrength = p.edgeGlowStrength;
  m.uEdgeHighlight = p.edgeHighlight;
  m.uEdgeShadow = p.edgeShadow;
  m.uDotRadiusFrac = p.dotRadiusFrac;
}
