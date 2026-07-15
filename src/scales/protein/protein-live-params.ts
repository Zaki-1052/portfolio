// src/scales/protein/protein-live-params.ts
// Dev-only override channel for the ribbon's look params: the leva panel
// (protein-dev-tools.tsx, DEV-gated) writes here and ProteinMesh re-applies on
// change. SUBSCRIBABLE like the coil's channel — the mesh needs a push to
// re-run its uniform writer, not a per-frame poll. Production never sets it;
// the shipping cost is one null check at mount. Kept out of the dev module so
// the shipping scene never imports leva.
import type { ProteinLookParams } from './protein-params';

let override: ProteinLookParams | null = null;
const listeners = new Set<() => void>();

export function setProteinLookOverride(p: ProteinLookParams | null): void {
  override = p;
  for (const listener of listeners) listener();
}

export function getProteinLookOverride(): ProteinLookParams | null {
  return override;
}

/** Notifies on every override write. Returns the unsubscribe. */
export function subscribeProteinLook(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
