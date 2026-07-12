// src/scales/code/terminal-output.ts
// Time-driven reveal math for the terminal's EVENT clock: output that prints
// once a command's execute threshold is crossed (the listing, the farewell)
// and tap-response commands that complete themselves at real-terminal speed.
// Deterministic snapshots of (count, elapsed) — the rendering layer stays a
// dumb projector of these values (the intro-typing.ts precedent). Pure —
// unit-tested in isolation.
import { clamp } from '@/utils/math';

/**
 * Lines visible `elapsedMs` into an output print that reveals `lineCount`
 * lines across `totalMs`. The first line lands on the first tick and the
 * last exactly at totalMs — the fast shell dump, never a slow crawl.
 * Saturates at lineCount; totalMs ≤ 0 is the reduced-motion instant path.
 */
export function outputRevealAt(lineCount: number, elapsedMs: number, totalMs: number): number {
  if (lineCount <= 0) return 0;
  if (elapsedMs < 0) return 0;
  if (totalMs <= 0) return lineCount;
  return clamp(Math.ceil((elapsedMs / totalMs) * lineCount), 0, lineCount);
}

/**
 * Characters of a tap-response command visible `elapsedMs` after the tap —
 * `less cleave/README.md` filling itself in at terminal speed. Same reveal
 * math as output lines, per character.
 */
export function tapCommandCharsAt(command: string, elapsedMs: number, totalMs: number): number {
  return outputRevealAt(command.length, elapsedMs, totalMs);
}
