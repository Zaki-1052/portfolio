// src/stores/terminal-focus.ts
// Click-driven session state for the code band's terminal (the coil-focus
// mold). Writers: the listing rows/chips and the pager's close paths
// (openProject), the execute-threshold watcher (bootExecutedAtMs /
// exitExecutedAtMs — the event clock's wall-time stamps, nulled on rewind),
// and pointer handlers (hoveredRow). Readers: the pager, the status bar, and
// CodeWindowFrame — which owns the release rule (real scrolling always wins:
// depth drifting past the delta closes the pager). Selection is deliberately
// NOT store state: rows and chips are real buttons, so DOM focus IS the
// selection — a parallel index would be a second, desync-able source of
// truth. Independent of the coil's focus store by design — no cross-band
// state leaking.
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/** Canonical-depth drift that closes an open pager. */
export const TERMINAL_FOCUS_RELEASE_DELTA = 0.012;

export function shouldReleaseTerminalFocus(
  depth: number,
  openDepth: number,
  threshold: number = TERMINAL_FOCUS_RELEASE_DELTA,
): boolean {
  return Math.abs(depth - openDepth) > threshold;
}

interface TerminalFocusStore {
  /** Directory-row id whose pager is open ('cleave' | 'metaencode'), or null. */
  openProject: string | null;
  /** Depth recorded when the pager opened — the release reference. */
  openDepth: number;
  /** Pointer-hover row id — drives the status bar's row-detail state. */
  hoveredRow: string | null;
  /** The first-open hint retires permanently (coil first-focus precedent). */
  hintRetired: boolean;
  /** Wall-clock ms of the boot execute crossing; null above the threshold —
   *  the listing's print animation is keyed off this stamp. */
  bootExecutedAtMs: number | null;
  /** Wall-clock ms of the exit execute crossing; null above the threshold. */
  exitExecutedAtMs: number | null;
  setOpenProject: (id: string | null, depth: number) => void;
  setHoveredRow: (id: string | null) => void;
  setBootExecutedAtMs: (ms: number | null) => void;
  setExitExecutedAtMs: (ms: number | null) => void;
}

export const useTerminalFocusStore = create<TerminalFocusStore>()(
  subscribeWithSelector((set) => ({
    openProject: null,
    openDepth: 0,
    hoveredRow: null,
    hintRetired: false,
    bootExecutedAtMs: null,
    exitExecutedAtMs: null,
    setOpenProject: (id, depth) =>
      set((s) => ({
        openProject: id,
        openDepth: depth,
        hintRetired: s.hintRetired || id !== null,
      })),
    setHoveredRow: (id) => set({ hoveredRow: id }),
    setBootExecutedAtMs: (ms) => set({ bootExecutedAtMs: ms }),
    setExitExecutedAtMs: (ms) => set({ exitExecutedAtMs: ms }),
  })),
);
