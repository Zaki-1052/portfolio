// src/scales/code/code-live-params.ts
// Dev-only override channel for the code band's window look and environment
// params: the leva panel (code-dev-tools.tsx, DEV-gated) writes here and the
// scene components re-apply on change (the coil-live-params pattern —
// SUBSCRIBABLE, since the mote count rebuilds geometry and needs a push,
// not a per-frame poll). Beat depths take the other route: the panel writes
// liveTerminalBeatParams directly (the liveCameraKeyframes pattern).
// Production never sets these; the shipping cost is one null check. Kept
// out of the dev module so the shipping scene never imports leva.
import type { CodeWindowLookParams } from './code-window-params';

export interface CodeEnvironmentParams {
  variant: 'both' | 'grid' | 'motes' | 'none';
  gridOpacity: number;
  gridCellSize: number;
  moteOpacity: number;
  moteCount: number;
  moteDriftSpeed: number;
}

export const CODE_ENVIRONMENT_DEFAULTS: Readonly<CodeEnvironmentParams> = Object.freeze({
  variant: 'both' as const,
  gridOpacity: 0.16,
  gridCellSize: 4,
  moteOpacity: 0.1,
  moteCount: 140,
  moteDriftSpeed: 0.35,
});

let windowOverride: CodeWindowLookParams | null = null;
let environmentOverride: CodeEnvironmentParams | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function setCodeWindowOverride(p: CodeWindowLookParams | null): void {
  windowOverride = p;
  notify();
}

export function getCodeWindowOverride(): CodeWindowLookParams | null {
  return windowOverride;
}

export function setCodeEnvironmentOverride(p: CodeEnvironmentParams | null): void {
  environmentOverride = p;
  notify();
}

export function getCodeEnvironmentOverride(): CodeEnvironmentParams | null {
  return environmentOverride;
}

/** Notifies on every override write (window or environment). Returns the
 *  unsubscribe. */
export function subscribeCodeParams(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
