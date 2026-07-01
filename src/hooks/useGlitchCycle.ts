// src/hooks/useGlitchCycle.ts
import { useState, useEffect, useRef } from 'react';

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';

interface GlitchCycleOptions {
  holdMs?: number;
  scrambleMs?: number;
  resolveMs?: number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Cycles a headline word through a scramble-and-resolve "glitch" reveal.
 * Holds each item, then scrambles into the next on a loop.
 * Respects prefers-reduced-motion by holding the first item statically.
 */
export function useGlitchCycle(
  items: string[],
  { holdMs = 3000, scrambleMs = 600, resolveMs = 400 }: GlitchCycleOptions = {},
): string {
  const [display, setDisplay] = useState<string>(items[0] ?? '');
  const indexRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (items.length < 2) return;

    // Reduced-motion: hold the first role, no scramble, no cycle.
    if (prefersReducedMotion()) {
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
  }, [items, holdMs, scrambleMs, resolveMs]);

  return display;
}
