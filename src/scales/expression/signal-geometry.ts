// src/scales/expression/signal-geometry.ts
// The signal fan's pure math: the five contact channels, their authored
// world-space bearings, and — most load-bearing — resolveSignalOrigin(), the
// single source of truth for "where is the node." Three consumers
// (SignalOriginNode, SignalLines, camera-controller's channel focus) read the
// SAME resolution so they can never disagree (the windowLockedRect
// single-source precedent from Phase 7). The origin adopts the surviving
// cursor's frozen position at the 0.86 custody crossing and eases onto the
// authored anchor by ORIGIN_EASE_END — a pure function of depth and the live
// mirror, so scrubbing back into the code band and forward again re-runs the
// ease from wherever the cursor re-freezes. Pure — no three/react imports.
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import type { Vec3 } from '@/engine/camera-keyframes';
import { lerp, smoothstep } from '@/utils/math';
import { getCodeCursorState } from '@/scales/code/code-cursor-state';

/** One channel per content/links.json entry, in the doc register's render
 *  order (email → socials → external) — the annotation Tab order and the
 *  shader's aChannel indices both follow this list. */
export type SignalChannelId = 'email' | 'github' | 'linkedin' | 'bluesky' | 'resume';

export const SIGNAL_CHANNEL_IDS: readonly SignalChannelId[] = [
  'email',
  'github',
  'linkedin',
  'bluesky',
  'resume',
];

export function channelIndexOf(channel: SignalChannelId): number {
  return SIGNAL_CHANNEL_IDS.indexOf(channel);
}

function normalize(v: readonly [number, number, number]): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Authored unit bearings the lines radiate along, world space. The plateau
 * camera looks roughly down -Z at the origin, so the fan spreads mostly
 * laterally (X/Y) with a small -Z lean so every line recedes a touch into
 * the void. PLACEHOLDER fan — tuned in Stage E against the annotation
 * de-collision until no viewport width overlaps labels.
 */
export const SIGNAL_CHANNEL_DIRECTIONS: Readonly<Record<SignalChannelId, Vec3>> = Object.freeze({
  email: normalize([-0.6, 0.3, -0.15]),
  github: normalize([0.62, 0.34, -0.12]),
  linkedin: normalize([0.66, -0.24, -0.18]),
  bluesky: normalize([-0.56, -0.3, -0.2]),
  resume: normalize([0.04, 0.62, -0.18]),
});

/** World-unit length of a signal line, origin → terminus. */
export const SIGNAL_LINE_LENGTH = 14;

/**
 * Authored resting place of the signal origin — near where the surviving
 * cursor's frozen seat lands for the blessed camera path, so the adoption
 * ease is a drift, not a jump. PLACEHOLDER — tuned in Stage E together with
 * the expression camera knots (same session, same bake, so the 1.0
 * endpoint's framing and this point never drift apart).
 */
export const AUTHORED_SIGNAL_ORIGIN: Vec3 = [-3.0, -34.8, -46.0];

/** Authored node extents once the ease lands — a touch larger than the
 *  terminal's character cell, for presence as the scene's one light source. */
export const AUTHORED_NODE_WIDTH = 0.15;
export const AUTHORED_NODE_HEIGHT = 0.24;

/** The custody crossing — the survivor hides, the node shows. */
export const ORIGIN_EASE_START = SCALE_BOUNDARIES[6]; // 0.86
/** By here the node sits on the authored anchor regardless of where the
 *  cursor froze (bounds viewport/parallax variance in the frozen seat). */
export const ORIGIN_EASE_END = 0.885;

export function originBlendT(depth: number): number {
  return smoothstep(ORIGIN_EASE_START, ORIGIN_EASE_END, depth);
}

interface CursorStateLike {
  position: readonly [number, number, number];
  width: number;
  height: number;
  active: boolean;
  version: number;
}

/**
 * Where the signal origin sits at `depth`. Adopts the surviving cursor's
 * frozen position while the mirror is active (the handoff), easing onto the
 * authored anchor across [ORIGIN_EASE_START, ORIGIN_EASE_END]; falls back to
 * the authored anchor outright when there is no live cursor (deep links,
 * no-handoff paths, rewinds below the farewell hold — where the node is not
 * visible anyway).
 */
export function resolveSignalOrigin(
  depth: number,
  cursor: CursorStateLike = getCodeCursorState(),
  authored: Vec3 = AUTHORED_SIGNAL_ORIGIN,
): Vec3 {
  if (!cursor.active) return authored;
  const t = originBlendT(depth);
  return [
    lerp(cursor.position[0], authored[0], t),
    lerp(cursor.position[1], authored[1], t),
    lerp(cursor.position[2], authored[2], t),
  ];
}

/** The node's extents at `depth` — the frozen character cell at the custody
 *  crossing, easing to the authored presence with the same blend as the
 *  position (one gesture, not two). */
export function resolveSignalNodeSize(
  depth: number,
  cursor: CursorStateLike = getCodeCursorState(),
): { width: number; height: number } {
  if (!cursor.active || cursor.width <= 0 || cursor.height <= 0) {
    return { width: AUTHORED_NODE_WIDTH, height: AUTHORED_NODE_HEIGHT };
  }
  const t = originBlendT(depth);
  return {
    width: lerp(cursor.width, AUTHORED_NODE_WIDTH, t),
    height: lerp(cursor.height, AUTHORED_NODE_HEIGHT, t),
  };
}

/** The far end of a channel's line. */
export function signalChannelTerminus(
  origin: Vec3,
  channel: SignalChannelId,
  length: number = SIGNAL_LINE_LENGTH,
): Vec3 {
  const dir = SIGNAL_CHANNEL_DIRECTIONS[channel];
  return [origin[0] + dir[0] * length, origin[1] + dir[1] * length, origin[2] + dir[2] * length];
}
