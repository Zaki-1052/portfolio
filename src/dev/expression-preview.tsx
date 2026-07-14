// src/dev/expression-preview.tsx
// DEV-ONLY isolated preview of the expression band's signal-origin scene —
// the REAL CameraController + ExpressionScene + PostFX composition with the
// depth store parked at a chosen beat (the code-preview structure). No
// SceneAtmosphere here, so the scene fog mirror is written from the same
// pure fog curves per depth change.
//
// URL params: ?beat=before|arrival|plateau|windDown|signoff|end or
// ?depth=<0..1> (beat wins if both); ?dpr=<n> (default 2); ?wheel=0
// disables the wheel→depth scrub; ?handoff=1 seeds the code-cursor mirror
// with a plausible frozen seat so the custody adoption ease is reviewable
// without the code scene (without it the node sits on the authored anchor,
// the deep-link path).
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, invalidate } from '@react-three/fiber';
import { Color } from 'three';
import { Leva } from 'leva';
import { ExpressionScene } from '@/scales/expression/ExpressionScene';
import { CameraController } from '@/engine/camera-controller';
import { PostFX } from '@/engine/post-fx';
import { setSceneFog } from '@/engine/scene-fog';
import { fogDensityFor } from '@/engine/fog-density';
import {
  EXPRESSION_FOG_TINT,
  expressionFogColorBlendT,
  expressionFogDensityDeltaFor,
} from '@/scales/expression/expression-fog';
import { SIGNAL_LOOK_DEFAULTS } from '@/scales/expression/signal-params';
import { setExpressionLookOverride } from '@/scales/expression/expression-live-params';
import { setCodeCursorState } from '@/scales/code/code-cursor-state';
import { useDepthStore } from '@/stores/depth';
import { useIntroStore } from '@/stores/intro';
import {
  useExpressionBeatControls,
  useExpressionLookControls,
  useSurfaceFlightControls,
} from '@/dev/expression-dev-tools';

const params = new URLSearchParams(window.location.search);

// Representative depths per beat (the shipped defaults' midpoints).
const BEAT_DEPTHS: Record<string, number> = {
  before: 0.855,
  arrival: 0.875,
  plateau: 0.92,
  windDown: 0.958,
  signoff: 0.975,
  end: 0.998,
};

const BEAT = params.get('beat');
const START_DEPTH = BEAT
  ? (BEAT_DEPTHS[BEAT] ?? 0.92)
  : params.get('depth')
    ? Number(params.get('depth'))
    : BEAT_DEPTHS.plateau!;
const DPR = Number(params.get('dpr') ?? '2');
const WHEEL = params.get('wheel') !== '0';
const HANDOFF = params.get('handoff') === '1';

// The band's fog, from the same pure curves SceneAtmosphere composes — the
// expression theme's --fog-color anchor with the relief + warm tint.
const fogColor = new Color();
const warmTint = new Color(EXPRESSION_FOG_TINT);
function applyFogFor(depth: number): void {
  fogColor.set('#20242a');
  const tintT = expressionFogColorBlendT(depth);
  if (tintT > 0) fogColor.lerp(warmTint, tintT);
  setSceneFog(fogColor, fogDensityFor(depth) + expressionFogDensityDeltaFor(depth));
}

// Park the session BEFORE the tree mounts.
useIntroStore.getState().finish();
useDepthStore.getState().setDepth(START_DEPTH);
applyFogFor(START_DEPTH);

// The custody seed: a plausible frozen seat (near the code camera's 0.85
// standoff, deliberately OFF the authored anchor so the ease is visible).
if (HANDOFF) {
  setCodeCursorState(-2.0, -35.3, -45.4, 0.13, 0.21, true);
}

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function Panel() {
  const look = useExpressionLookControls(SIGNAL_LOOK_DEFAULTS, false);
  useExpressionBeatControls(false);
  useSurfaceFlightControls(true);

  useEffect(() => {
    setExpressionLookOverride(look);
    invalidate();
  }, [look]);

  // Explicit <Leva/> — leva 0.9's implicit root uses the removed React 17
  // ReactDOM.render API and crashes under React 19.
  return <Leva />;
}

if (WHEEL) {
  window.addEventListener(
    'wheel',
    (e) => {
      const depth = Math.min(
        1,
        Math.max(0.83, useDepthStore.getState().depth + e.deltaY * 0.00004),
      );
      useDepthStore.getState().setDepth(depth);
      applyFogFor(depth);
    },
    { passive: true },
  );
}

const root = document.getElementById('preview-root');
if (root) {
  createRoot(root).render(
    <>
      <Panel />
      <Canvas
        style={{ position: 'fixed', inset: 0, background: '#16181d' }}
        camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 0, 26] }}
        dpr={DPR}
        gl={{ antialias: false }}
        onCreated={(state) => {
          // Dev handle for scripted verification (draw calls, tri counts):
          // page.evaluate(() => window.__preview.gl.info.render).
          (window as unknown as Record<string, unknown>).__preview = state;
        }}
      >
        <CameraController />
        <ExpressionScene />
        {/* Site post-processing at the parked depth so bloom matches what
            ships in this band. */}
        <PostFX />
      </Canvas>
    </>,
  );
}
