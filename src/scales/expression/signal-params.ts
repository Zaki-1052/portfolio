// src/scales/expression/signal-params.ts
// The signal-origin scene's look parameters + the applyXxxLook convention
// (coil-params / code-window-params mold): one frozen defaults object the
// shipped site reads, one apply function the mesh calls whenever the params
// or materials change. The dev override channel lives in
// src/dev/expression-live-params.ts.
import type { Color } from 'three';

export interface SignalLookParams {
  /** Base line register — the phosphor green continuing from the terminal. */
  lineColor: string;
  /** The amber the whole register lerps toward at the warm bookend. */
  warmColor: string;
  /** Additive glow strength of the line tubes. */
  glowOpacity: number;
  /** Tube base radius (world units); tapers toward the terminus. */
  lineWidth: number;
  /** Bézier bow as a fraction of line length — a breath of organic curl;
   *  zero is a dead-straight machined fan (banned register). */
  bowAmount: number;
  /** How strongly each channel's terminus accent tints the line's far end. */
  tintStrength: number;
  /** Arc fraction where the into-the-void fade begins. */
  fadeStart: number;
  /** How hard unfocused lines dim while one is focused. */
  focusDimStrength: number;
  /** Packet point size (screen-scaled). */
  packetSize: number;
  /** Packet peak opacity. */
  packetOpacity: number;
  /** Ambient packets per channel — geometry-affecting (pool rebuild), so it
   *  rides the subscribable look channel, not the polled beat params. */
  packetDensity: number;
  /** CRT scanline overlay peak opacity (the HTML layer reads this). */
  scanlineMaxOpacity: number;
  /** The §5.5.5 idle garnish on/off (ships on; cut freely). */
  garnishEnabled: boolean;
}

export const SIGNAL_LOOK_DEFAULTS: Readonly<SignalLookParams> = Object.freeze({
  lineColor: '#98c379',
  warmColor: '#e5c07b',
  glowOpacity: 0.85,
  lineWidth: 0.045,
  bowAmount: 0.05,
  tintStrength: 0.5,
  fadeStart: 0.55,
  focusDimStrength: 0.75,
  packetSize: 0.22,
  packetOpacity: 0.7,
  packetDensity: 6,
  scanlineMaxOpacity: 0.04,
  garnishEnabled: true,
});

/** Uniform fields applySignalLineLook writes — the line ShaderMaterial's
 *  look-driven subset (per-frame fields like uTime/uFocusDim are the mesh's
 *  concern, not the look's). */
export interface SignalLineLookUniforms {
  uColor: Color;
  uWarmColor: Color;
  uGlowOpacity: number;
  uTintStrength: number;
  uFadeStart: number;
  uFocusDimStrength: number;
}

export function applySignalLineLook(m: SignalLineLookUniforms, p: SignalLookParams): void {
  m.uColor.set(p.lineColor);
  m.uWarmColor.set(p.warmColor);
  m.uGlowOpacity = p.glowOpacity;
  m.uTintStrength = p.tintStrength;
  m.uFadeStart = p.fadeStart;
  m.uFocusDimStrength = p.focusDimStrength;
}
