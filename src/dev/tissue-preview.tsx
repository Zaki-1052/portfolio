// src/dev/tissue-preview.tsx
// DEV-ONLY isolated preview of the tissue shell — just the mesh on a plain dark
// background, with no HTML overlay, loading sequence, GPU gate, or
// post-processing, so the shape / folds / fissure can be reviewed cleanly (via
// Playwright screenshots or by eye). Served by Vite at /tissue-preview.html in
// dev; never bundled into production (index.html doesn't reference it). Reuses
// the real TissueShellMaterial, so what you see is exactly the shipping shader.
//
// URL params: ?rx=<deg>&ry=<deg> set a static rotation; ?spin=1 auto-rotates.
import { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { DoubleSide, MathUtils, type Mesh } from 'three';
import { TissueShellMaterial } from '@/scales/tissue/tissue-shell-material';
import { PostFX } from '@/engine/post-fx';

const params = new URLSearchParams(window.location.search);
const RX = MathUtils.degToRad(Number(params.get('rx') ?? '0'));
const RY = MathUtils.degToRad(Number(params.get('ry') ?? '0'));
const SPIN = params.get('spin') === '1';

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function Shell() {
  const meshRef = useRef<Mesh>(null);

  const material = useMemo(() => {
    const m = new TissueShellMaterial();
    m.side = DoubleSide;
    m.uOpacity = 1;
    m.uDissolve = 0;
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
      <icosahedronGeometry args={[12, 6]} />
    </mesh>
  );
}

const root = document.getElementById('preview-root');
if (root) {
  createRoot(root).render(
    <Canvas
      style={{ position: 'fixed', inset: 0, background: '#141210' }}
      camera={{ fov: 45, near: 0.1, far: 1000, position: [0, 0, 40] }}
      gl={{ antialias: false }}
    >
      <Shell />
      {/* Site post-processing (defaults to tissue-level heavy bloom at depth 0) so
          the preview matches what renders on the site. */}
      <PostFX />
    </Canvas>,
  );
}
