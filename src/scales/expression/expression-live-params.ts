// src/scales/expression/expression-live-params.ts
// Dev-only override channel for the signal scene's look params (the
// code-live-params pattern): null in production — scene components read
// `getExpressionLookOverride() ?? SIGNAL_LOOK_DEFAULTS` and subscribe for
// leva pushes. The surface-flight mode is the closing movement's variant
// (§5.5): 'reverse-scroll' is the SHIPPED default — clicking `> surface_`
// plays the whole descent backward as one long smooth scroll. The leva
// toggle in expression-dev-tools lets a dev A/B it against the 'push-in'
// camera replay; SurfaceControl reads the mode at click time.
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

let surfaceFlightMode: SurfaceFlightMode = 'reverse-scroll';

export function setSurfaceFlightMode(mode: SurfaceFlightMode): void {
  surfaceFlightMode = mode;
}

export function getSurfaceFlightMode(): SurfaceFlightMode {
  return surfaceFlightMode;
}
