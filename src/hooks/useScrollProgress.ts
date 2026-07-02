// src/hooks/useScrollProgress.ts
import { useDepthStore } from '@/stores/depth';
import { scaleProgressFor, type ScaleName } from '@/engine/scale-manager';

/** Local progress (0..1) through a given scale's canonical band. */
export function useScrollProgress(scale: ScaleName): number {
  return useDepthStore((s) => scaleProgressFor(s.depth, scale));
}
