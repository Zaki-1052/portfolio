// src/dev/coil-dev-tools.tsx
// DEV-ONLY leva controls for the coil — growth (rebuilds geometry live) and
// look (uniform-only) folders + preset buttons. One shared hook, two
// consumers, exactly the arbor-dev-tools pattern:
//   - chromatin-preview.tsx tunes the cluster in isolation;
//   - <CoilDevTools/> (app.tsx, DEV-gated) tunes it IN CONTEXT on the live
//     site, against the real camera path, fog, and band register.
// Both write the coil-live-params override; CoilMesh subscribes and
// rebuilds/re-applies. leva keys are global — 'coil …' folders never collide
// with the other panels. Every slider range includes its shipping default
// (leva silently clamps out-of-range values → dev ≠ prod).
import { useEffect, useRef } from 'react';
import { invalidate } from '@react-three/fiber';
import { button, folder, useControls } from 'leva';
import { COIL_DEFAULTS, COIL_PRESETS, type CoilParams } from '@/scales/chromatin/coil-params';
import { setCoilParamsOverride } from '@/scales/chromatin/coil-live-params';

// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useCoilControls(initial: CoilParams, collapsed: boolean): CoilParams {
  // Preset buttons need `set`, which doesn't exist until useControls returns —
  // route through a ref to dodge the schema-closure TDZ.
  const setRef = useRef<((v: Partial<CoilParams>) => void) | null>(null);
  const preset = (p: CoilParams) => () => setRef.current?.({ ...p });

  const [values, set] = useControls(() => ({
    'coil growth': folder(
      {
        seed: { value: initial.seed, min: 0, max: 99, step: 1 },
        beadCount: { value: initial.beadCount, min: 24, max: 160, step: 1 },
        coilRadius: { value: initial.coilRadius, min: 1.5, max: 5, step: 0.05 },
        coilPitch: { value: initial.coilPitch, min: 0.3, max: 1.6, step: 0.01 },
        coilTurns: { value: initial.coilTurns, min: 2, max: 10, step: 1 },
        beadRadius: { value: initial.beadRadius, min: 0.2, max: 0.8, step: 0.01 },
        beadAspect: { value: initial.beadAspect, min: 0.3, max: 1, step: 0.01 },
        jitter: { value: initial.jitter, min: 0, max: 0.4, step: 0.005 },
        linkerSag: { value: initial.linkerSag, min: 0, max: 0.4, step: 0.01 },
        regionSize: { value: initial.regionSize, min: 5, max: 25, step: 1 },
        regionGap: { value: initial.regionGap, min: 0.15, max: 0.5, step: 0.01 },
      },
      { collapsed },
    ),
    'coil look': folder(
      {
        beadBaseColor: { value: initial.beadBaseColor },
        beadFresnelColor: { value: initial.beadFresnelColor },
        beadFresnelPower: { value: initial.beadFresnelPower, min: 1.5, max: 8, step: 0.1 },
        grooveAmp: { value: initial.grooveAmp, min: 0, max: 1, step: 0.01 },
        grooveFreq: { value: initial.grooveFreq, min: 1, max: 12, step: 0.5 },
        locusGlow: { value: initial.locusGlow, min: 0, max: 1.5, step: 0.01 },
        driftAmp: { value: initial.driftAmp, min: 0, max: 0.3, step: 0.005 },
        linkerColor: { value: initial.linkerColor },
        linkerOpacity: { value: initial.linkerOpacity, min: 0, max: 1.5, step: 0.01 },
        linkerWidth: { value: initial.linkerWidth, min: 0.01, max: 0.12, step: 0.005 },
        linkerWaveAmp: { value: initial.linkerWaveAmp, min: 0, max: 0.1, step: 0.002 },
        shimmerSpeed: { value: initial.shimmerSpeed, min: 0, max: 5, step: 0.05 },
        'preset: tight': button(preset(COIL_PRESETS.tight)),
        'preset: open': button(preset(COIL_PRESETS.open)),
        'preset: loose': button(preset(COIL_PRESETS.loose)),
      },
      { collapsed },
    ),
  }));
  setRef.current = set as (v: Partial<CoilParams>) => void;

  return values as unknown as CoilParams;
}

/**
 * Live-site panel: writes the slider values into the coil override each
 * change and invalidates the demand-mode frameloop. Renders no panel root of
 * its own — CameraDevTools' <Leva/> is always mounted alongside in dev.
 */
export function CoilDevTools() {
  const values = useCoilControls(COIL_DEFAULTS, true);

  useEffect(() => {
    setCoilParamsOverride(values);
    invalidate();
  }, [values]);

  return null;
}
