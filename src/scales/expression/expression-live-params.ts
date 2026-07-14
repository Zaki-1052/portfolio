// src/scales/expression/expression-live-params.ts
// Dev-only override channel for the signal scene's look params (the
// code-live-params pattern): null in production — scene components read
// `getExpressionLookOverride() ?? SIGNAL_LOOK_DEFAULTS` and subscribe for
// leva pushes. The surface-flight mode is a separate DEV experiment toggle
// (§5.5's parked reverse-flight ascent): SurfaceControl reads it at click
// time; the leva binding lives in expression-dev-tools and is
// import.meta.env.DEV-gated, so production can never leave 'push-in'.
import type { SignalLookParams } from './signal-params';

let lookOverride: SignalLookParams | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

export function setExpressionLookOverride(p: SignalLookParams | null): void {
  lookOverride = p;
  notify();
}

export function getExpressionLookOverride(): SignalLookParams | null {
  return lookOverride;
}

export function subscribeExpressionParams(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type SurfaceFlightMode = 'push-in' | 'reverse-scroll';

let surfaceFlightMode: SurfaceFlightMode = 'push-in';

export function setSurfaceFlightMode(mode: SurfaceFlightMode): void {
  surfaceFlightMode = mode;
}

export function getSurfaceFlightMode(): SurfaceFlightMode {
  return surfaceFlightMode;
}
