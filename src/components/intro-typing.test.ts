// src/components/intro-typing.test.ts
import { describe, it, expect } from 'vitest';
import { visibleTextAt } from './intro-typing';

const LINES = ['abc', 'de'] as const;
const CHAR = 10;
const PAUSE = 100;
// Line 0: chars at t=10,20,30 · pause until 130 · line 1: chars at 140,150.
const TOTAL = 3 * CHAR + PAUSE + 2 * CHAR;

describe('visibleTextAt', () => {
  it('shows nothing at t=0 and everything past the total duration', () => {
    const start = visibleTextAt(LINES, 0, CHAR, PAUSE);
    expect(start.lines).toEqual(['', '']);
    expect(start.done).toBe(false);
    expect(start.activeLine).toBe(0);

    const end = visibleTextAt(LINES, TOTAL + 1, CHAR, PAUSE);
    expect(end.lines).toEqual(['abc', 'de']);
    expect(end.done).toBe(true);
    expect(end.activeLine).toBe(1);
  });

  it('types characters at exact charMs steps', () => {
    expect(visibleTextAt(LINES, CHAR, CHAR, PAUSE).lines[0]).toBe('a');
    expect(visibleTextAt(LINES, 2 * CHAR, CHAR, PAUSE).lines[0]).toBe('ab');
    expect(visibleTextAt(LINES, 3 * CHAR, CHAR, PAUSE).lines[0]).toBe('abc');
  });

  it('holds the pause between lines before the next line starts', () => {
    // Line 0 complete at 30; line 1's first char lands at 30 + 100 + 10 = 140.
    const duringPause = visibleTextAt(LINES, 3 * CHAR + PAUSE - 1, CHAR, PAUSE);
    expect(duringPause.lines).toEqual(['abc', '']);
    expect(duringPause.activeLine).toBe(1);
    expect(duringPause.done).toBe(false);

    const firstChar = visibleTextAt(LINES, 3 * CHAR + PAUSE + CHAR, CHAR, PAUSE);
    expect(firstChar.lines).toEqual(['abc', 'd']);
  });

  it('is monotonic: visible text only ever grows', () => {
    let prev = 0;
    for (let t = 0; t <= TOTAL + 50; t += 3) {
      const total = visibleTextAt(LINES, t, CHAR, PAUSE).lines.join('').length;
      expect(total).toBeGreaterThanOrEqual(prev);
      prev = total;
    }
  });

  it('handles empty input and negative time', () => {
    expect(visibleTextAt([], 500).done).toBe(true);
    const early = visibleTextAt(LINES, -100, CHAR, PAUSE);
    expect(early.lines).toEqual(['', '']);
    expect(early.done).toBe(false);
  });
});
