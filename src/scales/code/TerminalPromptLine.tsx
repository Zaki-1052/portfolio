// src/scales/code/TerminalPromptLine.tsx
// The two prompt lines. All three of the terminal's text clocks meet here:
//   · SCROLL — commands scrub: boot types `cd projects && ls -laht` across
//     its beat, the live prompt scrubs `exit` across the exit beat; both
//     freeze mid-word at scroll rest and backspace on rewind.
//   · TIME — a card-opening tap completes the pending `less <id>/README.md`
//     at real-terminal speed before the card opens; SWITCHING cards
//     backspaces the old command to the bare `less ` and retypes (honest
//     terminal editing — the delete source is the line's CURRENT text, so
//     even an interrupted switch animates from what's visible). While a
//     card is open the completed command holds under the split.
//   · The accelerator (§3.6, pointer-only garnish): tapping a mid-scrub
//     command smooth-scrolls Lenis to that beat's execute threshold.
// Text is written imperatively from a depth-store subscription (no React
// churn at scroll rate). Scrub lines are decorative to AT (aria-hidden) —
// the listing and cards are the accessible interface.
import { useEffect, useRef, type CSSProperties } from 'react';
import { gsap } from 'gsap';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { useTerminalFocusStore } from '@/stores/terminal-focus';
import { depthToScrollY, getLenis } from '@/engine/scroll-engine';
import { getTerminalIdentity } from '@/content/loader';
import {
  BOOT_COMMAND,
  EXIT_COMMAND,
  TERMINAL_BEAT_DEFAULTS,
  bootCharsTyped,
  exitCharsTyped,
  liveTerminalBeatParams,
  type TerminalBeatParams,
} from './terminal-beats';
import { outputRevealAt } from './terminal-output';
import { commandForId, subscribeTapEvents } from './terminal-actions';

function beatParams(): TerminalBeatParams {
  return import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;
}

/** The pending prompt every completion grows from / deletes back to. */
const PROMPT_BASE = 'less ';

interface TerminalPromptLineProps {
  variant: 'boot' | 'live';
}

interface TapAnimation {
  command: string;
  /** The line's text at animation start — the backspace source. */
  deleteFrom: string;
  deleteMs: number;
  typeMs: number;
  startMs: number;
}

export function TerminalPromptLine({ variant }: TerminalPromptLineProps) {
  const cmdRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cmd = cmdRef.current;
    const cursor = cursorRef.current;
    if (!cmd || !cursor) return undefined;

    let anim: TapAnimation | null = null;

    const writeLine = (text: string, cursorOn: boolean): void => {
      if (cmd.textContent !== text) cmd.textContent = text;
      const display = cursorOn ? '' : 'none';
      if (cursor.style.display !== display) cursor.style.display = display;
    };

    const syncFromDepth = (depth: number): void => {
      const p = beatParams();
      const reduced = useMotionStore.getState().reduced;

      if (variant === 'boot') {
        // Reduced motion: no scrub — the command appears fully typed the
        // moment its beat begins (§3.11).
        const chars = reduced
          ? depth >= p.bootStart
            ? BOOT_COMMAND.length
            : 0
          : bootCharsTyped(depth, p);
        writeLine(BOOT_COMMAND.slice(0, chars), depth < p.bootExecute);
        return;
      }

      // The live prompt: the tap clock outranks everything (it also covers
      // the gap between typing landing and the card actually opening), and
      // an open card holds the completed command under the split.
      if (anim !== null) {
        const t = performance.now() - anim.startMs;
        if (t < anim.deleteMs && anim.deleteFrom.length > PROMPT_BASE.length) {
          const extra = anim.deleteFrom.length - PROMPT_BASE.length;
          const removed = Math.min(extra, Math.floor((t / anim.deleteMs) * extra));
          writeLine(anim.deleteFrom.slice(0, anim.deleteFrom.length - removed), true);
        } else {
          const sinceType = t - anim.deleteMs;
          const typed = outputRevealAt(
            anim.command.length - PROMPT_BASE.length,
            sinceType,
            anim.typeMs,
          );
          writeLine(anim.command.slice(0, PROMPT_BASE.length + typed), true);
        }
        return;
      }
      if (useTerminalFocusStore.getState().openProject !== null) return;

      if (depth < p.exitStart) {
        writeLine(PROMPT_BASE, true);
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

    // gsap-ticker animator for the delete/retype completion (time-driven,
    // independent of both scroll and the WebGL frameloop).
    const tick = (): void => {
      if (anim === null) return;
      syncFromDepth(useDepthStore.getState().depth);
    };
    gsap.ticker.add(tick);

    const unsubscribeTap = subscribeTapEvents((e) => {
      if (e.kind !== 'complete') return;
      anim = {
        command: e.command,
        deleteFrom: cmd.textContent ?? PROMPT_BASE,
        deleteMs: e.deleteMs,
        typeMs: e.typeMs,
        startMs: performance.now(),
      };
      syncFromDepth(useDepthStore.getState().depth);
    });

    // Card opened → the animation's job is done; write the completed command
    // outright (a no-op after a full animation, and the instant path for
    // reduced motion, where no animation ran). Card closed → hand the line
    // back to the scroll clock.
    const unsubscribeFocus = useTerminalFocusStore.subscribe(
      (s) => s.openProject,
      (openProject) => {
        anim = null;
        if (openProject === null) syncFromDepth(useDepthStore.getState().depth);
        else writeLine(commandForId(openProject), true);
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

  // Session identity is content, not code (content/terminal.json).
  const identity = getTerminalIdentity();

  if (variant === 'boot') {
    return (
      <div className="term-line term-line--prompt" aria-hidden="true" onClick={accelerate}>
        <span className="term-prompt-user">{`${identity.user}@${identity.host}`}</span>
        <span className="term-prompt-cwd"> ~ </span>
        <span className="term-prompt-sigil">% </span>
        <span ref={cmdRef} className="term-cmd" />
        <span ref={cursorRef} className="term-cursor" />
      </div>
    );
  }

  // The live prompt prints a clear beat AFTER the listing lands (the shell
  // settles, then offers the next command; the chips follow it).
  const p = beatParams();
  return (
    <div
      className="term-line term-line--prompt term-print"
      style={{ '--print-delay': `${p.outputPrintMs + 200}ms` } as CSSProperties}
      aria-hidden="true"
      onClick={accelerate}
    >
      <span className="term-prompt-user">{`${identity.user}@${identity.host}`}</span>
      <span className="term-prompt-cwd">{` ${identity.projectsDir} `}</span>
      <span className="term-prompt-sigil">% </span>
      <span ref={cmdRef} className="term-cmd" />
      <span ref={cursorRef} className="term-cursor" />
    </div>
  );
}
