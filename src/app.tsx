// src/app.tsx
import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { initScrollEngine, setEngineReducedMotion, getLenis } from '@/engine/scroll-engine';
import { startThemeBridge } from '@/engine/theme-bridge';
import { jumpToInitialHash, startUrlSync } from '@/engine/url-scale-sync';
import { initMotionStore, useMotionStore } from '@/stores/motion';
import { TissueContent } from '@/scales/tissue/TissueContent';
import { CellularContent } from '@/scales/cellular/CellularContent';
import { ChromatinContent } from '@/scales/chromatin/ChromatinContent';
import { ProteinContent } from '@/scales/protein/ProteinContent';
import { CodeContent } from '@/scales/code/CodeContent';
import { ExpressionContent } from '@/scales/expression/ExpressionContent';
import { DepthIndicator } from '@/components/DepthIndicator';
import { MotionToggle } from '@/components/MotionToggle';

export function App() {
  useEffect(() => {
    // Motion state before the engine so its first reduced read is correct.
    initMotionStore();
    // Singleton engine; guarded internally so StrictMode's double-invoke is a
    // no-op. No cleanup: the engine lives for the whole page session.
    initScrollEngine();

    // Land on a #scale fragment if the URL has one, then keep hash <-> scale in
    // sync. Kept out of initScrollEngine to avoid a scroll-engine <-> url-sync
    // import cycle.
    const lenis = getLenis();
    if (lenis) jumpToInitialHash(lenis);
    const stopUrlSync = startUrlSync();

    const stopThemeBridge = startThemeBridge(() => useMotionStore.getState().reduced);

    // Reflect effective reduced-motion onto <html> (drives the CSS mirror
    // blocks) and into the engine (Lenis lerp).
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

  return (
    <>
      <Canvas
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
        }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 0, 50] }}
      >
        <color attach="background" args={['#282c34']} />
      </Canvas>
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
    </>
  );
}
