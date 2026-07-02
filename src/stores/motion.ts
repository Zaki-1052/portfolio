// src/stores/motion.ts
// Centralized reduced-motion state: the OS `prefers-reduced-motion` pref OR an
// on-page toggle (persisted). `reduced` is the effective value everything reads.
// The toggle only ADDS reduction (it can't force motion back on over an OS pref).
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const STORAGE_KEY = 'zalibhai:motion-reduced';

interface MotionStore {
  osReduced: boolean;
  userReduced: boolean; // on-page toggle, persisted to localStorage
  reduced: boolean; // effective: osReduced || userReduced
  setOsReduced: (v: boolean) => void;
  toggleUserReduced: () => void;
}

export const useMotionStore = create<MotionStore>()(
  subscribeWithSelector((set, get) => ({
    osReduced: false,
    userReduced: false,
    reduced: false,
    setOsReduced: (v: boolean): void => set({ osReduced: v, reduced: v || get().userReduced }),
    toggleUserReduced: (): void => {
      const userReduced = !get().userReduced;
      localStorage.setItem(STORAGE_KEY, userReduced ? '1' : '0');
      set({ userReduced, reduced: userReduced || get().osReduced });
    },
  })),
);

let mqListenerBound = false;

/** Seed the store from the OS pref + persisted toggle and track live OS changes. */
export function initMotionStore(): void {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const userReduced = localStorage.getItem(STORAGE_KEY) === '1';
  useMotionStore.setState({
    osReduced: mq.matches,
    userReduced,
    reduced: mq.matches || userReduced,
  });
  // Bind the OS listener once (StrictMode / remounts call this more than once).
  if (mqListenerBound) return;
  mqListenerBound = true;
  mq.addEventListener('change', (e) => useMotionStore.getState().setOsReduced(e.matches));
}
