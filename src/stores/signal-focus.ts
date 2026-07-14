// src/stores/signal-focus.ts
// Click-driven state for the expression band's signal-origin scene (the
// coil-focus / terminal-focus mold). Writers: the contact annotation buttons
// (focusedChannel / hoveredChannel), camera-controller's focus tween
// (focusBlend — tween-OWNED there, the branch-focus shape: channel focus
// moves no geometry, so the controller drives the blend and SignalLines
// double-reads it as its uFocusDim), both mail triggers (mailOpen — the doc
// register's button and the scene-native `% mail zara` prompt flip the SAME
// field), TerminalMail's success seam (fireSubmitSpark), and SignalLines'
// closing-movement threshold watcher (fireFinalPulse / clearFinalPulse —
// wall-clock stamps on the event clock, nulled on rewind, the
// bootExecutedAtMs mold). Independent of every other band's focus store by
// design — no cross-band state leaking.
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SignalChannelId } from '@/scales/expression/signal-geometry';

/** Canonical-depth drift that releases a focused channel. */
export const SIGNAL_FOCUS_RELEASE_DELTA = 0.012;

export function shouldReleaseSignalFocus(
  depth: number,
  focusDepth: number,
  threshold: number = SIGNAL_FOCUS_RELEASE_DELTA,
): boolean {
  return Math.abs(depth - focusDepth) > threshold;
}

interface SignalFocusStore {
  /** The focused contact channel — line brightens, others dim, camera pivots. */
  focusedChannel: SignalChannelId | null;
  /** Pointer-hover channel — the line's hover boost. */
  hoveredChannel: SignalChannelId | null;
  /** Camera pivot blend 0..1 — tween-owned by camera-controller; SignalLines
   *  reads it as uFocusDim so the pivot and the dim are one gesture. */
  focusBlend: number;
  /** Depth recorded at focus — the release reference. */
  focusDepth: number;
  /** The first-focus hint retires permanently (coil precedent). */
  hintRetired: boolean;
  /** The mail overlay — shared by the doc register and the scene prompt. */
  mailOpen: boolean;
  /** Successful submissions this visit (the §5.3 signalBurst counter). */
  signalBurst: number;
  /** Wall-clock ms of the last submit spark; the email line's packet rides it. */
  signalBurstFiredAtMs: number | null;
  /** Wall-clock ms of the closing movement's one final pulse; null until the
   *  forward crossing, nulled again on rewind. */
  finalPulseFiredAtMs: number | null;
  setFocusedChannel: (channel: SignalChannelId | null, depth: number) => void;
  setHoveredChannel: (channel: SignalChannelId | null) => void;
  setFocusBlend: (t: number) => void;
  setMailOpen: (open: boolean) => void;
  fireSubmitSpark: (nowMs?: number) => void;
  /** Idempotent — safe to call every frame past the threshold. */
  fireFinalPulse: (nowMs?: number) => void;
  clearFinalPulse: () => void;
}

export const useSignalFocusStore = create<SignalFocusStore>()(
  subscribeWithSelector((set) => ({
    focusedChannel: null,
    hoveredChannel: null,
    focusBlend: 0,
    focusDepth: 0,
    hintRetired: false,
    mailOpen: false,
    signalBurst: 0,
    signalBurstFiredAtMs: null,
    finalPulseFiredAtMs: null,
    setFocusedChannel: (channel, depth) =>
      set((s) => ({
        focusedChannel: channel,
        focusDepth: depth,
        // The release-teach hint lives INSIDE the expanded annotation, so it
        // must survive the first focus and retire on the first release-after-
        // focus (the coil precedent) — once a visitor has closed a channel
        // any way at all, they know the moves.
        hintRetired: s.hintRetired || (channel === null && s.focusedChannel !== null),
      })),
    setHoveredChannel: (channel) => set({ hoveredChannel: channel }),
    setFocusBlend: (t) => set({ focusBlend: t }),
    setMailOpen: (open) => set({ mailOpen: open }),
    fireSubmitSpark: (nowMs = Date.now()) =>
      set((s) => ({ signalBurst: s.signalBurst + 1, signalBurstFiredAtMs: nowMs })),
    fireFinalPulse: (nowMs = Date.now()) =>
      set((s) => (s.finalPulseFiredAtMs === null ? { finalPulseFiredAtMs: nowMs } : {})),
    clearFinalPulse: () => set({ finalPulseFiredAtMs: null }),
  })),
);
