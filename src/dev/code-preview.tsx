// src/dev/code-preview.tsx
// DEV-ONLY isolated preview of the code band's terminal — the REAL
// CameraController + CodeScene + PostFX composition with the depth store
// parked at a chosen beat, so the screen-locked pose, chrome, environment
// parallax, and cursor relay are reviewed exactly as they ship (the
// chromatin-preview structure). No SceneAtmosphere here (it needs the
// document's CSS custom properties), so the scene fog mirror is written
// from the same pure fog curves per depth change.
//
// URL params: ?beat=before|flight|boot|plateau|exit|farewell|dissolve|after
// or ?depth=<0..1> (beat wins if both); ?dpr=<n> (default 2 — retina-honest,
// 1× aliases the SDF chrome into fake crispness); ?wheel=0 disables the
// wheel→depth scrub (on by default — scrub the whole session by mouse).
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, invalidate } from '@react-three/fiber';
import { Color } from 'three';
import { Leva } from 'leva';
import { CodeScene } from '@/scales/code/CodeScene';
import { CameraController } from '@/engine/camera-controller';
import { PostFX } from '@/engine/post-fx';
import { setSceneFog } from '@/engine/scene-fog';
import { fogDensityFor } from '@/engine/fog-density';
import { CODE_FOG_TINT, codeFogColorBlendT, codeFogDensityDeltaFor } from '@/scales/code/code-fog';
import { CODE_WINDOW_DEFAULTS } from '@/scales/code/code-window-params';
import { setCodeWindowOverride } from '@/scales/code/code-live-params';
import { useDepthStore } from '@/stores/depth';
import { useIntroStore } from '@/stores/intro';
import {
  useCodeBeatControls,
  useCodeEnvironmentControls,
  useCodeWindowControls,
} from '@/dev/code-dev-tools';

const params = new URLSearchParams(window.location.search);

// Representative depths per beat (the shipped defaults' midpoints).
const BEAT_DEPTHS: Record<string, number> = {
  before: 0.7,
  flight: 0.722,
  boot: 0.745,
  plateau: 0.79,
  exit: 0.835,
  farewell: 0.847,
  dissolve: 0.854,
  after: 0.88,
};

const BEAT = params.get('beat');
const START_DEPTH = BEAT
  ? (BEAT_DEPTHS[BEAT] ?? 0.79)
  : params.get('depth')
    ? Number(params.get('depth'))
    : BEAT_DEPTHS.plateau!;
const DPR = Number(params.get('dpr') ?? '2');
const WHEEL = params.get('wheel') !== '0';

// The band's fog, from the same pure curves SceneAtmosphere composes — the
// code theme's --fog-color anchor blended toward the band tint.
const fogColor = new Color();
const codeTint = new Color(CODE_FOG_TINT);
function applyFogFor(depth: number): void {
  fogColor.set('#1d2228');
  const tintT = codeFogColorBlendT(depth);
  if (tintT > 0) fogColor.lerp(codeTint, tintT);
  setSceneFog(fogColor, fogDensityFor(depth) + codeFogDensityDeltaFor(depth));
}

// Park the session BEFORE the tree mounts: the overture is done (the
// camera flies the descent track, not the push-in) and the depth store sits
// at the requested beat.
useIntroStore.getState().finish();
useDepthStore.getState().setDepth(START_DEPTH);
applyFogFor(START_DEPTH);

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function Panel() {
  const look = useCodeWindowControls(CODE_WINDOW_DEFAULTS, false);
  useCodeBeatControls(false);
  useCodeEnvironmentControls(true);

  useEffect(() => {
    setCodeWindowOverride(look);
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
        0.9,
        Math.max(0.68, useDepthStore.getState().depth + e.deltaY * 0.00004),
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
        <CodeScene />
        {/* Site post-processing at the parked depth so bloom matches what
            ships in this band. */}
        <PostFX />
      </Canvas>
    </>,
  );
}
