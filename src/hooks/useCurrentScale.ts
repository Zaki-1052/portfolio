// src/hooks/useCurrentScale.ts
import { useDepthStore } from '@/stores/depth';
import type { ScaleName } from '@/engine/scale-manager';

/** The active scale. Re-renders only when the scale changes, not every tick. */
export function useCurrentScale(): ScaleName {
  return useDepthStore((s) => s.currentScale);
}
