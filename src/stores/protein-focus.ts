// src/stores/protein-focus.ts
// Interactive state for the protein band: which receptor–G-protein system is
// displayed (Gq/Gi), the toggle-morph crossfade blend, and the annotation
// focus. Writers: the toggle UI and the annotation click handler. Readers:
// ProteinMesh — the receptor morph engine and the focus-dim uniforms. The
// release rule keeps click-focus subordinate to the scroll scrub: real
// scrolling always wins. Independent of the coil's focus store by design.
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type ProteinSystem = 'gq' | 'gi';

export const PROTEIN_FOCUS_RELEASE_DELTA = 0.012;

export function shouldReleaseProteinFocus(
  depth: number,
  focusDepth: number,
  threshold: number = PROTEIN_FOCUS_RELEASE_DELTA,
): boolean {
  return Math.abs(depth - focusDepth) > threshold;
}

interface ProteinFocusStore {
  activeSystem: ProteinSystem;
  toggleBlend: number;
  focusedAnnotation: string | null;
  focusDepth: number;
  setActiveSystem: (system: ProteinSystem) => void;
  setToggleBlend: (t: number) => void;
  setFocusedAnnotation: (annotation: string | null, depth: number) => void;
}

export const useProteinFocusStore = create<ProteinFocusStore>()(
  subscribeWithSelector((set) => ({
    activeSystem: 'gq',
    toggleBlend: 0,
    focusedAnnotation: null,
    focusDepth: 0,
    setActiveSystem: (system) => set({ activeSystem: system }),
    setToggleBlend: (t) => set({ toggleBlend: Math.min(1, Math.max(0, t)) }),
    setFocusedAnnotation: (annotation, depth) =>
      set({ focusedAnnotation: annotation, focusDepth: depth }),
  })),
);
