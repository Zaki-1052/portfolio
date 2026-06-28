// src/stores/depth.ts
import { create } from 'zustand';

export type ScaleName = 'tissue' | 'cellular' | 'chromatin' | 'protein' | 'code' | 'expression';

export const SCALES: readonly ScaleName[] = [
  'tissue',
  'cellular',
  'chromatin',
  'protein',
  'code',
  'expression',
] as const;

export const SCALE_BOUNDARIES = [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1.0] as const;

function scaleFromDepth(depth: number): ScaleName {
  for (let i = SCALE_BOUNDARIES.length - 2; i >= 0; i--) {
    if (depth >= SCALE_BOUNDARIES[i]!) {
      return SCALES[i]!;
    }
  }
  return SCALES[0]!;
}

interface DepthStore {
  depth: number;
  currentScale: ScaleName;
  setDepth: (d: number) => void;
}

export const useDepthStore = create<DepthStore>((set) => ({
  depth: 0,
  currentScale: 'tissue',
  setDepth: (d: number) => {
    const clamped = Math.max(0, Math.min(1, d));
    set({ depth: clamped, currentScale: scaleFromDepth(clamped) });
  },
}));
