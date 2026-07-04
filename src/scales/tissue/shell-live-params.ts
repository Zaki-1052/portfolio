// src/scales/tissue/shell-live-params.ts
// Dev-only override channel for the shell's macro-form params: the leva panel
// (shell-dev-tools.tsx, DEV-gated) writes here, and SurfaceScene applies the
// override onto the material each frame. Production never sets it, so the
// per-frame cost is one null check. Kept out of the dev module so the shipping
// scene never imports leva.
import type { ShellParams } from './shell-params';

let override: ShellParams | null = null;

export function setShellParamsOverride(p: ShellParams | null): void {
  override = p;
}

export function getShellParamsOverride(): ShellParams | null {
  return override;
}
