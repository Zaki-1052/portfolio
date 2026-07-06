// src/scales/tissue/flag-flight.ts
// Pure math + config for the hero flag-flight flourish: a small flag card that
// flies in from the screen's bottom-right, arcs across, and dives into/behind
// the form. Mirrors breakthrough.ts — no `three` import, so the whole module is
// node-testable. flag-flight.tsx owns the camera unprojection (screen-anchored
// entry → world points) and applies these results to the live mesh; everything
// here is a deterministic function of its inputs.
//
// The flight is a ONE-SHOT timed animation (not scroll-scrubbed): the trigger
// predicates below fire it on a scroll-depth crossing, then flag-flight.tsx
// runs it on its own elapsed-time clock. Two baked presets let the launch frame
// (top-down crease hero vs. establishing reveal) be chosen live in leva, then
// the winner baked into FLAG_FLIGHT_DEFAULT.
import { clamp, smoothstep } from '@/utils/math';
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';

export type Vec3 = readonly [number, number, number];
export type Ndc = readonly [number, number]; // normalized device coords, x/y ∈ [-1, 1]

/** A screen-anchored waypoint: an NDC point placed `dist` world-units in front of the camera. */
export interface FlightWaypointNdc {
  ndc: Ndc;
  dist: number;
}

export interface FlagFlightConfig {
  launchDepth: number; // canonical scroll depth the flight fires at (downward crossing)
  rearmMargin: number; // re-arm once depth drops below launchDepth − this
  duration: number; // flight length, seconds
  size: number; // world height of the flag card (width = size × aspect)
  aspect: number; // flag width / height
  bank: number; // max bank into velocity, radians
  waveAmp: number; // cloth-ripple amplitude (0 = flat card)
  waveFreq: number; // cloth-ripple spatial frequency
  fadeInEnd: number; // t ∈ [0,1] at which opacity reaches full
  fadeOutStart: number; // t ∈ [0,1] at which opacity starts dropping
  peakOpacity: number; // envelope peak (< 1 = a slightly translucent card)
  entry: FlightWaypointNdc; // screen-anchored entry (bottom-right)
  arc: readonly FlightWaypointNdc[]; // screen-anchored mid waypoints
  exit: Vec3; // world-space endpoint (into the crease / behind the shell)
}

// The tissue band ends here (SCALE_BOUNDARIES = [0, 0.14, 0.28, …]); scrolling
// past it also re-arms the flight, so a return to the hero replays it once.
export const TISSUE_END = SCALE_BOUNDARIES[2]!;

/**
 * Preset A — the top-down crease hero (~depth 0.15): the camera hovers straight
 * over the form with the crease a vertical slot. The flag skims the surface and
 * dives INTO the crease/aperture (the groove the camera then plunges through).
 */
export const FLAG_FLIGHT_TOPDOWN: FlagFlightConfig = {
  launchDepth: 0.15,
  rearmMargin: 0.05,
  duration: 1.2,
  size: 3.2,
  aspect: 36 / 26, // flag artwork spans y≈5..31, x 0..36 → ≈1.385
  bank: 0.25,
  waveAmp: 0,
  waveFreq: 4,
  fadeInEnd: 0.15,
  fadeOutStart: 0.8,
  peakOpacity: 1.0,
  entry: { ndc: [0.85, -0.95], dist: 14 },
  arc: [{ ndc: [0.2, 0.3], dist: 20 }],
  exit: [0, 1, -5],
};

/**
 * Preset B — the establishing reveal (~depth 0.02): the far, elevated 3/4 view
 * where the form first resolves. The flag passes BEHIND the shell relative to
 * the camera and sinks into the void.
 */
export const FLAG_FLIGHT_ESTABLISH: FlagFlightConfig = {
  launchDepth: 0.01,
  rearmMargin: 0.02,
  duration: 2.0,
  size: 3,
  aspect: 36 / 26,
  bank: 0.3,
  waveAmp: 0.3, // cloth ripple (user-tuned 2026-07-05)
  waveFreq: 6,
  fadeInEnd: 0.15,
  fadeOutStart: 0.78,
  peakOpacity: 0.5, // slightly translucent — a ghostly opening beat
  entry: { ndc: [0.9, -0.9], dist: 40 },
  arc: [{ ndc: [0.1, 0.25], dist: 70 }],
  exit: [-6, -10, -16],
};

export const FLAG_FLIGHT_PRESETS = {
  topDown: FLAG_FLIGHT_TOPDOWN,
  establish: FLAG_FLIGHT_ESTABLISH,
} as const;

export type FlagPresetName = keyof typeof FLAG_FLIGHT_PRESETS;

// The shipped default. Live tuning (2026-07-05) picked the establishing reveal
// at the start of the approach — the flag reads as the opening identity beat,
// before the pfp-carried hero. The dev override replaces this at runtime in DEV.
export const FLAG_FLIGHT_DEFAULT: FlagFlightConfig = FLAG_FLIGHT_ESTABLISH;

/**
 * True on the frame scroll depth rises across `launchDepth` (arriving at the
 * hero by scrolling down). One-directional on purpose: scrolling back UP through
 * the hero should not fire it — re-arm + a later downward return replays it.
 */
export function crossedLaunch(prev: number, cur: number, launchDepth: number): boolean {
  return prev < launchDepth && cur >= launchDepth;
}

/**
 * True once the viewer has clearly left the hero neighborhood — back up toward
 * the approach (below launchDepth − rearmMargin) or down past the tissue band.
 * Crossing this re-arms the one-shot so the next arrival replays it.
 */
export function leftRearmZone(depth: number, cfg: FlagFlightConfig): boolean {
  return depth < cfg.launchDepth - cfg.rearmMargin || depth >= TISSUE_END;
}

/** Smooth ease-in-out for the flight parameter (0→0, 1→1). */
export function flightEase(t: number): number {
  return smoothstep(0, 1, t);
}

/**
 * Opacity envelope across the flight: a quick fade-in at launch and a fade-out
 * near the end, so the card resolves from nothing and dissolves as it recedes
 * (occlusion + fog do the rest).
 */
export function flightOpacity(t: number, fadeInEnd: number, fadeOutStart: number): number {
  const fadeIn = smoothstep(0, fadeInEnd, t);
  const fadeOut = 1 - smoothstep(fadeOutStart, 1, t);
  return clamp(fadeIn * fadeOut, 0, 1);
}

/** One-axis uniform Catmull-Rom (passes through p1 at t=0 and p2 at t=1). */
function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (p2 - p0) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Sample a Catmull-Rom curve through the world-space control `points` at t ∈
 * [0,1] across the whole path. Endpoints are exact (t=0 → points[0], t=1 →
 * last), so the flight always starts at the screen-anchored entry and ends at
 * the world exit. Endpoint tangents duplicate the terminal points.
 */
export function sampleFlightPath(points: readonly Vec3[], t: number): Vec3 {
  const n = points.length;
  if (n === 0) return [0, 0, 0];
  if (n === 1) return [points[0]![0], points[0]![1], points[0]![2]];
  const c = clamp(t, 0, 1);
  const seg = c * (n - 1);
  const i = Math.min(Math.floor(seg), n - 2);
  const localT = seg - i;
  const p0 = points[Math.max(0, i - 1)]!;
  const p1 = points[i]!;
  const p2 = points[i + 1]!;
  const p3 = points[Math.min(n - 1, i + 2)]!;
  return [
    catmull(p0[0], p1[0], p2[0], p3[0], localT),
    catmull(p0[1], p1[1], p2[1], p3[1], localT),
    catmull(p0[2], p1[2], p2[2], p3[2], localT),
  ];
}
