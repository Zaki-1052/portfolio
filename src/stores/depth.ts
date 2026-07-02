// src/stores/depth.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { nextTransitionState, clamp01, type ScaleName } from '@/engine/scale-manager';

// Re-export the canonical scale constants so existing importers of this store
// (DepthIndicator, ScaleSection, content/types, content/loader) don't move.
export { SCALES, SCALE_BOUNDARIES, type ScaleName } from '@/engine/scale-manager';

interface DepthStore {
  depth: number; // canonical 0..1
  currentScale: ScaleName;
  previousScale: ScaleName | null;
  isTransitioning: boolean;
  scaleProgress: number; // local progress through currentScale's band
  setDepth: (d: number) => void;
}

export const useDepthStore = create<DepthStore>()(
  subscribeWithSelector((set, get) => ({
    depth: 0,
    currentScale: 'tissue',
    previousScale: null,
    isTransitioning: false,
    scaleProgress: 0,
    // Accepts a CANONICAL depth. The raw->canonical remap lives in the scroll
    // engine, the only place that knows about raw document-scroll fractions.
    setDepth: (d: number): void => {
      const depth = clamp01(d);
      set({ depth, ...nextTransitionState(get(), depth) });
    },
  })),
);
