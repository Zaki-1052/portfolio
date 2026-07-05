// src/dev/arbor-dev-tools.tsx
// DEV-ONLY leva controls for the arbor — growth (rebuilds geometry live) and
// look (uniform-only) folders + preset buttons. One shared hook, two
// consumers, exactly the shell-dev-tools pattern:
//   - cellular-preview.tsx tunes the tree in isolation;
//   - <ArborDevTools/> (app.tsx, DEV-gated) tunes it IN CONTEXT on the live
//     site, against the real camera path, fog, and band register.
// Both write the arbor-live-params override; ArborMesh subscribes and
// rebuilds/re-applies. leva keys are global — 'arbor …' folders never collide
// with the shell/camera/atmosphere panels.
import { useEffect, useRef } from 'react';
import { invalidate } from '@react-three/fiber';
import { button, folder, useControls } from 'leva';
import { ARBOR_DEFAULTS, ARBOR_PRESETS, type ArborParams } from '@/scales/cellular/arbor-params';
import { setArborParamsOverride } from '@/scales/cellular/arbor-live-params';

// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useArborControls(initial: ArborParams, collapsed: boolean): ArborParams {
  // Preset buttons need `set`, which doesn't exist until useControls returns —
  // route through a ref to dodge the schema-closure TDZ.
  const setRef = useRef<((v: Partial<ArborParams>) => void) | null>(null);
  const preset = (p: ArborParams) => () => setRef.current?.({ ...p });

  const [values, set] = useControls(() => ({
    'arbor growth': folder(
      {
        seed: { value: initial.seed, min: 0, max: 99, step: 1 },
        trunkSegments: { value: initial.trunkSegments, min: 3, max: 8, step: 1 },
        trunkLength: { value: initial.trunkLength, min: 4, max: 12, step: 0.1 },
        trunkRadius: { value: initial.trunkRadius, min: 0.4, max: 1.6, step: 0.01 },
        limbSegments: { value: initial.limbSegments, min: 5, max: 14, step: 1 },
        limbLength: { value: initial.limbLength, min: 8, max: 24, step: 0.1 },
        limbRadius: { value: initial.limbRadius, min: 0.3, max: 1.0, step: 0.01 },
        limbSpreadDeg: { value: initial.limbSpreadDeg, min: 20, max: 70, step: 1 },
        limbCurl: { value: initial.limbCurl, min: 0, max: 1.2, step: 0.01 },
        fineLevels: { value: initial.fineLevels, min: 3, max: 7, step: 1 },
        fineSplits: { value: initial.fineSplits, min: 2, max: 3, step: 1 },
        fineSpreadDeg: { value: initial.fineSpreadDeg, min: 12, max: 45, step: 1 },
        fineLengthTaper: { value: initial.fineLengthTaper, min: 0.5, max: 0.9, step: 0.01 },
        fineRadiusTaper: { value: initial.fineRadiusTaper, min: 0.5, max: 0.85, step: 0.01 },
        fineCurl: { value: initial.fineCurl, min: 0, max: 1.2, step: 0.01 },
        sideSproutRate: { value: initial.sideSproutRate, min: 0, max: 0.8, step: 0.01 },
        strandRadiusFloor: { value: initial.strandRadiusFloor, min: 0.005, max: 0.05, step: 0.001 },
      },
      { collapsed },
    ),
    'arbor look': folder(
      {
        baseColor: { value: initial.baseColor },
        tipColor: { value: initial.tipColor },
        fresnelColor: { value: initial.fresnelColor },
        fresnelPower: { value: initial.fresnelPower, min: 2, max: 9, step: 0.1 },
        emissiveStrength: { value: initial.emissiveStrength, min: 0, max: 3, step: 0.05 },
        reliefAmp: { value: initial.reliefAmp, min: 0, max: 0.25, step: 0.005 },
        reliefFreq: { value: initial.reliefFreq, min: 0.5, max: 6, step: 0.05 },
        strandColor: { value: initial.strandColor },
        strandOpacity: { value: initial.strandOpacity, min: 0, max: 1.5, step: 0.01 },
        strandWidth: { value: initial.strandWidth, min: 0.5, max: 3, step: 0.05 },
        tipSize: { value: initial.tipSize, min: 0.1, max: 0.9, step: 0.01 },
        swayAmp: { value: initial.swayAmp, min: 0, max: 0.4, step: 0.005 },
        'preset: sparse': button(preset(ARBOR_PRESETS.sparse)),
        'preset: dense': button(preset(ARBOR_PRESETS.dense)),
        'preset: gnarled': button(preset(ARBOR_PRESETS.gnarled)),
      },
      { collapsed },
    ),
  }));
  setRef.current = set as (v: Partial<ArborParams>) => void;

  return values as unknown as ArborParams;
}

/**
 * Live-site panel: writes the slider values into the arbor override each
 * change and invalidates the demand-mode frameloop. Renders no panel root of
 * its own — CameraDevTools' <Leva/> is always mounted alongside in dev.
 */
export function ArborDevTools() {
  const values = useArborControls(ARBOR_DEFAULTS, true);

  useEffect(() => {
    setArborParamsOverride(values);
    invalidate();
  }, [values]);

  return null;
}
