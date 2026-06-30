// src/hooks/useGlitchCycle.ts
import { useState, useEffect, useRef } from 'react';

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';

interface GlitchCycleOptions {
  holdMs?: number;
  scramblMs?: number;
  resolveMs?: number;
}

export function useGlitchCycle(
  items: string[],
  { holdMs = 3000, scramblMs = 600, resolveMs = 400 }: GlitchCycleOptions = {},
): string {
  const [display, setDisplay] = useState(items[0]);
  const indexRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (items.length < 2) return;

    function randomChar() {
      return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
    }

    function scrambleResolve(from: string, to: string) {
      const maxLen = Math.max(from.length, to.length);
      const padded = to.padEnd(maxLen);
      const totalMs = scramblMs + resolveMs;
      const start = performance.now();

      function tick() {
        const elapsed = performance.now() - start;
        if (elapsed >= totalMs) {
          setDisplay(to);
          return;
        }

        let result = '';
        for (let i = 0; i < maxLen; i++) {
          const charProgress = elapsed / totalMs;
          const charThreshold = i / maxLen;

          if (charProgress > charThreshold + 0.3) {
            result += padded[i];
          } else {
            result += randomChar();
          }
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
        scrambleResolve(items[prevIndex], items[indexRef.current]);
      },
      holdMs + scramblMs + resolveMs,
    );

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(rafRef.current);
    };
  }, [items, holdMs, scramblMs, resolveMs]);

  return display;
}
