// src/stores/branch-focus.ts
// Click-driven focus state for the arbor's project index. Writers: the
// annotation labels and the fallback branch buttons. Readers: the camera
// controller (pose blend), the arbor materials (limb dim/hover), and the
// annotation overlay (entry reveal). focusBlend is written by the
// controller's tween, never set directly by UI. The release rule
// (shouldReleaseFocus) keeps click-focus subordinate to the scroll scrub:
// real scrolling always wins.
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { BranchKey } from '@/content/branch-order';

/** Canonical-depth drift that cancels an active focus. */
export const BRANCH_FOCUS_RELEASE_DELTA = 0.012;

export function shouldReleaseFocus(
  depth: number,
  focusDepth: number,
  threshold: number = BRANCH_FOCUS_RELEASE_DELTA,
): boolean {
  return Math.abs(depth - focusDepth) > threshold;
}

interface BranchFocusStore {
  focusedBranch: BranchKey | null;
  hoveredBranch: BranchKey | null;
  /** 0 = depth-driven camera … 1 = fully on the focus pose. Tween-owned. */
  focusBlend: number;
  /** Depth recorded when focus was set — the release reference. */
  focusDepth: number;
  setFocusedBranch: (branch: BranchKey | null, depth: number) => void;
  setHoveredBranch: (branch: BranchKey | null) => void;
  setFocusBlend: (t: number) => void;
}

export const useBranchFocusStore = create<BranchFocusStore>()(
  subscribeWithSelector((set) => ({
    focusedBranch: null,
    hoveredBranch: null,
    focusBlend: 0,
    focusDepth: 0,
    setFocusedBranch: (branch, depth) => set({ focusedBranch: branch, focusDepth: depth }),
    setHoveredBranch: (branch) => set({ hoveredBranch: branch }),
    setFocusBlend: (t) => set({ focusBlend: Math.min(1, Math.max(0, t)) }),
  })),
);
