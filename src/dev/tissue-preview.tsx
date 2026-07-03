// src/dev/tissue-preview.tsx
// DEV-ONLY isolated preview of the shell — just the mesh on a plain dark
// background, with no HTML overlay, loading sequence, or GPU gate, so the shape /
// folds / central cleft can be reviewed cleanly (via Playwright screenshots or by
// eye). Served by Vite at /tissue-preview.html in dev; never bundled into
// production (index.html doesn't reference it). Reuses the real
// SurfaceShellMaterial, so what you see is exactly the shipping shader.
//
// URL params: ?rx=<deg>&ry=<deg> set a static rotation; ?spin=1 auto-rotates.
import { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { DoubleSide, MathUtils, type Mesh } from 'three';
import { SurfaceShellMaterial } from '@/scales/tissue/tissue-shell-material';
import { PostFX } from '@/engine/post-fx';

const params = new URLSearchParams(window.location.search);
const RX = MathUtils.degToRad(Number(params.get('rx') ?? '0'));
const RY = MathUtils.degToRad(Number(params.get('ry') ?? '0'));
const SPIN = params.get('spin') === '1';
// ?z=<dist>&fov=<deg> set the camera. The site camera now travels a spiral
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

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function Shell() {
  const meshRef = useRef<Mesh>(null);

  const material = useMemo(() => {
    const m = new SurfaceShellMaterial();
    m.side = DoubleSide;
    m.uOpacity = 1;
    m.uDissolve = 0;
    m.uLook = LOOK;
    m.uRDBlend = 0; // skip the reaction-diffusion warmup dependency for the preview
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);

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
    </Canvas>,
  );
}
