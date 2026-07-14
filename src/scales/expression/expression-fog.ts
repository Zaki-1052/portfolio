// src/scales/expression/expression-fog.ts
// The last band's fog layer as a pure additive delta over the blessed base
// curve — but unlike every band before it, the delta is NEGATIVE: a relief.
// §4/§5.1: the fog LIFTS as the cursor survives; expression is the sparsest,
// most open scale, and the closing movement wants "fog at its thinnest" at
// the very bottom. The base curve is flat (0.014) this deep, so the relief
// is what thins it — never below a positive floor (base + relief ≈ 0.008).
// The tint term leans the remaining fog warm-ward with the amber bookend
// (§5.5.3). Both evaluate to exactly 0 below the band — the code band is
// provably untouched. SceneAtmosphere (the sole fog owner) composes them;
// pure curves only.
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import { smoothstep } from '@/utils/math';

export const FOG_EXPRESSION_RELIEF_START = SCALE_BOUNDARIES[6]; // 0.86 — the custody crossing
export const FOG_EXPRESSION_RELIEF_SETTLE = 0.93; // fully lifted by the plateau's heart

/** How much the relief thins the flat 0.014 base — negative by design;
 *  the floor (base + relief) stays a positive whisper of medium. */
export const FOG_DENSITY_EXPRESSION_RELIEF = -0.006;

/** Mirrors EXPRESSION_BEAT_DEFAULTS.warmStart — the fog tint is part of the
 *  bookend gesture, kept as a local constant so this module stays free of
 *  the beats import (the code-fog convention: fog constants live here). */
export const FOG_EXPRESSION_WARM_START = 0.95;

/** Peak tint strength at the very bottom. */
export const FOG_EXPRESSION_TINT_MAX = 0.3;

/** Warm-leaned dark the thinned fog drifts toward as the amber bookend
 *  bleeds in — tissue warmth remembered, never a saturated gold. */
export const EXPRESSION_FOG_TINT = '#2a2620';

export function expressionFogDensityDeltaFor(depth: number): number {
  const t = smoothstep(FOG_EXPRESSION_RELIEF_START, FOG_EXPRESSION_RELIEF_SETTLE, depth);
  // Guard the -0 wart: a negative coefficient times the zero outside the
  // window would return -0, and the zero-outside contract is asserted with
  // Object.is strictness.
  return t === 0 ? 0 : FOG_DENSITY_EXPRESSION_RELIEF * t;
}

export function expressionFogColorBlendT(depth: number): number {
  return FOG_EXPRESSION_TINT_MAX * smoothstep(FOG_EXPRESSION_WARM_START, 1, depth);
}
