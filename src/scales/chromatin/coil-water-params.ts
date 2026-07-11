// src/scales/chromatin/coil-water-params.ts
// The band's water-medium parameters — the suspended layers (silt, bokeh
// motes, bubbles, veils) plus the shared current — with a dev-only override
// channel mirroring coil-live-params. The coil atmosphere derives its layer
// configs from these; a panel write re-derives them (dev-only — particle
// fields re-scatter on a slider change, which is fine for tuning). CoilMesh
// reads the current terms per frame for the body sway. All values are 5.6
// starters, re-blessed by eye in the preview.
import { COIL_CURRENT_DEFAULTS } from './coil-current';

export interface CoilWaterParams {
  /** Fine suspended silt: the volume-filling particulate (retuned drift
   *  field — smaller, dimmer, denser than the old twinkle motes). */
  siltCount: number;
  siltOpacity: number;
  /** Sparkle: the band's twinkling star-points (user-requested return of
   *  the pre-5.6 vibe, sparser) — brighter than silt, each pulsing on its
   *  own phase. */
  sparkleCount: number;
  sparkleOpacity: number;
  /** Near-field bokeh: sparse large soft discs close to the lens — the
   *  out-of-focus foreground that sells "inside a medium". */
  bokehCount: number;
  bokehOpacity: number;
  bokehMaxPx: number;
  /** Drifting veils far behind the coil (normal blending — they genuinely
   *  veil, not glow). */
  wispOpacity: number;
  wispColor: string;
  /** Sparse rising bubbles: count, climb speed (units/s), sprite opacity. */
  bubbleCount: number;
  bubbleRise: number;
  bubbleOpacity: number;
  /** The shared current (see coil-current.ts): sway amplitude for the
   *  particle layers, temporal frequency, compass direction — and the far
   *  smaller amplitude applied to the coil body itself (drums + cord +
   *  knobs share the exact expression, so nothing detaches). */
  currentAmp: number;
  currentFreq: number;
  currentDirDeg: number;
  beadCurrentAmp: number;
}

export const COIL_WATER_DEFAULTS: CoilWaterParams = {
  siltCount: 650,
  siltOpacity: 0.32,
  sparkleCount: 150,
  sparkleOpacity: 0.45,
  bokehCount: 60,
  bokehOpacity: 0.35,
  bokehMaxPx: 64,
  wispOpacity: 0.16,
  wispColor: '#2e5560',
  bubbleCount: 28,
  bubbleRise: 0.5,
  bubbleOpacity: 0.6,
  currentAmp: COIL_CURRENT_DEFAULTS.amp,
  currentFreq: COIL_CURRENT_DEFAULTS.freq,
  currentDirDeg: COIL_CURRENT_DEFAULTS.dirDeg,
  beadCurrentAmp: 0.05,
};

let override: CoilWaterParams | null = null;
const listeners = new Set<() => void>();

export function setCoilWaterOverride(p: CoilWaterParams | null): void {
  override = p;
  for (const listener of listeners) listener();
}

export function getCoilWaterOverride(): CoilWaterParams | null {
  return override;
}

/** Notifies on every override write. Returns the unsubscribe. */
export function subscribeCoilWater(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
