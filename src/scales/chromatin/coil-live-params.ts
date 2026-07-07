// src/scales/chromatin/coil-live-params.ts
// Dev-only override channel for the coil's params: the leva panel
// (coil-dev-tools.tsx, DEV-gated) writes here and CoilMesh re-applies on
// change. SUBSCRIBABLE like the arbor's channel — growth params change
// CPU-built geometry, so the mesh needs a push to rebuild, not a per-frame
// uniform poll. Production never sets it; the shipping cost is one null
// check at mount. Kept out of the dev module so the shipping scene never
// imports leva.
import type { CoilParams } from './coil-params';

let override: CoilParams | null = null;
const listeners = new Set<() => void>();

export function setCoilParamsOverride(p: CoilParams | null): void {
  override = p;
  for (const listener of listeners) listener();
}

export function getCoilParamsOverride(): CoilParams | null {
  return override;
}

/** Notifies on every override write. Returns the unsubscribe. */
export function subscribeCoilParams(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
