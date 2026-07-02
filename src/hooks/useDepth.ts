// src/hooks/useDepth.ts
import { useDepthStore } from '@/stores/depth';

/** Subscribe to the canonical scroll depth (0..1). Re-renders every scroll tick. */
export function useDepth(): number {
  return useDepthStore((s) => s.depth);
}
