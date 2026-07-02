// src/engine/scroll-engine.ts
// Singleton scroll engine: Lenis smooth scroll synced to GSAP's ticker, driving
// one master ScrollTrigger. Raw document-scroll progress is remapped to canonical
// depth (piecewise, from measured section spans) and pushed into the depth store.
// Module-level singleton so React 19 StrictMode's double-invoke is a no-op.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDepthStore } from '@/stores/depth';
import { SCALE_BOUNDARIES, measureSectionBoundaries, rawProgressToDepth } from './scale-manager';

export const DEFAULT_LERP = 0.1;

let lenis: Lenis | null = null;
let trigger: ScrollTrigger | null = null;
let rawBoundaries: readonly number[] = SCALE_BOUNDARIES;
let tickerCallback: ((time: number) => void) | null = null;
let resizeObserver: ResizeObserver | null = null;
let initialized = false;

export function getLenis(): Lenis | null {
  return lenis;
}

/** Toggle smooth scrolling: lerp 1 is near-instant (reduced motion). */
export function setEngineReducedMotion(active: boolean): void {
  if (lenis) lenis.options.lerp = active ? 1 : DEFAULT_LERP;
}

export function initScrollEngine(): void {
  if (initialized) return; // StrictMode double-invoke guard
  initialized = true;

  gsap.registerPlugin(ScrollTrigger);

  lenis = new Lenis({ lerp: DEFAULT_LERP, smoothWheel: true, anchors: true, autoRaf: false });

  tickerCallback = (time: number): void => {
    // gsap ticker time is seconds; Lenis wants milliseconds.
    lenis?.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);
  lenis.on('scroll', ScrollTrigger.update);

  const remeasure = (): void => {
    rawBoundaries = measureSectionBoundaries();
  };
  remeasure();

  trigger = ScrollTrigger.create({
    trigger: 'main',
    start: 'top top',
    end: 'bottom bottom',
    onRefresh: remeasure,
    onUpdate: (self) => {
      useDepthStore.getState().setDepth(rawProgressToDepth(self.progress, rawBoundaries));
    },
  });

  // Section heights shift as web fonts (font-display: swap) and the large hero
  // image load in; re-measure on any reflow so canonical depth stays aligned.
  resizeObserver = new ResizeObserver(() => ScrollTrigger.refresh());
  const main = document.querySelector('main');
  if (main) resizeObserver.observe(main);
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

export function destroyScrollEngine(): void {
  if (!initialized) return;
  resizeObserver?.disconnect();
  trigger?.kill();
  if (tickerCallback) gsap.ticker.remove(tickerCallback);
  lenis?.destroy();
  resizeObserver = null;
  trigger = null;
  tickerCallback = null;
  lenis = null;
  rawBoundaries = SCALE_BOUNDARIES;
  initialized = false;
}

// Tear the engine down before an HMR module swap so dev never runs two Lenis
// instances / duplicate ScrollTriggers against the same page.
if (import.meta.hot) {
  import.meta.hot.dispose(() => destroyScrollEngine());
}
