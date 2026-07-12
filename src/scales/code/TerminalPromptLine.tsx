// src/scales/code/TerminalPromptLine.tsx
// The two prompt lines. All three of the terminal's text clocks meet here:
//   · SCROLL — commands scrub: boot types `cd projects && ls -la` across its
//     beat, the live prompt scrubs `exit` across the exit beat; both freeze
//     mid-word at scroll rest and backspace on rewind.
//   · TIME — a dir tap completes the pending `less <id>/README.md` at
//     real-terminal speed (terminal-actions' tap channel) before the pager
//     opens; while the pager is open the completed command holds.
//   · The accelerator (§3.6, pointer-only garnish): tapping a mid-scrub
//     command smooth-scrolls Lenis to that beat's execute threshold, so
//     scroll position and session state can never disagree.
// Text is written imperatively from a depth-store subscription (no React
// churn at scroll rate). Scrub lines are decorative to AT (aria-hidden) —
// the listing, chips, and pager are the accessible interface.
import { useEffect, useRef, type CSSProperties } from 'react';
import { gsap } from 'gsap';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { useTerminalFocusStore } from '@/stores/terminal-focus';
import { depthToScrollY, getLenis } from '@/engine/scroll-engine';
import {
  BOOT_COMMAND,
  EXIT_COMMAND,
  TERMINAL_BEAT_DEFAULTS,
  bootCharsTyped,
  exitCharsTyped,
  liveTerminalBeatParams,
  type TerminalBeatParams,
} from './terminal-beats';
import { tapCommandCharsAt } from './terminal-output';
import { subscribeTapEvents } from './terminal-actions';

function beatParams(): TerminalBeatParams {
  return import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;
}

interface TerminalPromptLineProps {
  variant: 'boot' | 'live';
}

export function TerminalPromptLine({ variant }: TerminalPromptLineProps) {
  const cmdRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cmd = cmdRef.current;
    const cursor = cursorRef.current;
    if (!cmd || !cursor) return undefined;

    // Time-driven tap completion (live prompt only): while running (or once
    // the pager is open) the scroll clock keeps its hands off the line.
    let tapCommand: string | null = null;
    let tapStartMs = 0;
    let tapTotalMs = 0;

    const writeLine = (text: string, cursorOn: boolean): void => {
      if (cmd.textContent !== text) cmd.textContent = text;
      const display = cursorOn ? '' : 'none';
      if (cursor.style.display !== display) cursor.style.display = display;
    };

    const syncFromDepth = (depth: number): void => {
      const p = beatParams();
      const reduced = useMotionStore.getState().reduced;

      if (variant === 'boot') {
        // Reduced motion: no scrub — fully typed the moment the beat begins.
        const chars = reduced
          ? depth >= p.bootStart
            ? BOOT_COMMAND.length
            : 0
          : bootCharsTyped(depth, p);
        writeLine(BOOT_COMMAND.slice(0, chars), depth < p.bootExecute);
        return;
      }

      // The live prompt: the tap clock and the open pager both outrank the
      // scroll clock (the completed command holds under the alternate
      // screen, exactly like real less).
      if (tapCommand !== null) {
        const chars = tapCommandCharsAt(tapCommand, performance.now() - tapStartMs, tapTotalMs);
        writeLine(tapCommand.slice(0, chars), true);
        if (chars >= tapCommand.length) tapCommand = null;
        return;
      }
      if (useTerminalFocusStore.getState().openProject !== null) return;

      if (depth < p.exitStart) {
        writeLine('less ', true);
      } else if (depth < p.exitExecute) {
        const chars = reduced ? EXIT_COMMAND.length : exitCharsTyped(depth, p);
        writeLine(EXIT_COMMAND.slice(0, chars), true);
      } else {
        // Executed: the line freezes in the scrollback; the farewell block's
        // bare cursor takes over the relay.
        writeLine(EXIT_COMMAND, false);
      }
    };

    const unsubscribeDepth = useDepthStore.subscribe((s) => s.depth, syncFromDepth, {
      fireImmediately: true,
    });

    if (variant === 'boot') return unsubscribeDepth;

    // gsap-ticker animator for the tap completion (time-driven, independent
    // of both scroll and the WebGL frameloop).
    const tick = (): void => {
      if (tapCommand === null) return;
      syncFromDepth(useDepthStore.getState().depth);
    };
    gsap.ticker.add(tick);

    const unsubscribeTap = subscribeTapEvents((e) => {
      if (e.kind !== 'complete') return;
      tapCommand = e.command;
      tapStartMs = performance.now();
      tapTotalMs = e.totalMs;
    });

    // Pager closed → hand the line back to the scroll clock.
    const unsubscribeFocus = useTerminalFocusStore.subscribe(
      (s) => s.openProject,
      (openProject) => {
        if (openProject === null) {
          tapCommand = null;
          syncFromDepth(useDepthStore.getState().depth);
        }
      },
    );

    return () => {
      unsubscribeDepth();
      unsubscribeTap();
      unsubscribeFocus();
      gsap.ticker.remove(tick);
    };
  }, [variant]);

  // §3.6 accelerator: pointer-only garnish (the line is aria-hidden and
  // never focusable — keyboard users scroll; swiping alone always plays
  // everything). Smooth-scroll to the beat's execute threshold; reduced
  // motion cuts instantly.
  const accelerate = (): void => {
    const depth = useDepthStore.getState().depth;
    const p = beatParams();
    let target: number | null = null;
    if (variant === 'boot' && depth >= p.flightStart && depth < p.bootExecute) {
      target = p.bootExecute + 0.002;
    } else if (variant === 'live' && depth >= p.exitStart && depth < p.exitExecute) {
      target = Math.min(p.exitExecute + 0.002, p.farewellHoldEnd);
    }
    if (target === null) return;
    const y = depthToScrollY(target);
    if (y === null) return;
    getLenis()?.scrollTo(y, { immediate: useMotionStore.getState().reduced });
  };

  if (variant === 'boot') {
    return (
      <div className="term-line term-line--prompt" aria-hidden="true" onClick={accelerate}>
        <span className="term-prompt-user">zara@macbook</span>
        <span className="term-prompt-cwd"> ~ </span>
        <span className="term-prompt-sigil">% </span>
        <span ref={cmdRef} className="term-cmd" />
        <span ref={cursorRef} className="term-cursor" />
      </div>
    );
  }

  // The live prompt prints LAST — one stagger step after the listing's
  // final row (the shell settles, then offers the next command).
  const p = beatParams();
  return (
    <div
      className="term-line term-line--prompt term-print"
      style={{ '--print-delay': `${p.outputPrintMs}ms` } as CSSProperties}
      aria-hidden="true"
      onClick={accelerate}
    >
      <span className="term-prompt-user">zara@macbook</span>
      <span className="term-prompt-cwd"> projects </span>
      <span className="term-prompt-sigil">% </span>
      <span ref={cmdRef} className="term-cmd" />
      <span ref={cursorRef} className="term-cursor" />
    </div>
  );
}
