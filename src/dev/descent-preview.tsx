// src/dev/descent-preview.tsx
// DEV-ONLY isolated preview of the FULL descent stack — the exact Canvas
// subtree the site ships (SceneAtmosphere + SceneManager + CameraController +
// PostFX) driven by a scrubbable depth instead of scroll, with no HTML
// document layer. This is the verification instrument for band transitions:
// fog handoffs, camera knots, and scene crossfades are reviewed here (by eye
// or Playwright) without ever loading the site itself.
//
// The theme bridge needs one element per band to read its CSS-scoped colors
// from; hidden stubs stand in for the document sections, so the fog/clear
// colors track depth exactly as they do live.
//
// URL params: ?depth=<0..1> initial park (default 0.46); ?from=&to=&dur=<s>
// seed the sweep buttons (defaults 0.4 → 0.6 over 8s); ?dpr=<n> pixel ratio
// (default 2); ?reduced=1 forces reduced motion (anchor cuts, frozen drift);
// ?perf=1 mounts the r3f-perf HUD. Scripted hooks: window.__setDepth(d),
// window.__sweep(from, to, durS), window.__preview (gl.info etc.).
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, invalidate } from '@react-three/fiber';
import { button, useControls } from 'leva';
import { gsap } from 'gsap';
import { Perf } from 'r3f-perf';
import { SceneAtmosphere } from '@/engine/scene-atmosphere';
import { SceneManager } from '@/engine/scene-manager';
import { CameraController } from '@/engine/camera-controller';
import { PostFX } from '@/engine/post-fx';
import { CameraDevTools } from '@/engine/camera-dev-tools';
import { startThemeBridge } from '@/engine/theme-bridge';
import { startRenderInvalidation } from '@/engine/render-loop';
import { SCALES } from '@/engine/scale-manager';
import { useDepthStore } from '@/stores/depth';
import { useIntroStore } from '@/stores/intro';
import { initMotionStore, useMotionStore } from '@/stores/motion';
import '@/styles/globals.css';

const params = new URLSearchParams(window.location.search);
const DPR = Number(params.get('dpr') ?? '2');
const INITIAL_DEPTH = Math.min(1, Math.max(0, Number(params.get('depth') ?? '0.46')));
const SWEEP_FROM = Number(params.get('from') ?? '0.4');
const SWEEP_TO = Number(params.get('to') ?? '0.6');
const SWEEP_DUR = Number(params.get('dur') ?? '8');
const PERF = params.get('perf') === '1';

// Bootstrap BEFORE the React tree mounts (chromatin-preview precedent):
// motion state resolved, the overture marked done (the camera flies the
// scroll path immediately — the deep-link precedent from app.tsx), and the
// depth store parked so the first frame renders the requested beat.
initMotionStore();
if (params.get('reduced') === '1') {
  useMotionStore.setState({ userReduced: true, reduced: true });
}
useIntroStore.getState().finish();
useDepthStore.getState().setDepth(INITIAL_DEPTH);

function applyDepth(d: number): void {
  useDepthStore.getState().setDepth(Math.min(1, Math.max(0, d)));
  invalidate();
}

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function ThemeStubs() {
  // Started here (not module scope) so the stub elements are committed to
  // the DOM before the bridge reads their computed colors.
  useEffect(() => startThemeBridge(() => useMotionStore.getState().reduced), []);
  return (
    <div style={{ position: 'absolute', visibility: 'hidden' }} aria-hidden="true">
      {SCALES.map((s) => (
        <div key={s} id={s} data-scale={s} />
      ))}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function DescentPanel() {
  const sweepTween = useRef<gsap.core.Tween | null>(null);

  const startSweep = (from: number, to: number): void => {
    sweepTween.current?.kill();
    const proxy = { d: from };
    applyDepth(from);
    // Linear on purpose — a constant-rate scrub imitates a steady scroll,
    // which is what the FPS read through the transition window needs.
    sweepTween.current = gsap.to(proxy, {
      d: to,
      duration: SWEEP_DUR,
      ease: 'none',
      onUpdate: () => applyDepth(proxy.d),
    });
  };

  useControls('descent', {
    depth: {
      value: INITIAL_DEPTH,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (d: number) => {
        sweepTween.current?.kill();
        applyDepth(d);
      },
    },
    [`sweep ${SWEEP_FROM} → ${SWEEP_TO}`]: button(() => startSweep(SWEEP_FROM, SWEEP_TO)),
    [`sweep ${SWEEP_TO} → ${SWEEP_FROM}`]: button(() => startSweep(SWEEP_TO, SWEEP_FROM)),
  });

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__setDepth = applyDepth;
    w.__sweep = (from: number, to: number, durS?: number) => {
      sweepTween.current?.kill();
      const proxy = { d: from };
      applyDepth(from);
      sweepTween.current = gsap.to(proxy, {
        d: to,
        duration: durS ?? SWEEP_DUR,
        ease: 'none',
        onUpdate: () => applyDepth(proxy.d),
      });
    };
    return () => {
      sweepTween.current?.kill();
    };
  }, []);

  return null;
}

// eslint-disable-next-line react-refresh/only-export-components -- dev-only entry, not a fast-refresh module
function DescentPreview() {
  // Same demand-mode invalidation loop as the site — the scenes' ambient
  // rendering acquisitions (drift, shimmer) need it to tick.
  useEffect(() => startRenderInvalidation(), []);
  return (
    <>
      <ThemeStubs />
      {/* CameraDevTools provides the shared leva root; the descent folder
          mounts into the same panel. */}
      <CameraDevTools />
      <DescentPanel />
      <Canvas
        style={{ position: 'fixed', inset: 0 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={DPR}
        frameloop="demand"
        camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 0, 26] }}
        onCreated={(state) => {
          state.gl.setClearColor('#2c2a28', 1);
          // Dev handle for scripted verification (draw calls, tri counts):
          // page.evaluate(() => window.__preview.gl.info.render).
          (window as unknown as Record<string, unknown>).__preview = state;
        }}
      >
        <SceneAtmosphere />
        <SceneManager />
        <CameraController />
        <PostFX />
        {PERF && <Perf position="top-left" />}
      </Canvas>
    </>
  );
}

const root = document.getElementById('preview-root');
if (root) {
  createRoot(root).render(<DescentPreview />);
}
