// src/stores/intro.ts
// The overture's phase machine. NEVER persisted — the sequence plays every
// visit by design (SPEC §7). typing → push happens only when BOTH the typed
// sequence has finished AND the scene is honestly ready (the coil bake has
// landed); reduced motion or a WebGL fallback skips the push entirely (the
// nearest-anchor camera already lands the depth-0 pose; the fallback has no
// camera at all). All transitions are idempotent so StrictMode double-invokes
// and late signals can't wedge the machine.
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useMotionStore } from './motion';

export type IntroPhase = 'typing' | 'push' | 'done';

interface IntroStore {
  phase: IntroPhase;
  introProgress: number; // 0..1 through the push flight
  typingDone: boolean;
  sceneReady: boolean;
  pushEnabled: boolean; // false on the WebGL-fallback path
  markTypingDone: () => void;
  markSceneReady: () => void;
  /** WebGL fallback: no camera to fly — typing cuts straight to done. */
  disablePush: () => void;
  setIntroProgress: (p: number) => void;
  finish: () => void;
}

function advanced(s: {
  phase: IntroPhase;
  typingDone: boolean;
  sceneReady: boolean;
  pushEnabled: boolean;
}): Partial<IntroStore> {
  if (s.phase !== 'typing' || !s.typingDone || !s.sceneReady) return {};
  if (!s.pushEnabled || useMotionStore.getState().reduced) {
    return { phase: 'done', introProgress: 1 };
  }
  return { phase: 'push' };
}

export const useIntroStore = create<IntroStore>()(
  subscribeWithSelector((set) => ({
    phase: 'typing',
    introProgress: 0,
    typingDone: false,
    sceneReady: false,
    pushEnabled: true,

    markTypingDone: () =>
      set((s) => ({ typingDone: true, ...advanced({ ...s, typingDone: true }) })),

    markSceneReady: () =>
      set((s) => ({ sceneReady: true, ...advanced({ ...s, sceneReady: true }) })),

    disablePush: () =>
      set((s) => {
        const next = { ...s, pushEnabled: false, sceneReady: true };
        // Mid-push context loss: there is no longer a camera to finish the
        // flight — land immediately.
        if (s.phase === 'push')
          return { pushEnabled: false, sceneReady: true, phase: 'done', introProgress: 1 };
        return { pushEnabled: false, sceneReady: true, ...advanced(next) };
      }),

    setIntroProgress: (p) => set({ introProgress: Math.max(0, Math.min(1, p)) }),

    finish: () => set({ phase: 'done', introProgress: 1 }),
  })),
);
