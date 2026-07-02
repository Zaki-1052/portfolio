// src/hooks/useReducedMotion.ts
import { useMotionStore } from '@/stores/motion';

/** Effective reduced-motion state (OS pref OR persisted on-page toggle). */
export function useReducedMotion(): boolean {
  return useMotionStore((s) => s.reduced);
}
