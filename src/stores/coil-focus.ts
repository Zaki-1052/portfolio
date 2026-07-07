// src/stores/coil-focus.ts
// Click-driven focus state for the coil's publication regions. Writers: the
// region-bead click handler and the dev unwind panel (annotation labels join
// in a later stage). Readers: CoilMesh — the Approach-B unwind engine (its
// tween on unwindBlend re-runs the generator pipeline every tick) and the
// focus-dim uniforms. unwindBlend is written by CoilMesh's tween, never set
// directly by UI. The release rule keeps click-focus subordinate to the
// scroll scrub: real scrolling always wins. Independent of the arbor's
// branch-focus store by design — no cross-band state leaking.
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/** Canonical-depth drift that cancels an active focus. */
export const COIL_FOCUS_RELEASE_DELTA = 0.012;

export function shouldReleaseCoilFocus(
  depth: number,
  focusDepth: number,
  threshold: number = COIL_FOCUS_RELEASE_DELTA,
): boolean {
  return Math.abs(depth - focusDepth) > threshold;
}

export type CoilRegionIndex = 0 | 1;

interface CoilFocusStore {
  focusedRegion: CoilRegionIndex | null;
  /** 0 = compact … 1 = fully open. Tween-owned (CoilMesh). */
  unwindBlend: number;
  /** Depth recorded when focus was set — the release reference. */
  focusDepth: number;
  setFocusedRegion: (region: CoilRegionIndex | null, depth: number) => void;
  setUnwindBlend: (t: number) => void;
}

export const useCoilFocusStore = create<CoilFocusStore>()(
  subscribeWithSelector((set) => ({
    focusedRegion: null,
    unwindBlend: 0,
    focusDepth: 0,
    setFocusedRegion: (region, depth) => set({ focusedRegion: region, focusDepth: depth }),
    setUnwindBlend: (t) => set({ unwindBlend: Math.min(1, Math.max(0, t)) }),
  })),
);
