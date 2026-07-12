// src/dev/code-dev-tools.tsx
// DEV-ONLY leva controls for the code band — window chrome look, beat
// depths, and environment folders. One shared set of hooks, two consumers,
// the coil-dev-tools pattern:
//   - code-preview.tsx tunes the terminal in isolation;
//   - <CodeDevTools/> (app.tsx, DEV-gated) tunes it IN CONTEXT on the live
//     site, against the real camera path, fog, and band register.
// Look/environment write the code-live-params override; beat depths write
// liveTerminalBeatParams directly (the liveCameraKeyframes pattern). leva
// keys are global — 'code …' folders never collide with the other panels.
// Every slider range includes its shipping default (leva silently clamps
// out-of-range values → dev ≠ prod).
import { useEffect } from 'react';
import { invalidate } from '@react-three/fiber';
import { folder, useControls } from 'leva';
import { CODE_WINDOW_DEFAULTS, type CodeWindowLookParams } from '@/scales/code/code-window-params';
import {
  CODE_ENVIRONMENT_DEFAULTS,
  setCodeEnvironmentOverride,
  setCodeWindowOverride,
  type CodeEnvironmentParams,
} from '@/scales/code/code-live-params';
import { TERMINAL_BEAT_DEFAULTS, liveTerminalBeatParams } from '@/scales/code/terminal-beats';

// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useCodeWindowControls(
  initial: CodeWindowLookParams,
  collapsed: boolean,
): CodeWindowLookParams {
  const [values] = useControls(() => ({
    'code window': folder(
      {
        bodyColor: { value: initial.bodyColor },
        titleBarColor: { value: initial.titleBarColor },
        accentColor: { value: initial.accentColor },
        cornerRadius: { value: initial.cornerRadius, min: 0, max: 0.12, step: 0.001 },
        titleBarFrac: { value: initial.titleBarFrac, min: 0.03, max: 0.1, step: 0.001 },
        edgeGlowStrength: { value: initial.edgeGlowStrength, min: 0, max: 3, step: 0.05 },
        edgeHighlight: { value: initial.edgeHighlight, min: 0, max: 1, step: 0.01 },
        edgeShadow: { value: initial.edgeShadow, min: 0, max: 1, step: 0.01 },
        dotRadiusFrac: { value: initial.dotRadiusFrac, min: 0.08, max: 0.3, step: 0.005 },
        fillFraction: { value: initial.fillFraction, min: 0.5, max: 0.95, step: 0.005 },
      },
      { collapsed },
    ),
  }));
  return values as CodeWindowLookParams;
}

/**
 * Beat-depth sliders writing straight into liveTerminalBeatParams — every
 * consumer reads the live object per frame under DEV, so edits scrub the
 * session immediately. Ranges bracket the shipped defaults and each other's
 * plausible orderings; nonsense orderings are the tuner's rope.
 */
// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useCodeBeatControls(collapsed: boolean): void {
  const d = TERMINAL_BEAT_DEFAULTS;
  const [values] = useControls(() => ({
    'code beats': folder(
      {
        flightStart: { value: d.flightStart, min: 0.7, max: 0.75, step: 0.001 },
        bootStart: { value: d.bootStart, min: 0.71, max: 0.77, step: 0.001 },
        bootExecute: { value: d.bootExecute, min: 0.73, max: 0.79, step: 0.001 },
        exitStart: { value: d.exitStart, min: 0.79, max: 0.845, step: 0.001 },
        exitExecute: { value: d.exitExecute, min: 0.82, max: 0.855, step: 0.001 },
        farewellHoldEnd: { value: d.farewellHoldEnd, min: 0.84, max: 0.858, step: 0.001 },
        dissolveEnd: { value: d.dissolveEnd, min: 0.85, max: 0.87, step: 0.001 },
        outputPrintMs: { value: d.outputPrintMs, min: 0, max: 1200, step: 10 },
        tapCompleteMs: { value: d.tapCompleteMs, min: 0, max: 800, step: 10 },
      },
      { collapsed },
    ),
  }));

  useEffect(() => {
    Object.assign(liveTerminalBeatParams, values);
    invalidate();
  }, [values]);
}

// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useCodeEnvironmentControls(collapsed: boolean): void {
  const d = CODE_ENVIRONMENT_DEFAULTS;
  const [values] = useControls(() => ({
    'code environment': folder(
      {
        variant: { value: d.variant, options: ['both', 'grid', 'motes', 'none'] },
        gridOpacity: { value: d.gridOpacity, min: 0, max: 0.6, step: 0.005 },
        gridCellSize: { value: d.gridCellSize, min: 1, max: 12, step: 0.5 },
        moteOpacity: { value: d.moteOpacity, min: 0, max: 0.5, step: 0.005 },
        moteCount: { value: d.moteCount, min: 0, max: 400, step: 5 },
        moteDriftSpeed: { value: d.moteDriftSpeed, min: 0, max: 1.5, step: 0.05 },
      },
      { collapsed },
    ),
  }));

  useEffect(() => {
    setCodeEnvironmentOverride(values as CodeEnvironmentParams);
    invalidate();
  }, [values]);
}

/** The in-context panel for app.tsx ('code …' folders in the shared leva
 *  root that CameraDevTools provides). */
export function CodeDevTools(): null {
  const look = useCodeWindowControls(CODE_WINDOW_DEFAULTS, true);
  useCodeBeatControls(true);
  useCodeEnvironmentControls(true);

  useEffect(() => {
    setCodeWindowOverride(look);
    invalidate();
  }, [look]);

  return null;
}
