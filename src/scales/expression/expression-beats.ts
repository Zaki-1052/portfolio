// src/scales/expression/expression-beats.ts
// The expression band's beat math: depth → beat, depth → envelope, depth →
// sign-off characters. Everything the signal-origin scene does on the SCROLL
// clock lives here as pure functions of depth (the two-clock rule: the
// sign-off scrubs with scroll; ambient pulses ride uTime; the submit spark
// and final pulse are event-driven and their thresholds/durations are these
// params). Unlike the terminal there is no exit choreography — this is the
// LAST scale, so the annotations envelope rises and never fades, and the
// warm bookend runs to exactly depth 1. Pure — no three/react imports;
// unit-tested in isolation.
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import { clamp, smoothstep } from '@/utils/math';

export interface ExpressionBeatParams {
  /** The intro prose resolves from the haze. */
  introStart: number;
  /** The intro has fully cleared — the annotations own the band. */
  introEnd: number;
  /** The signal lines / contact annotations reveal threshold. */
  annotationsReveal: number;
  /** The broadcast starts winding down — pulses sparser, lines dimming. */
  windDownStart: number;
  /** The amber bookend starts bleeding back in from the edges. */
  warmStart: number;
  /** Forward-crossing fires the one final pulse down the email line. */
  lastPulseAt: number;
  /** The sign-off line scroll-scrubs across [signoffStart, signoffEnd]. */
  signoffStart: number;
  signoffEnd: number;
  /** The `> surface_` control fades in. */
  surfaceRevealAt: number;
  /** Ambient traveling-pulse speed (line-lengths per second, shader uTime). */
  pulseSpeed: number;
  /** Event-driven pulse travel time (submit spark / final pulse). */
  eventPulseDurationMs: number;
  /** Dwell at the very bottom before the idle garnish types. */
  garnishIdleMs: number;
  /** The garnish only arms this deep — the true floor of the descent. */
  garnishMinDepth: number;
}

// v1 defaults from the validated design (§5.4–§5.5) — tuned live in leva
// (expression-dev-tools) via liveExpressionBeatParams, then blessed values
// baked back here. Frozen so a dev-panel write can only land on the live copy.
export const EXPRESSION_BEAT_DEFAULTS: Readonly<ExpressionBeatParams> = Object.freeze({
  introStart: 0.87,
  introEnd: 0.9,
  annotationsReveal: 0.9,
  windDownStart: 0.94,
  warmStart: 0.94,
  lastPulseAt: 0.955,
  signoffStart: 0.955,
  signoffEnd: 0.985,
  surfaceRevealAt: 0.97,
  pulseSpeed: 0.18,
  eventPulseDurationMs: 1300,
  garnishIdleMs: 20000,
  garnishMinDepth: 0.985,
});

// Mutable working copy the dev panel writes into; production reads the frozen
// defaults above (the liveTerminalBeatParams pattern).
export const liveExpressionBeatParams: ExpressionBeatParams = { ...EXPRESSION_BEAT_DEFAULTS };

export type ExpressionBeat = 'before' | 'arrival' | 'plateau' | 'windDown' | 'signoff';

export function expressionBeatFor(
  depth: number,
  p: ExpressionBeatParams = EXPRESSION_BEAT_DEFAULTS,
): ExpressionBeat {
  if (depth < SCALE_BOUNDARIES[6]) return 'before';
  if (depth < p.annotationsReveal) return 'arrival';
  if (depth < p.windDownStart) return 'plateau';
  if (depth < p.signoffStart) return 'windDown';
  return 'signoff';
}

/** Edge width of the intro's resolve/clear ramps (the CoilIntro shape,
 *  expressed here so the envelope stays node-testable). */
export const INTRO_EDGE_SPAN = 0.008;

/** The intro prose envelope: resolves from the haze after the band opens,
 *  clears before the annotations arrive. */
export function introRevealT(
  depth: number,
  p: ExpressionBeatParams = EXPRESSION_BEAT_DEFAULTS,
): number {
  const rise = smoothstep(p.introStart, p.introStart + INTRO_EDGE_SPAN, depth);
  const fall = 1 - smoothstep(p.introEnd - INTRO_EDGE_SPAN, p.introEnd, depth);
  return rise * fall;
}

/** Reveal ramp width for the annotations/lines. */
export const ANNOTATIONS_REVEAL_SPAN = 0.01;

/**
 * The annotation/line reveal envelope. Rises once and NEVER fades — this is
 * the last scale; there is nothing to hand off to, and the contact channels
 * must stay reachable at the very bottom (the closing movement dims via
 * windDownT, it never removes).
 */
export function annotationsEnvelope(
  depth: number,
  p: ExpressionBeatParams = EXPRESSION_BEAT_DEFAULTS,
): number {
  return smoothstep(p.annotationsReveal, p.annotationsReveal + ANNOTATIONS_REVEAL_SPAN, depth);
}

/** The broadcast wind-down: 0 through the plateau → 1 at the very bottom.
 *  Consumers dim pulse cadence/line brightness toward embers with it. */
export function windDownT(
  depth: number,
  p: ExpressionBeatParams = EXPRESSION_BEAT_DEFAULTS,
): number {
  return smoothstep(p.windDownStart, 1, depth);
}

/** Fraction of the sign-off window at which the scrub completes — the line
 *  sits whole for a breath at the floor (the terminal's SCRUB_COMPLETE
 *  precedent). */
export const SIGNOFF_COMPLETE_FRACTION = 0.9;

/**
 * Characters of the sign-off visible at `depth` — monotonic, saturating, and
 * a pure function of depth, so scrolling back up backspaces it exactly.
 */
export function signoffCharsTyped(
  depth: number,
  text: string,
  p: ExpressionBeatParams = EXPRESSION_BEAT_DEFAULTS,
): number {
  if (p.signoffEnd <= p.signoffStart) return depth >= p.signoffEnd ? text.length : 0;
  const completeAt = p.signoffStart + (p.signoffEnd - p.signoffStart) * SIGNOFF_COMPLETE_FRACTION;
  const t = clamp((depth - p.signoffStart) / (completeAt - p.signoffStart), 0, 1);
  return Math.floor(t * text.length);
}

/** The amber bookend: 0 through the band → 1 at exactly depth 1. Dual-
 *  written to scene uniforms and the --expression-warmth CSS property —
 *  both sides read THIS function, never a copy. */
export function warmBookendT(
  depth: number,
  p: ExpressionBeatParams = EXPRESSION_BEAT_DEFAULTS,
): number {
  return smoothstep(p.warmStart, 1, depth);
}

/** Reveal ramp width for the CRT scanline overlay at the band edge. */
export const SCANLINE_RISE_SPAN = 0.01;

/** CRT scanline overlay opacity: rises just inside the band and stays — the
 *  scanline is this scale's texture, present to the very bottom. */
export function scanlineOpacityFor(depth: number, maxOpacity: number): number {
  return (
    maxOpacity * smoothstep(SCALE_BOUNDARIES[6], SCALE_BOUNDARIES[6] + SCANLINE_RISE_SPAN, depth)
  );
}
