// src/dev/tissue-preview.tsx
// DEV-ONLY isolated preview of the shell — just the mesh on a plain dark
// background, with no HTML overlay, loading sequence, or GPU gate, so the shape /
// folds / central groove can be reviewed cleanly (via Playwright screenshots or by
// eye). Served by Vite at /tissue-preview.html in dev; never bundled into
// production (index.html doesn't reference it). Reuses the real
// SurfaceShellMaterial, so what you see is exactly the shipping shader — plus a
// leva panel driving the macro-form uniforms live (shell-params.ts) with preset
// buttons, so the sculpt can be iterated by eye and the winner frozen into
// SHELL_DEFAULTS.
//
// URL params: ?rx=<deg>&ry=<deg> set a static rotation; ?spin=1 auto-rotates.
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { DoubleSide, MathUtils, type Mesh } from 'three';
import { Leva, button, useControls } from 'leva';
import { SurfaceShellMaterial } from '@/scales/tissue/tissue-shell-material';
import { useCoilTexture } from '@/scales/tissue/reaction-diffusion';
import {
  SHELL_DEFAULTS,
  SHELL_PRESETS,
  applyShellParams,
  type ShellParams,
} from '@/scales/tissue/shell-params';
import { PostFX } from '@/engine/post-fx';

const params = new URLSearchParams(window.location.search);
const RX = MathUtils.degToRad(Number(params.get('rx') ?? '0'));
const RY = MathUtils.degToRad(Number(params.get('ry') ?? '0'));
const SPIN = params.get('spin') === '1';
// ?z=<dist>&fov=<deg> set the camera. The site camera travels a spiral
// (camera-keyframes.ts: establish ~120 units out, arrival within ~15), so
// review the form at several rx/ry/z combos simulating those beats rather
// than one fixed framing.
const CAM_Z = Number(params.get('z') ?? '40');
const CAM_FOV = Number(params.get('fov') ?? '45');
// Pixel ratio. Defaults to 2 (retina-honest): a 1× render aliases coarse
// shader detail into FAKE crispness, so always review at 2×. Override with
// ?dpr=1 only to see the aliased low-res look.
const DPR = Number(params.get('dpr') ?? '2');
// ?look=0 crisp matte sculpture (ship default) … ?look=1 dreamy golden bloom-glow
const LOOK = Number(params.get('look') ?? '0');
// ?preset=loaf|crown|bluff picks the starting shape (default: shipping values).
const PRESET = params.get('preset');

// One shared material: the Shell mesh (inside the Canvas) renders it, the
// leva panel (outside) writes its uniforms. Dev page — never disposed.
const material = new SurfaceShellMaterial();
material.side = DoubleSide;
material.uOpacity = 1;
material.uDissolve = 0;
material.uLook = LOOK;
const initialParams: ShellParams =
  PRESET && PRESET in SHELL_PRESETS
    ? SHELL_PRESETS[PRESET as keyof typeof SHELL_PRESETS]
    : SHELL_DEFAULTS;
applyShellParams(material, initialParams);

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function ShapePanel() {
  const [values, set] = useControls(() => ({
    dimX: { value: initialParams.dimX, min: 0.6, max: 1.4, step: 0.01 },
    dimY: { value: initialParams.dimY, min: 0.5, max: 1.4, step: 0.01 },
    dimZ: { value: initialParams.dimZ, min: 0.8, max: 1.7, step: 0.01 },
    boxiness: { value: initialParams.boxiness, min: 1.6, max: 3.5, step: 0.05 },
    shoulderY: { value: initialParams.shoulderY, min: -0.5, max: 0.8, step: 0.01 },
    shoulderBulge: { value: initialParams.shoulderBulge, min: 0, max: 0.3, step: 0.005 },
    baseTuck: { value: initialParams.baseTuck, min: 0, max: 0.5, step: 0.01 },
    bottomFlat: { value: initialParams.bottomFlat, min: 0.5, max: 1, step: 0.01 },
    cleftWidth: { value: initialParams.cleftWidth, min: 0.02, max: 0.2, step: 0.005 },
    cleftDepth: { value: initialParams.cleftDepth, min: 0, max: 4, step: 0.05 },
    moundHeight: { value: initialParams.moundHeight, min: 0, max: 2, step: 0.05 },
    grooveRearFade: { value: initialParams.grooveRearFade, min: 0, max: 1, step: 0.01 },
    overhang: { value: initialParams.overhang, min: 0, max: 3, step: 0.05 },
    subMassY: { value: initialParams.subMassY, min: -1, max: 0, step: 0.01 },
    subMassZ: { value: initialParams.subMassZ, min: -1, max: 0, step: 0.01 },
    subMassRadius: { value: initialParams.subMassRadius, min: 10, max: 60, step: 1 },
    subMassHeight: { value: initialParams.subMassHeight, min: 0, max: 4, step: 0.05 },
    sepFold: { value: initialParams.sepFold, min: 0, max: 3, step: 0.05 },
    frontLift: { value: initialParams.frontLift, min: -1, max: 2, step: 0.05 },
    fineAmp: { value: initialParams.fineAmp, min: 0, max: 0.3, step: 0.005 },
    pleatAmp: { value: initialParams.pleatAmp, min: 0, max: 0.6, step: 0.01 },
    pleatFreq: { value: initialParams.pleatFreq, min: 10, max: 200, step: 1 },
    'preset: loaf': button(() => set({ ...SHELL_PRESETS.loaf })),
    'preset: crown': button(() => set({ ...SHELL_PRESETS.crown })),
    'preset: bluff': button(() => set({ ...SHELL_PRESETS.bluff })),
  }));

  useEffect(() => {
    applyShellParams(material, values as ShellParams);
  }, [values]);

  // Explicit <Leva/> — leva 0.9's implicit root uses the removed React 17
  // ReactDOM.render API and crashes under React 19 (same fix as
  // camera-dev-tools.tsx).
  return <Leva />;
}

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function Shell() {
  const meshRef = useRef<Mesh>(null);
  // The coil ridges ARE the baked reaction-diffusion texture now, so the
  // preview must warm + bake it just like the site (flat for ~1s, then pops).
  const coilTexture = useCoilTexture();

  useEffect(() => {
    if (coilTexture) {
      material.uCoilTex = coilTexture;
      material.uRDBlend = 0.5; // match the shipping mottle strength
    }
  }, [coilTexture]);

  useFrame((state) => {
    material.uTime = state.clock.elapsedTime;
    const mesh = meshRef.current;
    if (mesh) {
      mesh.rotation.x = RX;
      mesh.rotation.y = RY + (SPIN ? state.clock.elapsedTime * 0.3 : 0);
    }
  });

  return (
    <mesh ref={meshRef} material={material}>
      {/* Match TissueScene: high subdivision so the vertex-displaced ridges
          resolve. detail is LINEAR (tris = 20·(detail+1)²). */}
      <icosahedronGeometry args={[12, 64]} />
    </mesh>
  );
}

const root = document.getElementById('preview-root');
if (root) {
  createRoot(root).render(
    <>
      <ShapePanel />
      <Canvas
        style={{ position: 'fixed', inset: 0, background: '#141210' }}
        camera={{ fov: CAM_FOV, near: 0.1, far: 1000, position: [0, 0, CAM_Z] }}
        dpr={DPR}
        gl={{ antialias: false }}
      >
        <Shell />
        {/* Site post-processing (defaults to the first scale's heavy bloom at depth 0)
            so the preview matches what renders on the site. */}
        <PostFX />
      </Canvas>
    </>,
  );
}
