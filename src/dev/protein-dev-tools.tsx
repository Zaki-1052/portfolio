// src/dev/protein-dev-tools.tsx
// DEV-ONLY leva controls for the protein band's ribbon look. One shared hook,
// two consumers, exactly the coil-dev-tools pattern:
//   - protein-preview.tsx tunes the structure in isolation;
//   - <ProteinDevTools/> (app.tsx, DEV-gated) tunes it IN CONTEXT on the live
//     site, against the real camera path, fog, and band register.
// Both write the protein-live-params override; ProteinMesh subscribes and
// re-applies. leva keys are global — 'protein …' folders never collide with
// the other panels. Every slider range includes its shipping default (leva
// silently clamps out-of-range values → dev ≠ prod).
//
// Look params only. The cross-section profiles rebuild CPU geometry and are
// not exposed here yet — the shipped defaults come straight from the reference
// renders, and Gate 2 is where they get judged against them.
import { useEffect } from 'react';
import { invalidate } from '@react-three/fiber';
import { folder, useControls } from 'leva';
import { PROTEIN_LOOK_DEFAULTS, type ProteinLookParams } from '@/scales/protein/protein-params';
import { setProteinLookOverride } from '@/scales/protein/protein-live-params';

// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useProteinLookControls(
  initial: ProteinLookParams,
  collapsed: boolean,
): ProteinLookParams {
  const values = useControls(() => ({
    'protein ribbon': folder(
      {
        receptorBrightness: { value: initial.receptorBrightness, min: 0.2, max: 1.6, step: 0.02 },
        gproteinBrightness: { value: initial.gproteinBrightness, min: 0.1, max: 1.2, step: 0.02 },
        fresnelPower: { value: initial.fresnelPower, min: 0.5, max: 6, step: 0.1 },
        fresnelStrength: { value: initial.fresnelStrength, min: 0, max: 1.5, step: 0.02 },
        rimShade: { value: initial.rimShade, min: 0, max: 1, step: 0.02 },
        specStrength: { value: initial.specStrength, min: 0, max: 1.2, step: 0.02 },
      },
      { collapsed },
    ),
    'protein flexibility': folder(
      {
        // Range, not normalisation — the shader maps raw Å through these, so
        // dragging them is a uniform write, never a geometry rebuild.
        rmsfFloor: { value: initial.rmsfFloor, min: 0, max: 3, step: 0.05 },
        rmsfCeil: { value: initial.rmsfCeil, min: 0.5, max: 10, step: 0.1 },
        rmsfWarmth: { value: initial.rmsfWarmth, min: 0, max: 1.5, step: 0.02 },
        // The shipped 0.05 Å is ~0.04% of the complex's height and will almost
        // certainly read as nothing — the range runs well past it on purpose,
        // because this is the value most likely to need raising before the
        // motion gate signs off.
        breathingAmp: { value: initial.breathingAmp, min: 0, max: 0.6, step: 0.005 },
        breathingFreq: { value: initial.breathingFreq, min: 0.05, max: 1.5, step: 0.01 },
      },
      { collapsed },
    ),
  })) as unknown as ProteinLookParams;

  return values;
}

export function ProteinDevTools() {
  const look = useProteinLookControls(PROTEIN_LOOK_DEFAULTS, true);

  useEffect(() => {
    setProteinLookOverride(look);
    invalidate();
  }, [look]);

  return null;
}
