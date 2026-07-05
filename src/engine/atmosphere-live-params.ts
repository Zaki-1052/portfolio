// src/engine/atmosphere-live-params.ts
// Dev-only override channel for the atmosphere/effects register: the leva
// panel (atmosphere-dev-tools.tsx, DEV-gated) writes here, and the per-frame
// consumers (SceneAtmosphere → fog, PostFX → bloom/grain/vignette,
// SurfaceScene → look curve) prefer the override when present. Production
// never sets it, so the shipping cost is one null check per consumer. Kept out
// of the dev module so the shipping scene never imports leva.

export interface AtmosphereParams {
  // Fog density curve endpoints (fogDensityFor).
  densityVeil: number;
  densityEstablish: number;
  densityBase: number;
  densityInterior: number;
  // Warm haze color override across the approach/tissue register (gated —
  // deeper scales keep their CSS-driven fog colors while tuning).
  fogWarmOn: boolean;
  fogWarm: string;
  // Interior fog target + how far the breakthrough pushes toward it.
  fogInterior: string;
  interiorPush: number;
  // Look curve endpoints (lookFor): dreamy at establish → crisp at the hover.
  lookEstablish: number;
  lookCrisp: number;
  // Void-fillers: glow backdrop, dust field, and haze-patch strengths.
  haloIntensity: number;
  moteOpacity: number;
  cloudOpacity: number;
  // Light shafts (exterior rakes + interior aperture beam) and cavern embers.
  shaftIntensity: number;
  emberOpacity: number;
  // Absolute post-processing overrides (gated — when off, the depth curves run).
  postOn: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
  grainOpacity: number;
  vignetteDarkness: number;
  vignetteOffset: number;
}

let override: AtmosphereParams | null = null;

export function setAtmosphereOverride(p: AtmosphereParams | null): void {
  override = p;
}

export function getAtmosphereOverride(): AtmosphereParams | null {
  return override;
}
