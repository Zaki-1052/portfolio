// src/dev/shell-dev-tools.tsx
// DEV-ONLY leva controls for the shell's macro form. One shared hook builds
// the slider folder + preset buttons; two consumers drive it:
//   - tissue-preview.tsx applies values straight onto its local material;
//   - <ShellDevTools/> (mounted in app.tsx, DEV-gated) writes the values into
//     the shell-live-params override, which SurfaceScene applies per frame —
//     so the form can be tuned IN CONTEXT on the live site, against the real
//     camera path and hero framing.
// leva keys are global; these never collide with camera-dev-tools' knot keys,
// and the two consumers live on different pages so the keys never double-mount.
import { useEffect, useRef } from 'react';
import { invalidate } from '@react-three/fiber';
import { button, folder, useControls } from 'leva';
import { SHELL_DEFAULTS, SHELL_PRESETS, type ShellParams } from '@/scales/tissue/shell-params';
import { setShellParamsOverride } from '@/scales/tissue/shell-live-params';

// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useShellControls(initial: ShellParams, collapsed: boolean): ShellParams {
  // Preset buttons need `set`, which doesn't exist until useControls returns —
  // route through a ref to dodge the schema-closure TDZ.
  const setRef = useRef<((v: Partial<ShellParams>) => void) | null>(null);
  const preset = (p: ShellParams) => () => setRef.current?.({ ...p });

  const [values, set] = useControls(() => ({
    'shell form': folder(
      {
        dimX: { value: initial.dimX, min: 0.6, max: 1.4, step: 0.01 },
        dimY: { value: initial.dimY, min: 0.5, max: 1.4, step: 0.01 },
        dimZ: { value: initial.dimZ, min: 0.8, max: 1.7, step: 0.01 },
        boxiness: { value: initial.boxiness, min: 1.6, max: 3.5, step: 0.05 },
        crownRound: { value: initial.crownRound, min: 0, max: 1, step: 0.01 },
        shoulderY: { value: initial.shoulderY, min: -0.5, max: 0.8, step: 0.01 },
        shoulderBulge: { value: initial.shoulderBulge, min: 0, max: 0.3, step: 0.005 },
        baseTuck: { value: initial.baseTuck, min: 0, max: 0.5, step: 0.01 },
        bottomFlat: { value: initial.bottomFlat, min: 0.5, max: 1, step: 0.01 },
        cleftWidth: { value: initial.cleftWidth, min: 0.02, max: 0.2, step: 0.005 },
        cleftDepth: { value: initial.cleftDepth, min: 0, max: 4, step: 0.05 },
        moundHeight: { value: initial.moundHeight, min: 0, max: 2, step: 0.05 },
        grooveRearFade: { value: initial.grooveRearFade, min: 0, max: 1, step: 0.01 },
        overhang: { value: initial.overhang, min: 0, max: 3, step: 0.05 },
        subMassY: { value: initial.subMassY, min: -1, max: 0, step: 0.01 },
        subMassZ: { value: initial.subMassZ, min: -1, max: 0, step: 0.01 },
        subMassRadius: { value: initial.subMassRadius, min: 10, max: 60, step: 1 },
        subMassHeight: { value: initial.subMassHeight, min: 0, max: 4, step: 0.05 },
        sepFold: { value: initial.sepFold, min: 0, max: 3, step: 0.05 },
        stalkY: { value: initial.stalkY, min: -1, max: 0, step: 0.01 },
        stalkZ: { value: initial.stalkZ, min: -1, max: 0.5, step: 0.01 },
        stalkRadius: { value: initial.stalkRadius, min: 8, max: 40, step: 1 },
        stalkHeight: { value: initial.stalkHeight, min: 0, max: 6, step: 0.05 },
        frontLift: { value: initial.frontLift, min: -1, max: 2, step: 0.05 },
        profileFlip: { value: initial.profileFlip, min: 0, max: 1, step: 0.01 },
        asymmetry: { value: initial.asymmetry, min: 0, max: 1, step: 0.01 },
        fineAmp: { value: initial.fineAmp, min: 0, max: 0.5, step: 0.005 },
        pleatAmp: { value: initial.pleatAmp, min: 0, max: 1, step: 0.01 },
        pleatFreq: { value: initial.pleatFreq, min: 10, max: 200, step: 1 },
        'preset: loaf': button(preset(SHELL_PRESETS.loaf)),
        'preset: crown': button(preset(SHELL_PRESETS.crown)),
        'preset: bluff': button(preset(SHELL_PRESETS.bluff)),
      },
      { collapsed },
    ),
  }));
  setRef.current = set as (v: Partial<ShellParams>) => void;

  return values as unknown as ShellParams;
}

/**
 * Live-site panel: writes the slider values into the shell override each
 * change and invalidates the demand-mode frameloop. Renders no panel root of
 * its own — CameraDevTools' <Leva/> is always mounted alongside in dev.
 */
export function ShellDevTools() {
  const values = useShellControls(SHELL_DEFAULTS, true);

  useEffect(() => {
    setShellParamsOverride(values);
    invalidate();
  }, [values]);

  return null;
}
