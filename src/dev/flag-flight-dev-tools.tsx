// src/dev/flag-flight-dev-tools.tsx
// DEV-ONLY leva controls for the hero flag flight. Writes an override config
// into flag-flight-live-params, which FlagFlight applies each frame — so the
// launch frame, path, endpoint, size, and cloth-ripple can all be tuned IN
// CONTEXT on the live site. Two preset buttons load the top-down vs. establish
// framings; the Replay button re-fires the one-shot at the current scroll
// position so it can be watched repeatedly while parked at either frame. Once a
// framing wins, bake its numbers into FLAG_FLIGHT_DEFAULT (flag-flight.ts).
//
// Renders no panel root of its own — CameraDevTools' <Leva/> is always mounted
// alongside in dev. leva keys are namespaced under the 'flag flight' folder, so
// they never collide with the shell/atmosphere/camera folders.
import { useEffect, useRef } from 'react';
import { invalidate } from '@react-three/fiber';
import { button, folder, useControls } from 'leva';
import {
  FLAG_FLIGHT_DEFAULT,
  FLAG_FLIGHT_ESTABLISH,
  FLAG_FLIGHT_TOPDOWN,
  type FlagFlightConfig,
} from '@/scales/tissue/flag-flight';
import { requestFlagReplay, setFlagFlightOverride } from '@/scales/tissue/flag-flight-live-params';

// The flat leva shape (leva controls are scalar; the nested FlagFlightConfig is
// flattened for editing and re-assembled before it reaches FlagFlight).
interface FlatFlagValues {
  launchDepth: number;
  duration: number;
  size: number;
  bank: number;
  waveAmp: number;
  waveFreq: number;
  fadeInEnd: number;
  fadeOutStart: number;
  peakOpacity: number;
  entryNdcX: number;
  entryNdcY: number;
  entryDist: number;
  arcNdcX: number;
  arcNdcY: number;
  arcDist: number;
  exitX: number;
  exitY: number;
  exitZ: number;
}

function flatten(c: FlagFlightConfig): FlatFlagValues {
  return {
    launchDepth: c.launchDepth,
    duration: c.duration,
    size: c.size,
    bank: c.bank,
    waveAmp: c.waveAmp,
    waveFreq: c.waveFreq,
    fadeInEnd: c.fadeInEnd,
    fadeOutStart: c.fadeOutStart,
    peakOpacity: c.peakOpacity,
    entryNdcX: c.entry.ndc[0],
    entryNdcY: c.entry.ndc[1],
    entryDist: c.entry.dist,
    arcNdcX: c.arc[0]?.ndc[0] ?? 0,
    arcNdcY: c.arc[0]?.ndc[1] ?? 0,
    arcDist: c.arc[0]?.dist ?? 20,
    exitX: c.exit[0],
    exitY: c.exit[1],
    exitZ: c.exit[2],
  };
}

function assemble(v: FlatFlagValues): FlagFlightConfig {
  return {
    launchDepth: v.launchDepth,
    rearmMargin: FLAG_FLIGHT_DEFAULT.rearmMargin,
    duration: v.duration,
    size: v.size,
    aspect: FLAG_FLIGHT_DEFAULT.aspect,
    bank: v.bank,
    waveAmp: v.waveAmp,
    waveFreq: v.waveFreq,
    fadeInEnd: v.fadeInEnd,
    fadeOutStart: v.fadeOutStart,
    peakOpacity: v.peakOpacity,
    entry: { ndc: [v.entryNdcX, v.entryNdcY], dist: v.entryDist },
    arc: [{ ndc: [v.arcNdcX, v.arcNdcY], dist: v.arcDist }],
    exit: [v.exitX, v.exitY, v.exitZ],
  };
}

export function FlagFlightDevTools() {
  const init = flatten(FLAG_FLIGHT_DEFAULT);

  // Preset buttons need `set`, which doesn't exist until useControls returns —
  // route through a ref (same TDZ dodge as shell-dev-tools).
  const setRef = useRef<((v: Partial<FlatFlagValues>) => void) | null>(null);
  const preset = (c: FlagFlightConfig) => () => setRef.current?.(flatten(c));

  const [values, set] = useControls(() => ({
    'flag flight': folder(
      {
        launchDepth: { value: init.launchDepth, min: 0, max: 0.28, step: 0.005 },
        duration: { value: init.duration, min: 0.4, max: 3, step: 0.05 },
        size: { value: init.size, min: 0.5, max: 8, step: 0.1 },
        bank: { value: init.bank, min: 0, max: 1.2, step: 0.02 },
        waveAmp: { value: init.waveAmp, min: 0, max: 0.5, step: 0.005 },
        waveFreq: { value: init.waveFreq, min: 0.5, max: 20, step: 0.5 },
        fadeInEnd: { value: init.fadeInEnd, min: 0.02, max: 0.5, step: 0.01 },
        fadeOutStart: { value: init.fadeOutStart, min: 0.5, max: 0.98, step: 0.01 },
        peakOpacity: { value: init.peakOpacity, min: 0.1, max: 1, step: 0.02 },
        entryNdcX: { value: init.entryNdcX, min: -1.2, max: 1.2, step: 0.01 },
        entryNdcY: { value: init.entryNdcY, min: -1.2, max: 1.2, step: 0.01 },
        entryDist: { value: init.entryDist, min: 1, max: 120, step: 0.5 },
        arcNdcX: { value: init.arcNdcX, min: -1.2, max: 1.2, step: 0.01 },
        arcNdcY: { value: init.arcNdcY, min: -1.2, max: 1.2, step: 0.01 },
        arcDist: { value: init.arcDist, min: 1, max: 150, step: 0.5 },
        exitX: { value: init.exitX, min: -30, max: 30, step: 0.5 },
        exitY: { value: init.exitY, min: -40, max: 30, step: 0.5 },
        exitZ: { value: init.exitZ, min: -40, max: 20, step: 0.5 },
        'preset: top-down': button(preset(FLAG_FLIGHT_TOPDOWN)),
        'preset: establish': button(preset(FLAG_FLIGHT_ESTABLISH)),
        'replay ▶': button(() => {
          requestFlagReplay();
          invalidate();
        }),
      },
      { collapsed: true },
    ),
  }));
  setRef.current = set as (v: Partial<FlatFlagValues>) => void;

  useEffect(() => {
    setFlagFlightOverride(assemble(values as unknown as FlatFlagValues));
    invalidate();
  }, [values]);
  // Drop the override if the panel unmounts so production behavior is restored.
  useEffect(() => () => setFlagFlightOverride(null), []);

  return null;
}
