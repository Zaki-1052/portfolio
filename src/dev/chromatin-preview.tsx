// src/dev/chromatin-preview.tsx
// DEV-ONLY isolated preview of the coil — the bead cluster alone on a plain
// dark background, no HTML overlay, loading sequence, or GPU gate, so the
// packing / groove texture / thread glow can be reviewed cleanly (Playwright
// screenshots or by eye). Mounts the REAL <CoilMesh/> plus the coil leva
// panel writing the live override, so what you tune here is exactly the
// shipping cluster.
//
// URL params: ?rx=<deg>&ry=<deg> static rotation; ?spin=1 auto-rotates;
// ?z=<dist>&fov=<deg> camera; ?dpr=<n> pixel ratio (default 2 — retina-honest;
// 1× aliases the groove bands into FAKE crispness); ?seed=<n> regrows the
// coil; ?preset=tight|open|loose picks the parameter set; ?drift=0 freezes
// the Brownian micro-drift; ?region=0|1&open=<0..1> parks the unwind engine
// at a deterministic open state (seeded before mount, so no tween runs —
// screenshot-stable). Region beads are also directly clickable here to
// exercise the real tween path.
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, invalidate, useFrame } from '@react-three/fiber';
import { Color, MathUtils, type Group } from 'three';
import { Leva } from 'leva';
import { CoilMesh } from '@/scales/chromatin/CoilMesh';
import { CoilAtmosphere } from '@/scales/chromatin/coil-atmosphere';
import { COIL_DEFAULTS, COIL_PRESETS, type CoilParams } from '@/scales/chromatin/coil-params';
import { setCoilParamsOverride } from '@/scales/chromatin/coil-live-params';
import { useCoilControls, useCoilUnwindControls, useCoilWaterControls } from '@/dev/coil-dev-tools';
import { setSceneFog } from '@/engine/scene-fog';
import { PostFX } from '@/engine/post-fx';
import { useCoilFocusStore } from '@/stores/coil-focus';
import { useDepthStore } from '@/stores/depth';

const params = new URLSearchParams(window.location.search);
const RX = MathUtils.degToRad(Number(params.get('rx') ?? '0'));
const RY = MathUtils.degToRad(Number(params.get('ry') ?? '0'));
const SPIN = params.get('spin') === '1';
// The compact cluster spans ~7 world units; ~12 frames it with breathing room.
const CAM_Z = Number(params.get('z') ?? '12');
const CAM_FOV = Number(params.get('fov') ?? '45');
const DPR = Number(params.get('dpr') ?? '2');
const SEED = params.get('seed');
const PRESET = params.get('preset');
const DRIFT_OFF = params.get('drift') === '0';
// ?water=0 hides the medium layers (silt/bokeh/bubbles/veils) for clean
// geometry review.
const WATER_ON = params.get('water') !== '0';

const basePreset: CoilParams =
  PRESET && PRESET in COIL_PRESETS
    ? COIL_PRESETS[PRESET as keyof typeof COIL_PRESETS]
    : COIL_DEFAULTS;
const initialParams: CoilParams = {
  ...basePreset,
  ...(SEED ? { seed: Number(SEED) } : null),
  ...(DRIFT_OFF ? { driftAmp: 0 } : null),
};

// Park the depth store mid-band (past the reveal windows, in the band's
// post-fx register) and pin the fog mirror to the 5.6 deep-dusk grade —
// the sustained underwater medium the re-graded look is judged inside
// (mirrors the coil-fog sustain values; no SceneAtmosphere here to write it).
useDepthStore.getState().setDepth(0.5);
setSceneFog(new Color('#20343a'), 0.02);

// Deterministic unwind state: seeded BEFORE the React tree mounts, so
// CoilMesh's tween subscription never sees a change event and the blend
// parks exactly where the URL asked (focusDepth = the parked depth, so the
// scroll-release rule holds it).
const REGION = params.get('region');
if (REGION === '0' || REGION === '1') {
  useCoilFocusStore.setState({
    focusedRegion: Number(REGION) as 0 | 1,
    unwindBlend: Math.min(1, Math.max(0, Number(params.get('open') ?? '1'))),
    focusDepth: 0.5,
  });
}

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function ShapePanel() {
  const values = useCoilControls(initialParams, false);
  useCoilWaterControls();
  useCoilUnwindControls();

  useEffect(() => {
    setCoilParamsOverride(values);
    invalidate();
  }, [values]);

  // Explicit <Leva/> — leva 0.9's implicit root uses the removed React 17
  // ReactDOM.render API and crashes under React 19 (same fix as
  // camera-dev-tools.tsx).
  return <Leva />;
}

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function SpinRig() {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    const group = groupRef.current;
    if (group) {
      group.rotation.x = RX;
      group.rotation.y = RY + (SPIN ? state.clock.elapsedTime * 0.3 : 0);
    }
  });

  return (
    // The generator centers the cluster on its own origin (unlike the arbor,
    // which grows upward from its root), so no re-centering offset is needed.
    // The water medium rides the same rig so ?spin keeps it coherent.
    <group ref={groupRef}>
      <CoilMesh origin={[0, 0, 0]} />
      {WATER_ON && <CoilAtmosphere origin={[0, 0, 0]} />}
    </group>
  );
}

const root = document.getElementById('preview-root');
if (root) {
  createRoot(root).render(
    <>
      <ShapePanel />
      <Canvas
        style={{ position: 'fixed', inset: 0, background: '#1d2027' }}
        camera={{ fov: CAM_FOV, near: 0.1, far: 1000, position: [0, 0, CAM_Z] }}
        dpr={DPR}
        gl={{ antialias: false }}
        onCreated={(state) => {
          // Dev handle for scripted verification (draw calls, tri counts):
          // page.evaluate(() => window.__preview.gl.info.render).
          (window as unknown as Record<string, unknown>).__preview = state;
        }}
      >
        <SpinRig />
        {/* Site post-processing at the parked mid-band depth so bloom/grain
            match what ships in this band. */}
        <PostFX />
      </Canvas>
    </>,
  );
}
