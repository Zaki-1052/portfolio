// src/app.tsx
import { Suspense, lazy, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { initScrollEngine, setEngineReducedMotion, getLenis } from '@/engine/scroll-engine';
import { startThemeBridge } from '@/engine/theme-bridge';
import { startUrlSync } from '@/engine/url-scale-sync';
import { initMotionStore, useMotionStore } from '@/stores/motion';
import { shouldSkipIntroForHash, useIntroStore } from '@/stores/intro';
import { detectGpuTierStandalone } from '@/engine/gpu-detect';
import { startRenderInvalidation } from '@/engine/render-loop';
import { WebGLErrorBoundary } from '@/components/WebGLErrorBoundary';
import { SceneAtmosphere } from '@/engine/scene-atmosphere';
import { SceneManager } from '@/engine/scene-manager';
import { CameraController } from '@/engine/camera-controller';
import { PostFX } from '@/engine/post-fx';
import { ApproachContent } from '@/scales/approach/ApproachContent';
import { TissueContent } from '@/scales/tissue/TissueContent';
import { CellularContent } from '@/scales/cellular/CellularContent';
import { ChromatinContent } from '@/scales/chromatin/ChromatinContent';
import { ProteinContent } from '@/scales/protein/ProteinContent';
import { CodeContent } from '@/scales/code/CodeContent';
import { ExpressionContent } from '@/scales/expression/ExpressionContent';
import { DepthIndicator } from '@/components/DepthIndicator';
import { LoadingSequence } from '@/components/LoadingSequence';
import { SurfaceControl } from '@/components/SurfaceControl';
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
const ShellDevTools = import.meta.env.DEV
  ? lazy(() => import('@/dev/shell-dev-tools').then((m) => ({ default: m.ShellDevTools })))
  : null;
const AtmosphereDevTools = import.meta.env.DEV
  ? lazy(() =>
      import('@/dev/atmosphere-dev-tools').then((m) => ({ default: m.AtmosphereDevTools })),
    )
  : null;
const ArborDevTools = import.meta.env.DEV
  ? lazy(() => import('@/dev/arbor-dev-tools').then((m) => ({ default: m.ArborDevTools })))
  : null;
const FlagFlightDevTools = import.meta.env.DEV
  ? lazy(() =>
      import('@/dev/flag-flight-dev-tools').then((m) => ({ default: m.FlagFlightDevTools })),
    )
  : null;
const CoilDevTools = import.meta.env.DEV
  ? lazy(() => import('@/dev/coil-dev-tools').then((m) => ({ default: m.CoilDevTools })))
  : null;
const CodeDevTools = import.meta.env.DEV
  ? lazy(() => import('@/dev/code-dev-tools').then((m) => ({ default: m.CodeDevTools })))
  : null;
const ExpressionDevTools = import.meta.env.DEV
  ? lazy(() =>
      import('@/dev/expression-dev-tools').then((m) => ({ default: m.ExpressionDevTools })),
    )
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
    // The overture owns the opening and ALWAYS plays from the very top: undo
    // any browser scroll restoration or native #hash anchor jump (the hash is
    // honored at the landing instead), then lock scroll until it lands (both
    // released by LoadingSequence). Booting mid-page would also leave the
    // first scene unmounted, so the bake-driven sceneReady signal could never
    // fire and the intro would wait forever.
    history.scrollRestoration = 'manual';
    // Deep links (#cellular etc.) skip the overture and land directly —
    // finish() before the lock so it never engages; LoadingSequence's
    // landing effect then honors the hash immediately.
    if (shouldSkipIntroForHash(window.location.hash)) {
      useIntroStore.getState().finish();
    }
    if (useIntroStore.getState().phase !== 'done') {
      const lenis = getLenis();
      lenis?.scrollTo(0, { immediate: true, force: true });
      lenis?.stop();
    }
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

  // DEV-ONLY eye-pass aid: ?content=0 hides the whole HTML layer (visibility,
  // not display — section heights and depth measurement stay intact) so the
  // 3D scenes can be reviewed in context without the document over them.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (new URLSearchParams(window.location.search).get('content') === '0') {
      document.documentElement.dataset.devContent = 'hidden';
    }
  }, []);

  // Reflect WebGL activity for the scoped CSS reveal, and run the demand-mode
  // invalidation loop only while the Canvas is live.
  useEffect(() => {
    document.documentElement.dataset.webgl = webglActive ? 'active' : 'fallback';
    if (!webglActive) {
      // No canvas → no coil bake and no camera to fly: the overture types,
      // then cuts straight to the page.
      useIntroStore.getState().disablePush();
      return;
    }
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
        <ApproachContent />
        <TissueContent />
        <CellularContent />
        <ChromatinContent />
        <ProteinContent />
        <CodeContent />
        <ExpressionContent />
      </main>
      <LoadingSequence />
      <DepthIndicator />
      <MotionToggle />
      {/* `> surface_` — the closing movement's return control (Phase 8).
          Mounted last so natural DOM order makes it the final Tab stop. */}
      <SurfaceControl />
      {/* leva panel lives in the HTML layer (renders DOM), not the Canvas. */}
      {CameraDevTools && (
        <Suspense fallback={null}>
          <CameraDevTools />
        </Suspense>
      )}
      {/* Shell macro-form sliders (shared 'shell form' folder in the same
          leva panel; CameraDevTools provides the panel root). */}
      {ShellDevTools && (
        <Suspense fallback={null}>
          <ShellDevTools />
        </Suspense>
      )}
      {/* Fog / look / post-fx sliders ('atmosphere / fx' folder, same panel). */}
      {AtmosphereDevTools && (
        <Suspense fallback={null}>
          <AtmosphereDevTools />
        </Suspense>
      )}
      {/* Arbor growth/look sliders ('arbor …' folders, same panel). */}
      {ArborDevTools && (
        <Suspense fallback={null}>
          <ArborDevTools />
        </Suspense>
      )}
      {/* Flag-flight tuning ('flag flight' folder: preset toggle + replay). */}
      {FlagFlightDevTools && (
        <Suspense fallback={null}>
          <FlagFlightDevTools />
        </Suspense>
      )}
      {/* Coil growth/look sliders ('coil …' folders, same panel). */}
      {CoilDevTools && (
        <Suspense fallback={null}>
          <CoilDevTools />
        </Suspense>
      )}
      {/* Terminal window/beat/environment sliders ('code …' folders, same panel). */}
      {CodeDevTools && (
        <Suspense fallback={null}>
          <CodeDevTools />
        </Suspense>
      )}
      {/* Signal look/beat/surface sliders ('expression …' folders, same panel). */}
      {ExpressionDevTools && (
        <Suspense fallback={null}>
          <ExpressionDevTools />
        </Suspense>
      )}
    </>
  );
}
