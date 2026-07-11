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
import {
  COIL_WATER_DEFAULTS,
  setCoilWaterOverride,
  type CoilWaterParams,
} from '@/scales/chromatin/coil-water-params';
import { useCoilFocusStore, type CoilRegionIndex } from '@/stores/coil-focus';
import { useDepthStore } from '@/stores/depth';

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
        beadBevel: { value: initial.beadBevel, min: 0.05, max: 0.3, step: 0.01 },
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
        mottleAmp: { value: initial.mottleAmp, min: 0, max: 1, step: 0.01 },
        ringAmp: { value: initial.ringAmp, min: 0, max: 1, step: 0.01 },
        ringFreq: { value: initial.ringFreq, min: 1, max: 12, step: 0.5 },
        beadSpecStrength: { value: initial.beadSpecStrength, min: 0, max: 1, step: 0.01 },
        beadSpecPower: { value: initial.beadSpecPower, min: 8, max: 128, step: 1 },
        locusGlow: { value: initial.locusGlow, min: 0, max: 1.5, step: 0.01 },
        focusDimStrength: { value: initial.focusDimStrength, min: 0, max: 1, step: 0.01 },
        driftAmp: { value: initial.driftAmp, min: 0, max: 0.3, step: 0.005 },
        duskLift: { value: initial.duskLift, min: 0.5, max: 1.6, step: 0.01 },
        envStrength: { value: initial.envStrength, min: 0, max: 1, step: 0.01 },
        envDeepColor: { value: initial.envDeepColor },
        envPaleColor: { value: initial.envPaleColor },
        causticAmp: { value: initial.causticAmp, min: 0, max: 0.6, step: 0.01 },
        causticScale: { value: initial.causticScale, min: 0.1, max: 1.5, step: 0.01 },
        wrapShadow: { value: initial.wrapShadow, min: 0, max: 1, step: 0.01 },
        threadColor: { value: initial.threadColor },
        threadCoreColor: { value: initial.threadCoreColor },
        threadRadius: { value: initial.threadRadius, min: 0.02, max: 0.15, step: 0.005 },
        threadEmissive: { value: initial.threadEmissive, min: 0, max: 1.5, step: 0.01 },
        threadAo: { value: initial.threadAo, min: 0, max: 1, step: 0.01 },
        threadPulseCount: { value: initial.threadPulseCount, min: 1, max: 8, step: 1 },
        wrapTurns: { value: initial.wrapTurns, min: 1, max: 2.5, step: 0.05 },
        shimmerSpeed: { value: initial.shimmerSpeed, min: 0, max: 5, step: 0.05 },
        knobColor: { value: initial.knobColor },
        knobSize: { value: initial.knobSize, min: 0.02, max: 0.25, step: 0.005 },
        ribbonColor: { value: initial.ribbonColor },
        ribbonOpacity: { value: initial.ribbonOpacity, min: 0, max: 1.5, step: 0.01 },
        ribbonWidth: { value: initial.ribbonWidth, min: 0.02, max: 0.2, step: 0.005 },
        ribbonFlowSpeed: { value: initial.ribbonFlowSpeed, min: 0, max: 2, step: 0.02 },
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
 * The band's water-medium sliders (silt / bokeh / bubbles / veils / shared
 * current) — writes the coil-water override; CoilAtmosphere re-derives its
 * layer configs on change (particle fields re-scatter — fine for tuning)
 * and CoilMesh reads the current terms per frame. Every range contains its
 * shipping default.
 */
// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useCoilWaterControls(): void {
  const d = COIL_WATER_DEFAULTS;
  // Function schema ⇒ useControls returns a [values, set] tuple.
  const [values] = useControls(() => ({
    'coil water': folder(
      {
        siltCount: { value: d.siltCount, min: 100, max: 1200, step: 10 },
        siltOpacity: { value: d.siltOpacity, min: 0, max: 1, step: 0.01 },
        sparkleCount: { value: d.sparkleCount, min: 0, max: 400, step: 5 },
        sparkleOpacity: { value: d.sparkleOpacity, min: 0, max: 1, step: 0.01 },
        bokehCount: { value: d.bokehCount, min: 0, max: 150, step: 1 },
        bokehOpacity: { value: d.bokehOpacity, min: 0, max: 1, step: 0.01 },
        bokehMaxPx: { value: d.bokehMaxPx, min: 7, max: 128, step: 1 },
        wispOpacity: { value: d.wispOpacity, min: 0, max: 0.5, step: 0.005 },
        wispColor: { value: d.wispColor },
        bubbleCount: { value: d.bubbleCount, min: 0, max: 80, step: 1 },
        bubbleRise: { value: d.bubbleRise, min: 0, max: 1.5, step: 0.01 },
        bubbleOpacity: { value: d.bubbleOpacity, min: 0, max: 1, step: 0.01 },
        currentAmp: { value: d.currentAmp, min: 0, max: 1, step: 0.01 },
        currentFreq: { value: d.currentFreq, min: 0, max: 1, step: 0.01 },
        currentDirDeg: { value: d.currentDirDeg, min: 0, max: 360, step: 1 },
        beadCurrentAmp: { value: d.beadCurrentAmp, min: 0, max: 0.2, step: 0.005 },
      },
      { collapsed: true },
    ),
  }));

  useEffect(() => {
    setCoilWaterOverride(values as unknown as CoilWaterParams);
    invalidate();
  }, [values]);
}

const toggleRegion = (region: CoilRegionIndex) => (): void => {
  const s = useCoilFocusStore.getState();
  s.setFocusedRegion(s.focusedRegion === region ? null : region, useDepthStore.getState().depth);
};

/**
 * Dev triggers for the Approach-B unwind engine. The region buttons run the
 * REAL store + tween path (exactly what a bead click does); the scrub writes
 * unwindBlend directly for frame-by-frame inspection — it acts on the
 * currently displayed region, so focus one first (and note a running tween
 * will overwrite a scrub until it completes).
 */
// eslint-disable-next-line react-refresh/only-export-components -- dev-only module, not a fast-refresh target
export function useCoilUnwindControls(): void {
  useControls(() => ({
    'coil unwind': folder(
      {
        'focus region 0': button(toggleRegion(0)),
        'focus region 1': button(toggleRegion(1)),
        release: button(() => {
          useCoilFocusStore.getState().setFocusedRegion(null, useDepthStore.getState().depth);
        }),
        openScrub: {
          value: 0,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v: number, _path: string, ctx: { initial: boolean }) => {
            if (ctx.initial) return;
            useCoilFocusStore.getState().setUnwindBlend(v);
            invalidate();
          },
        },
      },
      { collapsed: true },
    ),
  }));
}

/**
 * Live-site panel: writes the slider values into the coil override each
 * change and invalidates the demand-mode frameloop. Renders no panel root of
 * its own — CameraDevTools' <Leva/> is always mounted alongside in dev.
 */
export function CoilDevTools() {
  const values = useCoilControls(COIL_DEFAULTS, true);
  useCoilWaterControls();
  useCoilUnwindControls();

  useEffect(() => {
    setCoilParamsOverride(values);
    invalidate();
  }, [values]);

  return null;
}
