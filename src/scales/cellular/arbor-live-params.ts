// src/scales/cellular/arbor-live-params.ts
// Dev-only override channel for the arbor's params: the leva panel
// (arbor-dev-tools.tsx, DEV-gated) writes here and ArborMesh re-applies on
// change. Unlike the shell's channel this one is SUBSCRIBABLE — growth params
// change CPU-built geometry, so the mesh needs a push to rebuild, not a
// per-frame uniform poll. Production never sets it; the shipping cost is one
// null check at mount. Kept out of the dev module so the shipping scene never
// imports leva.
import type { ArborParams } from './arbor-params';

let override: ArborParams | null = null;
const listeners = new Set<() => void>();

export function setArborParamsOverride(p: ArborParams | null): void {
  override = p;
  for (const listener of listeners) listener();
}

export function getArborParamsOverride(): ArborParams | null {
  return override;
}

/** Notifies on every override write. Returns the unsubscribe. */
export function subscribeArborParams(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
