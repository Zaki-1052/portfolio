// src/engine/url-scale-sync.ts
// Bidirectional URL fragment sync. Scale changes update the hash via
// replaceState (no history pollution); manual hash edits / initial load scroll
// to the matching scale. Pure hash<->scale mapping lives in scale-manager.
import type Lenis from 'lenis';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { getLenis } from './scroll-engine';
import { hashForScale, scaleFromHash } from './scale-manager';

/** Instant landing on a #fragment at page load (SPEC §6). */
export function jumpToInitialHash(lenis: Lenis): void {
  const target = scaleFromHash(window.location.hash);
  if (target) lenis.scrollTo(hashForScale(target), { immediate: true, force: true });
}

export function startUrlSync(): () => void {
  // replaceState, not pushState — scale changes shouldn't fill the back stack.
  // zustand fires only on change, so no writes while sitting still.
  const unsubStore = useDepthStore.subscribe(
    (s) => s.currentScale,
    (scale) => history.replaceState(null, '', hashForScale(scale)),
  );

  const onHashChange = (): void => {
    const target = scaleFromHash(window.location.hash);
    if (target && target !== useDepthStore.getState().currentScale) {
      getLenis()?.scrollTo(hashForScale(target), {
        immediate: useMotionStore.getState().reduced,
      });
    }
  };
  window.addEventListener('hashchange', onHashChange);

  return (): void => {
    unsubStore();
    window.removeEventListener('hashchange', onHashChange);
  };
}
