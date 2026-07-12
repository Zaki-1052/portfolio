// src/scales/code/terminal-actions.ts
// Shared tap/hover actions for the terminal's interactive elements — rows
// and chips call the SAME functions so "tapping a chip is identical to
// tapping the directory row" is true by construction. Dir taps run the
// two-clock rule's THIRD clock: the pending command completes itself at
// real-terminal speed (tapCompleteMs, time-driven — a response to the
// visitor, not to scroll) and the pager opens when it lands. A small event
// channel lets the prompt line animate the completion and the status bar
// flash symlink departures without any store coupling.
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { useTerminalFocusStore } from '@/stores/terminal-focus';
import { TERMINAL_BEAT_DEFAULTS, liveTerminalBeatParams } from './terminal-beats';

export type TerminalTapEvent =
  | { kind: 'complete'; id: string; command: string; totalMs: number }
  | { kind: 'symlink'; id: string };

const tapListeners = new Set<(e: TerminalTapEvent) => void>();

export function subscribeTapEvents(listener: (e: TerminalTapEvent) => void): () => void {
  tapListeners.add(listener);
  return () => {
    tapListeners.delete(listener);
  };
}

function emitTapEvent(e: TerminalTapEvent): void {
  for (const listener of tapListeners) listener(e);
}

/** The command a dir tap completes — path-correct from ~/projects. */
export function lessCommandFor(id: string): string {
  return `less ${id}/README.md`;
}

let pendingOpen: number | null = null;

export function openProjectFromRow(id: string): void {
  const store = useTerminalFocusStore.getState();
  const p = import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;
  const reduced = useMotionStore.getState().reduced;

  if (pendingOpen !== null) {
    window.clearTimeout(pendingOpen);
    pendingOpen = null;
  }

  // Already reading something (or reduced motion / instant tuning): open
  // directly — the completion beat is a first-open flourish, not a gate.
  if (store.openProject !== null || reduced || p.tapCompleteMs <= 0) {
    store.setOpenProject(id, useDepthStore.getState().depth);
    return;
  }

  emitTapEvent({ kind: 'complete', id, command: lessCommandFor(id), totalMs: p.tapCompleteMs });
  pendingOpen = window.setTimeout(() => {
    pendingOpen = null;
    useTerminalFocusStore.getState().setOpenProject(id, useDepthStore.getState().depth);
  }, p.tapCompleteMs);
}

/** Symlink rows navigate natively; this just feeds the status bar's fading
 *  `opening <name> ↗` departure line. */
export function notifySymlinkOpened(id: string): void {
  emitTapEvent({ kind: 'symlink', id });
}

export function setHoveredRow(id: string | null): void {
  useTerminalFocusStore.getState().setHoveredRow(id);
}
