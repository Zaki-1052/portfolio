// src/scales/code/terminal-actions.ts
// Shared tap/hover actions for the terminal's interactive elements — toolkit
// rows and symlink rows call the SAME open function so every card opens the
// same way. Card opens run the two-clock rule's THIRD clock: the pending
// command completes itself at real-terminal speed (time-driven — a response
// to the visitor, not to scroll) and the card opens when it lands. SWITCHING
// cards is honest terminal editing: the old command backspaces to the bare
// `less ` prompt, the new one types out, and the card swaps at the end. A
// small event channel lets the prompt line animate all of this and the
// status bar flash external departures without any store coupling.
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { useTerminalFocusStore } from '@/stores/terminal-focus';
import { getToolkit } from '@/content/loader';
import { TERMINAL_BEAT_DEFAULTS, liveTerminalBeatParams } from './terminal-beats';

/** Backspace-phase duration when a previous command must clear first. */
export const COMMAND_DELETE_MS = 150;

export type TerminalTapEvent =
  | { kind: 'complete'; id: string; command: string; deleteMs: number; typeMs: number }
  | { kind: 'external'; id: string };

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

let toolkitIds: Set<string> | null = null;
function isToolkitId(id: string): boolean {
  if (toolkitIds === null) toolkitIds = new Set(getToolkit().map((t) => t.key));
  return toolkitIds.has(id);
}

/** The command a card open completes. The toolkit lives in the hidden
 *  ~/.toolkit (absolute path, cwd-proof — and honestly invisible to the
 *  boot listing, which has no -a); projects are dirs in ~/projects whose
 *  README the pager follows into. */
export function commandForId(id: string): string {
  return isToolkitId(id) ? `less ~/.toolkit/${id}.txt` : `less ${id}/README.md`;
}

let pendingOpen: number | null = null;

export function openProjectFromRow(id: string): void {
  const store = useTerminalFocusStore.getState();
  const p = import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;
  const reduced = useMotionStore.getState().reduced;

  const wasPending = pendingOpen !== null;
  if (pendingOpen !== null) {
    window.clearTimeout(pendingOpen);
    pendingOpen = null;
  }

  // Reduced motion / instant tuning: open directly — the completion beat is
  // a flourish, not a gate.
  if (reduced || p.tapCompleteMs <= 0) {
    store.setOpenProject(id, useDepthStore.getState().depth);
    return;
  }

  // A previous command on the line (an open card, or an interrupted
  // completion) backspaces before the new one types.
  const deleteMs = store.openProject !== null || wasPending ? COMMAND_DELETE_MS : 0;
  const typeMs = p.tapCompleteMs;
  emitTapEvent({ kind: 'complete', id, command: commandForId(id), deleteMs, typeMs });
  pendingOpen = window.setTimeout(() => {
    pendingOpen = null;
    useTerminalFocusStore.getState().setOpenProject(id, useDepthStore.getState().depth);
  }, deleteMs + typeMs);
}

/** External links (the expansions' GitHub anchors) navigate natively;
 *  this feeds the status bar's fading `opening <id> ↗` departure line. */
export function notifyExternalOpened(id: string): void {
  emitTapEvent({ kind: 'external', id });
}

export function setHoveredRow(id: string | null): void {
  useTerminalFocusStore.getState().setHoveredRow(id);
}
