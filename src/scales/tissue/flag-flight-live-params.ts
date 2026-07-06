// src/scales/tissue/flag-flight-live-params.ts
// Dev-only channels for the flag flight, mirroring shell-live-params.ts: the
// leva panel (flag-flight-dev-tools.tsx, DEV-gated) writes an override config
// here and FlagFlight reads it each frame; production never sets it, so the
// per-frame cost is one null check. The replay channel lets the panel re-fire
// the one-shot at the current scroll position for live tuning. Kept out of the
// dev module so the shipping scene never imports leva.
import type { FlagFlightConfig } from './flag-flight';

let override: FlagFlightConfig | null = null;

export function setFlagFlightOverride(cfg: FlagFlightConfig | null): void {
  override = cfg;
}

export function getFlagFlightOverride(): FlagFlightConfig | null {
  return override;
}

// One-shot replay request: the panel sets it, FlagFlight consumes it on the
// next frame (edge-triggered, so it fires exactly once per click).
let replayRequested = false;

export function requestFlagReplay(): void {
  replayRequested = true;
}

export function consumeFlagReplay(): boolean {
  if (!replayRequested) return false;
  replayRequested = false;
  return true;
}
