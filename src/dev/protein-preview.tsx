// src/dev/protein-preview.tsx
// DEV-ONLY isolated preview of the protein band — the REAL CameraController +
// ProteinScene + PostFX composition with the depth store parked mid-band, so
// the structure, its fog, and its reveal envelope are reviewed exactly as they
// ship (the code-preview structure). No SceneAtmosphere here (it needs the
// document's CSS custom properties), so the scene fog mirror is written from
// the same pure fog curves per depth change.
//
// URL params: ?depth=<0..1> (default 0.64, the band's centre); ?dpr=<n>
// (default 2 — retina-honest, 1× aliases the ribbon edges into fake
// crispness); ?wheel=0 disables the wheel→depth scrub (on by default — scrub
// the band by mouse to watch the reveal envelope and, later, the trajectory);
// ?orbit=1 slowly turns the structure so the fold can be read from all sides.
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, invalidate, useFrame } from '@react-three/fiber';
import { Color, type Group } from 'three';
import { Leva } from 'leva';
import { ProteinScene } from '@/scales/protein/ProteinScene';
import { CameraController } from '@/engine/camera-controller';
import { PostFX } from '@/engine/post-fx';
import { setSceneFog } from '@/engine/scene-fog';
import { fogDensityFor } from '@/engine/fog-density';
import {
  PROTEIN_FOG_TINT,
  proteinFogColorBlendT,
  proteinFogDensityDeltaFor,
} from '@/scales/protein/protein-fog';
import { PROTEIN_LOOK_DEFAULTS } from '@/scales/protein/protein-params';
import { setProteinLookOverride } from '@/scales/protein/protein-live-params';
import { useDepthStore } from '@/stores/depth';
import { useIntroStore } from '@/stores/intro';
import { useProteinLookControls } from '@/dev/protein-dev-tools';

const params = new URLSearchParams(window.location.search);

/** The band's centre — the orbital-hold knot, where the structure is framed
 *  broadside. */
const BAND_CENTER = 0.64;
const START_DEPTH = params.get('depth') ? Number(params.get('depth')) : BAND_CENTER;
const DPR = Number(params.get('dpr') ?? '2');
const WHEEL = params.get('wheel') !== '0';
const ORBIT = params.get('orbit') === '1';

// The band's fog, from the same pure curves SceneAtmosphere composes — the
// protein theme's --fog-color anchor blended toward the band tint.
const fogColor = new Color();
const proteinTint = new Color(PROTEIN_FOG_TINT);
function applyFogFor(depth: number): void {
  fogColor.set('#1e3038');
  const tintT = proteinFogColorBlendT(depth);
  if (tintT > 0) fogColor.lerp(proteinTint, tintT);
  setSceneFog(fogColor, fogDensityFor(depth) + proteinFogDensityDeltaFor(depth));
}

// Park the session BEFORE the tree mounts: the overture is done (the camera
// flies the descent track, not the push-in) and the depth store sits mid-band.
useIntroStore.getState().finish();
useDepthStore.getState().setDepth(START_DEPTH);
applyFogFor(START_DEPTH);

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function Panel() {
  const look = useProteinLookControls(PROTEIN_LOOK_DEFAULTS, false);

  useEffect(() => {
    setProteinLookOverride(look);
    invalidate();
  }, [look]);

  // Explicit <Leva/> — leva 0.9's implicit root uses the removed React 17
  // ReactDOM.render API and crashes under React 19.
  return <Leva />;
}

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function OrbitRig() {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    // Turn about the band origin, so the structure spins in place rather than
    // swinging around the world origin.
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.15;
  });
  return (
    <group position={[-4, -28, -42]}>
      <group ref={ref} position={[4, 28, 42]}>
        <ProteinScene />
      </group>
    </group>
  );
}

if (WHEEL) {
  window.addEventListener(
    'wheel',
    (e) => {
      const depth = Math.min(
        0.75,
        Math.max(0.55, useDepthStore.getState().depth + e.deltaY * 0.00004),
      );
      useDepthStore.getState().setDepth(depth);
      applyFogFor(depth);
      invalidate();
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
        style={{ position: 'fixed', inset: 0, background: '#232d31' }}
        camera={{ fov: 49, near: 0.1, far: 1000, position: [-2, -27, -46] }}
        dpr={DPR}
        gl={{ antialias: false }}
        onCreated={(state) => {
          // Dev handle for scripted verification (draw calls, tri counts):
          // page.evaluate(() => window.__preview.gl.info.render).
          (window as unknown as Record<string, unknown>).__preview = state;
        }}
      >
        <CameraController />
        {ORBIT ? <OrbitRig /> : <ProteinScene />}
        {/* Site post-processing at the parked depth so bloom/grain match what
            ships in this band. */}
        <PostFX />
      </Canvas>
    </>,
  );
}
