// src/dev/cellular-preview.tsx
// DEV-ONLY isolated preview of the arbor — the tree alone on a plain dark
// background, no HTML overlay, loading sequence, or GPU gate, so the growth /
// silhouette / glow periphery can be reviewed cleanly (Playwright screenshots
// or by eye). Mounts the REAL <ArborMesh/> plus the arbor leva panel writing
// the live override, so what you tune here is exactly the shipping tree.
//
// URL params: ?rx=<deg>&ry=<deg> static rotation; ?spin=1 auto-rotates;
// ?z=<dist>&fov=<deg> camera; ?dpr=<n> pixel ratio (default 2 — retina-honest;
// 1× aliases fine strands into FAKE crispness); ?seed=<n> regrows the tree;
// ?preset=sparse|dense|gnarled picks the parameter set; ?sway=0 freezes.
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, invalidate, useFrame } from '@react-three/fiber';
import { Color, MathUtils, type Group } from 'three';
import { Leva } from 'leva';
import { ArborMesh } from '@/scales/cellular/ArborMesh';
import { ARBOR_DEFAULTS, ARBOR_PRESETS, type ArborParams } from '@/scales/cellular/arbor-params';
import { setArborParamsOverride } from '@/scales/cellular/arbor-live-params';
import { useArborControls } from '@/dev/arbor-dev-tools';
import { setSceneFog } from '@/engine/scene-fog';
import { PostFX } from '@/engine/post-fx';
import { useDepthStore } from '@/stores/depth';

const params = new URLSearchParams(window.location.search);
const RX = MathUtils.degToRad(Number(params.get('rx') ?? '0'));
const RY = MathUtils.degToRad(Number(params.get('ry') ?? '0'));
const SPIN = params.get('spin') === '1';
// The tree spans roughly 25 world units of canopy; ~48 frames it whole.
const CAM_Z = Number(params.get('z') ?? '48');
const CAM_FOV = Number(params.get('fov') ?? '45');
const DPR = Number(params.get('dpr') ?? '2');
const SEED = params.get('seed');
const PRESET = params.get('preset');
const SWAY_OFF = params.get('sway') === '0';

const basePreset: ArborParams =
  PRESET && PRESET in ARBOR_PRESETS
    ? ARBOR_PRESETS[PRESET as keyof typeof ARBOR_PRESETS]
    : ARBOR_DEFAULTS;
const initialParams: ArborParams = {
  ...basePreset,
  ...(SEED ? { seed: Number(SEED) } : null),
  ...(SWAY_OFF ? { swayAmp: 0 } : null),
};

// Park the depth store mid-band (the cellular band's post-fx register, not
// depth-0's heavy warm bloom) and pin the fog mirror to the band's anchor —
// there's no SceneAtmosphere here to write it.
useDepthStore.getState().setDepth(0.36);
setSceneFog(new Color('#312b30'), 0.014);

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function ShapePanel() {
  const values = useArborControls(initialParams, false);

  useEffect(() => {
    setArborParamsOverride(values);
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
    // Centered on the canopy's rough midpoint (the tree grows upward from its
    // root) so rx/ry orbits pivot around the mass, not the base.
    <group ref={groupRef}>
      <ArborMesh origin={[0, -9, 0]} />
    </group>
  );
}

const root = document.getElementById('preview-root');
if (root) {
  createRoot(root).render(
    <>
      <ShapePanel />
      <Canvas
        style={{ position: 'fixed', inset: 0, background: '#17141a' }}
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
