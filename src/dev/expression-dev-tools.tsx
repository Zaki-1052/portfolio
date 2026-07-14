// src/dev/expression-dev-tools.tsx
// DEV-ONLY leva controls for the expression band — signal look, beat
// depths, and the surface-flight experiment toggle. One shared set of
// hooks, two consumers, the code-dev-tools pattern:
//   - expression-preview.tsx tunes the signal scene in isolation;
//   - <ExpressionDevTools/> (app.tsx, DEV-gated) tunes it IN CONTEXT.
// Look params write the expression-live-params override (subscribable —
// packet density rebuilds the pool); beat depths write
// liveExpressionBeatParams directly (the liveTerminalBeatParams pattern).
// The surface folder A/Bs the closing movement: 'reverse-scroll' (the
// shipped default) vs the 'push-in' camera replay. Every slider range
// includes its shipping default (leva silently clamps out-of-range →
// dev ≠ prod).
import { useEffect } from 'react';
import { invalidate } from '@react-three/fiber';
import { folder, useControls } from 'leva';
import { SIGNAL_LOOK_DEFAULTS, type SignalLookParams } from '@/scales/expression/signal-params';
import {
  setExpressionLookOverride,
  setSurfaceFlightMode,
  type SurfaceFlightMode,
} from '@/scales/expression/expression-live-params';
import {
  EXPRESSION_BEAT_DEFAULTS,
  liveExpressionBeatParams,
} from '@/scales/expression/expression-beats';

// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useExpressionLookControls(
  initial: SignalLookParams,
  collapsed: boolean,
): SignalLookParams {
  const [values] = useControls(() => ({
    'expression look': folder(
      {
        lineColor: { value: initial.lineColor },
        warmColor: { value: initial.warmColor },
        glowOpacity: { value: initial.glowOpacity, min: 0, max: 2, step: 0.01 },
        lineWidth: { value: initial.lineWidth, min: 0.01, max: 0.15, step: 0.001 },
        bowAmount: { value: initial.bowAmount, min: 0, max: 0.15, step: 0.002 },
        tintStrength: { value: initial.tintStrength, min: 0, max: 1, step: 0.01 },
        fadeStart: { value: initial.fadeStart, min: 0.2, max: 0.9, step: 0.01 },
        focusDimStrength: { value: initial.focusDimStrength, min: 0, max: 1, step: 0.01 },
        packetSize: { value: initial.packetSize, min: 0.05, max: 1, step: 0.005 },
        packetOpacity: { value: initial.packetOpacity, min: 0, max: 1, step: 0.01 },
        packetDensity: { value: initial.packetDensity, min: 0, max: 20, step: 1 },
        scanlineMaxOpacity: { value: initial.scanlineMaxOpacity, min: 0, max: 0.15, step: 0.002 },
        garnishEnabled: { value: initial.garnishEnabled },
      },
      { collapsed },
    ),
  }));
  return values as SignalLookParams;
}

/**
 * Beat-depth sliders writing straight into liveExpressionBeatParams — every
 * consumer reads the live object per frame under DEV. Ranges bracket the
 * shipped defaults; nonsense orderings are the tuner's rope.
 */
// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useExpressionBeatControls(collapsed: boolean): void {
  const d = EXPRESSION_BEAT_DEFAULTS;
  const [values] = useControls(() => ({
    'expression beats': folder(
      {
        introStart: { value: d.introStart, min: 0.862, max: 0.91, step: 0.001 },
        introEnd: { value: d.introEnd, min: 0.87, max: 0.94, step: 0.001 },
        annotationsReveal: { value: d.annotationsReveal, min: 0.87, max: 0.95, step: 0.001 },
        windDownStart: { value: d.windDownStart, min: 0.91, max: 0.99, step: 0.001 },
        warmStart: { value: d.warmStart, min: 0.91, max: 0.995, step: 0.001 },
        lastPulseAt: { value: d.lastPulseAt, min: 0.92, max: 0.995, step: 0.001 },
        signoffStart: { value: d.signoffStart, min: 0.92, max: 0.995, step: 0.001 },
        signoffEnd: { value: d.signoffEnd, min: 0.94, max: 1, step: 0.001 },
        surfaceRevealAt: { value: d.surfaceRevealAt, min: 0.93, max: 0.998, step: 0.001 },
        pulseSpeed: { value: d.pulseSpeed, min: 0, max: 0.5, step: 0.005 },
        eventPulseDurationMs: { value: d.eventPulseDurationMs, min: 0, max: 3000, step: 50 },
        garnishIdleMs: { value: d.garnishIdleMs, min: 1000, max: 60000, step: 500 },
        garnishMinDepth: { value: d.garnishMinDepth, min: 0.9, max: 1, step: 0.001 },
      },
      { collapsed },
    ),
  }));

  useEffect(() => {
    Object.assign(liveExpressionBeatParams, values);
    invalidate();
  }, [values]);
}

/** The §5.5 closing-movement A/B: flip `> surface_` between the shipped
 *  long-smooth reverse-scroll and the 'push-in' camera replay. Initial
 *  value mirrors the shipped default so DEV matches prod on load. */
// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useSurfaceFlightControls(collapsed: boolean): void {
  const [values] = useControls(() => ({
    'expression surface': folder(
      {
        flightMode: {
          value: 'reverse-scroll' as SurfaceFlightMode,
          options: ['push-in', 'reverse-scroll'],
        },
      },
      { collapsed },
    ),
  }));

  useEffect(() => {
    setSurfaceFlightMode(values.flightMode as SurfaceFlightMode);
  }, [values]);
}

/** The in-context panel for app.tsx ('expression …' folders in the shared
 *  leva root that CameraDevTools provides). */
export function ExpressionDevTools(): null {
  const look = useExpressionLookControls(SIGNAL_LOOK_DEFAULTS, true);
  useExpressionBeatControls(true);
  useSurfaceFlightControls(true);

  useEffect(() => {
    setExpressionLookOverride(look);
    invalidate();
  }, [look]);

  return null;
}
