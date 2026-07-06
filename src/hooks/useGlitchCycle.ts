// src/hooks/useGlitchCycle.ts
import { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';

interface GlitchCycleOptions {
  holdMs?: number;
  scrambleMs?: number;
  resolveMs?: number;
  enabled?: boolean;
}

/**
 * Cycles a headline word through a scramble-and-resolve "glitch" reveal.
 * Holds each item, then scrambles into the next on a loop.
 * Respects reduced motion (OS pref or on-page toggle, live) by holding the
 * first item statically — flipping the toggle mid-cycle snaps it to rest.
 * `enabled` (default true) lets the caller pause the loop when the headline is
 * off-screen: while false it holds the first item and runs no timers/rAF, so a
 * scrolled-away hero stops re-rendering; re-enabling restarts from the top.
 */
export function useGlitchCycle(
  items: string[],
  { holdMs = 3000, scrambleMs = 600, resolveMs = 400, enabled = true }: GlitchCycleOptions = {},
): string {
  const [display, setDisplay] = useState<string>(items[0] ?? '');
  const indexRef = useRef(0);
  const rafRef = useRef<number>(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    // Reduced motion, nothing to cycle, or paused while off-screen: hold the
    // first item, no scramble or timers. Any of these flipping mid-cycle snaps
    // to rest (the cleanup below has already cleared a running scramble).
    if (items.length < 2 || reduced || !enabled) {
      indexRef.current = 0;
      setDisplay(items[0] ?? '');
      return;
    }

    function randomChar(): string {
      return GLITCH_CHARS.charAt(Math.floor(Math.random() * GLITCH_CHARS.length));
    }

    function scrambleResolve(from: string, to: string) {
      const maxLen = Math.max(from.length, to.length);
      const padded = to.padEnd(maxLen);
      const totalMs = scrambleMs + resolveMs;
      const start = performance.now();

      function tick() {
        const elapsed = performance.now() - start;
        if (elapsed >= totalMs) {
          setDisplay(to);
          return;
        }

        const charProgress = elapsed / totalMs;
        let result = '';
        for (let i = 0; i < maxLen; i++) {
          const charThreshold = i / maxLen;
          result += charProgress > charThreshold + 0.3 ? padded.charAt(i) : randomChar();
        }
        setDisplay(result.trimEnd());
        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    const interval = setInterval(
      () => {
        const prevIndex = indexRef.current;
        indexRef.current = (indexRef.current + 1) % items.length;
        scrambleResolve(items[prevIndex] ?? '', items[indexRef.current] ?? '');
      },
      holdMs + scrambleMs + resolveMs,
    );

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(rafRef.current);
    };
  }, [items, holdMs, scrambleMs, resolveMs, reduced, enabled]);

  return display;
}
