// src/dev/atmosphere-dev-tools.tsx
// DEV-ONLY leva controls for the atmosphere/effects register: fog density
// curve endpoints, warm haze + interior fog colors, the look curve, and
// absolute post-processing overrides. Writes into the atmosphere-live-params
// override each change (SceneAtmosphere / PostFX / SurfaceScene consume it per
// frame) — so fog and effects are tuned IN CONTEXT on the live site, against
// the real camera path and the real depth curves. Blessed values get frozen
// into fog-density.ts / look-curve.ts / post-fx-curves.ts / globals.css.
// leva keys are global; these never collide with the camera or shell folders.
import { useEffect } from 'react';
import { invalidate } from '@react-three/fiber';
import { folder, useControls } from 'leva';
import { setAtmosphereOverride, type AtmosphereParams } from '@/engine/atmosphere-live-params';
import {
  FOG_DENSITY_BASE,
  FOG_DENSITY_ESTABLISH,
  FOG_DENSITY_INTERIOR,
  FOG_DENSITY_VEIL,
} from '@/engine/fog-density';
import { CLOUD_OPACITY } from '@/scales/tissue/atmosphere-clouds';
import { SHAFT_INTENSITY } from '@/scales/tissue/atmosphere-shafts';
import { EMBER_OPACITY } from '@/scales/tissue/atmosphere-motes';
import { LOOK_CRISP, LOOK_ESTABLISH } from '@/engine/look-curve';
import { HALO_INTENSITY } from '@/scales/tissue/atmosphere-halo';
import { MOTE_OPACITY } from '@/scales/tissue/atmosphere-motes';

export function AtmosphereDevTools() {
  // Plain-object schema (no preset buttons here) — returns values directly,
  // unlike the function-schema form which returns a [values, set] tuple.
  const values = useControls({
    'atmosphere / fx': folder(
      {
        densityVeil: { value: FOG_DENSITY_VEIL, min: 0, max: 0.03, step: 0.0005 },
        densityEstablish: { value: FOG_DENSITY_ESTABLISH, min: 0, max: 0.05, step: 0.0005 },
        densityBase: { value: FOG_DENSITY_BASE, min: 0, max: 0.08, step: 0.001 },
        densityInterior: { value: FOG_DENSITY_INTERIOR, min: 0, max: 0.2, step: 0.002 },
        // Color pickers gate behind fogWarmOn so the CSS-driven colors run
        // until the tuning session actually reaches for them.
        fogWarmOn: false,
        fogWarm: '#4a3f33',
        fogInterior: '#31221a',
        interiorPush: { value: 0.7, min: 0, max: 1, step: 0.01 },
        lookEstablish: { value: LOOK_ESTABLISH, min: 0, max: 1, step: 0.01 },
        lookCrisp: { value: LOOK_CRISP, min: 0, max: 1, step: 0.01 },
        haloIntensity: { value: HALO_INTENSITY, min: 0, max: 2, step: 0.02 },
        moteOpacity: { value: MOTE_OPACITY, min: 0, max: 1, step: 0.02 },
        cloudOpacity: { value: CLOUD_OPACITY, min: 0, max: 0.6, step: 0.01 },
        shaftIntensity: { value: SHAFT_INTENSITY, min: 0, max: 2, step: 0.02 },
        emberOpacity: { value: EMBER_OPACITY, min: 0, max: 1, step: 0.02 },
        // postOn arms ABSOLUTE overrides of the depth curves — park on a beat,
        // tune, note the numbers, then freeze them into post-fx-curves.ts.
        postOn: false,
        bloomIntensity: { value: 1.25, min: 0, max: 3, step: 0.05 },
        bloomThreshold: { value: 0.6, min: 0, max: 1, step: 0.01 },
        grainOpacity: { value: 0.055, min: 0, max: 0.2, step: 0.005 },
        vignetteDarkness: { value: 0.55, min: 0, max: 1, step: 0.01 },
        vignetteOffset: { value: 0.32, min: 0, max: 1, step: 0.01 },
      },
      { collapsed: true },
    ),
  });

  useEffect(() => {
    setAtmosphereOverride(values as unknown as AtmosphereParams);
    invalidate();
  }, [values]);
  useEffect(() => () => setAtmosphereOverride(null), []);

  return null;
}
