// src/app.tsx
import { Suspense, lazy, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { initScrollEngine, setEngineReducedMotion, getLenis } from '@/engine/scroll-engine';
import { startThemeBridge } from '@/engine/theme-bridge';
import { jumpToInitialHash, startUrlSync } from '@/engine/url-scale-sync';
import { initMotionStore, useMotionStore } from '@/stores/motion';
import { detectGpuTierStandalone } from '@/engine/gpu-detect';
import { startRenderInvalidation } from '@/engine/render-loop';
import { WebGLErrorBoundary } from '@/components/WebGLErrorBoundary';
import { SceneAtmosphere } from '@/engine/scene-atmosphere';
import { SceneManager } from '@/engine/scene-manager';
import { CameraController } from '@/engine/camera-controller';
import { PostFX } from '@/engine/post-fx';
import { TissueContent } from '@/scales/tissue/TissueContent';
import { CellularContent } from '@/scales/cellular/CellularContent';
import { ChromatinContent } from '@/scales/chromatin/ChromatinContent';
import { ProteinContent } from '@/scales/protein/ProteinContent';
import { CodeContent } from '@/scales/code/CodeContent';
import { ExpressionContent } from '@/scales/expression/ExpressionContent';
import { DepthIndicator } from '@/components/DepthIndicator';
import { MotionToggle } from '@/components/MotionToggle';

const theatreEnabled = import.meta.env.DEV && import.meta.env.VITE_THEATRE_ENABLED === 'true';

// Dev-only tools. Gating the lazy() on the build-time DEV/flag makes the whole
// ternary fold to null in production, so Rollup drops the dynamic import and
// never emits the leva/Theatre/perf chunks at all (not merely unfetched).
const Perf = import.meta.env.DEV
  ? lazy(() => import('r3f-perf').then((m) => ({ default: m.Perf })))
  : null;
const CameraDevTools = import.meta.env.DEV
  ? lazy(() => import('@/engine/camera-dev-tools').then((m) => ({ default: m.CameraDevTools })))
  : null;
const CameraTheatreSpike = theatreEnabled
  ? lazy(() =>
      import('@/engine/camera-theatre-spike').then((m) => ({ default: m.CameraTheatreSpike })),
    )
  : null;

export function App() {
  // GPU tier is decided once at boot, before the Canvas mounts. webglActive is a
  // one-way latch: a render throw (error boundary) or context loss flips it
  // false for the session, unmounting the Canvas and revealing the CSS fallback.
  const [gpuTier] = useState(detectGpuTierStandalone);
  const [webglActive, setWebglActive] = useState(gpuTier === 'full');

  // Bootstrap scroll/theme/motion engines once. App itself holds NO per-tick
  // reactive state — every reactive piece owns its own subscription — so the
  // Canvas children reference stays stable (see post-fx footgun).
  useEffect(() => {
    initMotionStore();
    initScrollEngine();
    const lenis = getLenis();
    if (lenis) jumpToInitialHash(lenis);
    const stopUrlSync = startUrlSync();
    const stopThemeBridge = startThemeBridge(() => useMotionStore.getState().reduced);
    const unsubMotion = useMotionStore.subscribe(
      (s) => s.reduced,
      (reduced) => {
        document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
        setEngineReducedMotion(reduced);
      },
      { fireImmediately: true },
    );
    return () => {
      stopThemeBridge();
      stopUrlSync();
      unsubMotion();
    };
  }, []);

  // Reflect WebGL activity for the scoped CSS reveal, and run the demand-mode
  // invalidation loop only while the Canvas is live.
  useEffect(() => {
    document.documentElement.dataset.webgl = webglActive ? 'active' : 'fallback';
    if (!webglActive) return;
    return startRenderInvalidation();
  }, [webglActive]);

  return (
    <>
      {webglActive && (
        <WebGLErrorBoundary onError={() => setWebglActive(false)}>
          <Canvas
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: -1,
              pointerEvents: 'none', // no 3D interaction this phase; Phase 4 revisits
            }}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            dpr={[1, 2]}
            frameloop="demand"
            camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 0, 26] }}
            onCreated={(state) => {
              // Warm initial clear so there's no black flash before SceneAtmosphere's
              // first frame; it takes over the clear color thereafter.
              state.gl.setClearColor('#2c2a28', 1);
              // Async context loss is not a thrown error — flip the latch here.
              state.gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                setWebglActive(false);
              });
            }}
          >
            <SceneAtmosphere />
            <SceneManager />
            <CameraController />
            <PostFX />
            {CameraTheatreSpike && (
              // Own boundary so a Theatre failure never trips the Canvas boundary.
              <WebGLErrorBoundary onError={() => console.warn('Theatre spike disabled')}>
                <Suspense fallback={null}>
                  <CameraTheatreSpike />
                </Suspense>
              </WebGLErrorBoundary>
            )}
            {Perf && (
              <Suspense fallback={null}>
                <Perf position="top-left" />
              </Suspense>
            )}
          </Canvas>
        </WebGLErrorBoundary>
      )}
      <main>
        <TissueContent />
        <CellularContent />
        <ChromatinContent />
        <ProteinContent />
        <CodeContent />
        <ExpressionContent />
      </main>
      <DepthIndicator />
      <MotionToggle />
      {/* leva panel lives in the HTML layer (renders DOM), not the Canvas. */}
      {CameraDevTools && (
        <Suspense fallback={null}>
          <CameraDevTools />
        </Suspense>
      )}
    </>
  );
}
