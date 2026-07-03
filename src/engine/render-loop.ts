// src/engine/render-loop.ts
// Owns WHEN the Canvas renders under frameloop="demand". Depth/motion changes
// and resizes each request one frame; an optional ambient ticker requests
// ~30fps so a mounted scene keeps breathing (slow uTime drift) at rest instead
// of freeze-framing. What each frame RENDERS is owned elsewhere (camera
// controller, post-fx, scenes) reading the stores imperatively. Kept out of
// scroll-engine.ts so that module stays three-agnostic for the node tests.
import { invalidate } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';

let ambientActive = false;
let parity = 0;

// Runs every gsap tick; renders on every other one (~30fps) while ambient
// rendering is on. rAF-backed, so background tabs throttle it to nothing.
function ambientTick(): void {
  if (!ambientActive) return;
  parity ^= 1;
  if (parity === 0) invalidate();
}

/**
 * Enable/disable the idle breathing loop. Scenes call this on mount/unmount,
 * gated on full motion (reduced motion holds the scene static).
 */
export function setAmbientRendering(active: boolean): void {
  ambientActive = active;
}

/**
 * Wire depth/motion/resize to invalidate(). Returns a teardown. Call once the
 * Canvas is active; the returned cleanup runs if WebGL falls back.
 */
export function startRenderInvalidation(): () => void {
  const request = (): void => invalidate();
  const unsubDepth = useDepthStore.subscribe((s) => s.depth, request);
  const unsubMotion = useMotionStore.subscribe((s) => s.reduced, request);
  window.addEventListener('resize', request);
  gsap.ticker.add(ambientTick);
  invalidate(); // ensure a first frame after mount

  return (): void => {
    unsubDepth();
    unsubMotion();
    window.removeEventListener('resize', request);
    gsap.ticker.remove(ambientTick);
    ambientActive = false;
  };
}
