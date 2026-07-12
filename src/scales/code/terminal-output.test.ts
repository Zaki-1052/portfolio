// src/scales/code/terminal-output.test.ts
// The event clock's contract: output never scrubs — it prints forward on a
// fast timer, saturates, and collapses to instant under reduced motion
// (totalMs 0). The component layer derives everything from these snapshots.
import { describe, expect, it } from 'vitest';
import { outputRevealAt, tapCommandCharsAt } from './terminal-output';

describe('outputRevealAt', () => {
  it('reveals nothing before the print starts', () => {
    expect(outputRevealAt(8, -1, 300)).toBe(0);
    expect(outputRevealAt(8, 0, 300)).toBe(0);
  });

  it('lands the first line on the first tick and the last exactly at totalMs', () => {
    expect(outputRevealAt(8, 1, 300)).toBe(1);
    expect(outputRevealAt(8, 300, 300)).toBe(8);
  });

  it('saturates past the print duration', () => {
    expect(outputRevealAt(8, 301, 300)).toBe(8);
    expect(outputRevealAt(8, 10_000, 300)).toBe(8);
  });

  it('is monotonic non-decreasing across a dense sweep', () => {
    let prev = 0;
    for (let ms = 0; ms <= 400; ms += 1) {
      const lines = outputRevealAt(8, ms, 300);
      expect(lines).toBeGreaterThanOrEqual(prev);
      expect(lines).toBeLessThanOrEqual(8);
      prev = lines;
    }
  });

  it('prints instantly when totalMs is zero (the reduced-motion path)', () => {
    expect(outputRevealAt(8, 0, 0)).toBe(8);
    expect(outputRevealAt(8, 0, -1)).toBe(8);
  });

  it('handles an empty print', () => {
    expect(outputRevealAt(0, 100, 300)).toBe(0);
  });
});

describe('tapCommandCharsAt', () => {
  const COMMAND = 'less cleave/README.md';

  it('completes the whole command exactly at the tap duration', () => {
    expect(tapCommandCharsAt(COMMAND, 0, 220)).toBe(0);
    expect(tapCommandCharsAt(COMMAND, 220, 220)).toBe(COMMAND.length);
    expect(tapCommandCharsAt(COMMAND, 500, 220)).toBe(COMMAND.length);
  });

  it('reveals characters monotonically', () => {
    let prev = 0;
    for (let ms = 0; ms <= 260; ms += 1) {
      const chars = tapCommandCharsAt(COMMAND, ms, 220);
      expect(chars).toBeGreaterThanOrEqual(prev);
      prev = chars;
    }
  });
});
