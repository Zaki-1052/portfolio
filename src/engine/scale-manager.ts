// src/engine/scale-manager.ts
// Canonical depth coordinate system for the descent. Owns the biological scale
// order, the fixed canonical boundaries, and the piecewise remap that maps raw
// document-scroll progress (from unequal-height sections) onto those boundaries.
// Everything here is pure except measureSectionBoundaries (the single DOM read).

export type ScaleName = 'tissue' | 'cellular' | 'chromatin' | 'protein' | 'code' | 'expression';

export const SCALES: readonly ScaleName[] = [
  'tissue',
  'cellular',
  'chromatin',
  'protein',
  'code',
  'expression',
] as const;

// Canonical depth bands: each scale owns [SCALE_BOUNDARIES[i], SCALE_BOUNDARIES[i+1]).
// These are fixed constants so Phase 3+ camera keyframes stay valid across copy edits.
export const SCALE_BOUNDARIES = [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1.0] as const;

// Canonical width of the color-blend zone straddling each internal boundary.
export const TRANSITION_ZONE = 0.03;

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function scaleFromDepth(depth: number): ScaleName {
  for (let i = SCALE_BOUNDARIES.length - 2; i >= 0; i--) {
    if (depth >= SCALE_BOUNDARIES[i]!) {
      return SCALES[i]!;
    }
  }
  return SCALES[0]!;
}

/** Local progress (0..1) through a given scale's canonical band. */
export function scaleProgressFor(depth: number, scale: ScaleName): number {
  const i = SCALES.indexOf(scale);
  const start = SCALE_BOUNDARIES[i]!;
  const end = SCALE_BOUNDARIES[i + 1]!;
  return clamp01((depth - start) / (end - start));
}

export interface BlendZone {
  from: ScaleName; // theme at t=0
  to: ScaleName; // theme at t=1
  t: number; // 0..1 across the zone (0.5 exactly on the boundary)
}

/**
 * Which two scales' themes to blend at this depth, and how far. Outside any
 * transition zone, from === to (no blend). Only internal boundaries blend.
 */
export function blendZoneFor(depth: number): BlendZone {
  const half = TRANSITION_ZONE / 2;
  for (let i = 1; i < SCALE_BOUNDARIES.length - 1; i++) {
    const b = SCALE_BOUNDARIES[i]!;
    if (Math.abs(depth - b) <= half) {
      return {
        from: SCALES[i - 1]!,
        to: SCALES[i]!,
        t: clamp01((depth - (b - half)) / TRANSITION_ZONE),
      };
    }
  }
  const current = scaleFromDepth(depth);
  return { from: current, to: current, t: 1 };
}

export interface TransitionState {
  currentScale: ScaleName;
  previousScale: ScaleName | null;
  isTransitioning: boolean;
  scaleProgress: number;
}

/**
 * Next discrete transition bookkeeping from the prior state and a new depth.
 * previousScale is set on a scale change and held while still inside the zone,
 * then cleared once the crossing settles.
 */
export function nextTransitionState(prev: TransitionState, depth: number): TransitionState {
  const currentScale = scaleFromDepth(depth);
  const zone = blendZoneFor(depth);
  const isTransitioning = zone.from !== zone.to;
  const scaleChanged = currentScale !== prev.currentScale;
  return {
    currentScale,
    previousScale: scaleChanged ? prev.currentScale : isTransitioning ? prev.previousScale : null,
    isTransitioning,
    scaleProgress: scaleProgressFor(depth, currentScale),
  };
}

/**
 * Piecewise-linear remap: raw document-scroll fraction -> canonical depth.
 * rawBoundaries[i] is the raw progress at which scale i's band begins (measured
 * from the DOM). Each raw span [rawBoundaries[i], rawBoundaries[i+1]] maps onto
 * the canonical band [SCALE_BOUNDARIES[i], SCALE_BOUNDARIES[i+1]].
 */
export function rawProgressToDepth(raw: number, rawBoundaries: readonly number[]): number {
  const r = clamp01(raw);
  for (let i = 0; i < SCALE_BOUNDARIES.length - 1; i++) {
    const r0 = rawBoundaries[i]!;
    const r1 = rawBoundaries[i + 1]!;
    if (r <= r1 || i === SCALE_BOUNDARIES.length - 2) {
      const t = r1 > r0 ? clamp01((r - r0) / (r1 - r0)) : 1;
      return SCALE_BOUNDARIES[i]! + t * (SCALE_BOUNDARIES[i + 1]! - SCALE_BOUNDARIES[i]!);
    }
  }
  return 1;
}

/** Inverse of rawProgressToDepth (round-trip tests + future camera tooling). */
export function depthToRawProgress(depth: number, rawBoundaries: readonly number[]): number {
  const d = clamp01(depth);
  for (let i = 0; i < SCALE_BOUNDARIES.length - 1; i++) {
    const d0 = SCALE_BOUNDARIES[i]!;
    const d1 = SCALE_BOUNDARIES[i + 1]!;
    if (d <= d1 || i === SCALE_BOUNDARIES.length - 2) {
      const t = d1 > d0 ? clamp01((d - d0) / (d1 - d0)) : 1;
      return rawBoundaries[i]! + t * (rawBoundaries[i + 1]! - rawBoundaries[i]!);
    }
  }
  return 1;
}

// ---- URL hash <-> scale mapping (pure; kept here so tests don't pull the
// scroll engine's gsap/lenis imports into the node test environment) ----

export function hashForScale(scale: ScaleName): string {
  return `#${scale}`;
}

export function scaleFromHash(hash: string): ScaleName | null {
  const name = hash.replace(/^#/, '');
  return (SCALES as readonly string[]).includes(name) ? (name as ScaleName) : null;
}

/**
 * Raw-progress position of each section boundary, measured from the DOM.
 * Denominator is main height - viewport height, matching the master
 * ScrollTrigger's 'top top' -> 'bottom bottom' progress span. Returns the
 * canonical boundaries as a graceful fallback if the DOM isn't measurable yet.
 * DOM-touching: excluded from unit tests, verified manually.
 */
export function measureSectionBoundaries(): number[] {
  const main = document.querySelector('main');
  if (!main) {
    console.error('scale-manager: <main> not found; using canonical boundaries');
    return [...SCALE_BOUNDARIES];
  }
  const range = (main as HTMLElement).offsetHeight - window.innerHeight;
  if (range <= 0) return [...SCALE_BOUNDARIES];
  const mainTop = main.getBoundingClientRect().top + window.scrollY;
  const bounds: number[] = [0];
  for (const scale of SCALES.slice(1)) {
    const el = document.getElementById(scale);
    if (!el) {
      console.error(`scale-manager: section #${scale} not found; using canonical boundaries`);
      return [...SCALE_BOUNDARIES];
    }
    const top = el.getBoundingClientRect().top + window.scrollY - mainTop;
    bounds.push(clamp01(top / range));
  }
  bounds.push(1);
  // Monotonic guard: a short trailing section can measure below its predecessor
  // after clamping; keep the sequence non-decreasing so the remap stays valid.
  for (let i = 1; i < bounds.length; i++) bounds[i] = Math.max(bounds[i]!, bounds[i - 1]!);
  return bounds;
}
