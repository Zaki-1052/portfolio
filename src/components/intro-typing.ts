// src/components/intro-typing.ts
// Deterministic typing math for the overture: given the raw lines and an
// elapsed time, returns exactly what should be visible. Pure — the rendering
// component stays a dumb projector of this snapshot, and the math is
// unit-tested in isolation (the vitest node environment forbids DOM tests).

export const CHAR_MS = 26;
export const LINE_PAUSE_MS = 340;

export interface TypingSnapshot {
  /** Visible prefix of each input line (always the same length as the input). */
  lines: string[];
  /** Index of the line currently being typed (the cursor's line). */
  activeLine: number;
  done: boolean;
}

export function visibleTextAt(
  lines: readonly string[],
  elapsedMs: number,
  charMs = CHAR_MS,
  linePauseMs = LINE_PAUSE_MS,
): TypingSnapshot {
  const visible: string[] = [];
  let start = 0;
  let activeLine = 0;
  let done = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineDuration = line.length * charMs;
    const into = elapsedMs - start;
    const chars = Math.max(0, Math.min(line.length, Math.floor(into / charMs)));
    visible.push(line.slice(0, chars));
    if (done && chars < line.length) {
      activeLine = i;
      done = false;
    }
    start += lineDuration + linePauseMs;
  }

  if (done) activeLine = Math.max(0, lines.length - 1);
  return { lines: visible, activeLine, done };
}
