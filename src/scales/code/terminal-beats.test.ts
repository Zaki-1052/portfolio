// src/scales/code/terminal-beats.test.ts
// The beat math is the single source of truth for everything the terminal
// does on the scroll clock — the window mesh, the HTML gate, the prompt
// scrub, and the execute thresholds all key off it. These tests pin the
// contracts the composition depends on: exact beat boundaries, monotonic /
// saturating / depth-pure character scrubs, and a pose phase that is EXACTLY
// 0 outside the band and EXACTLY 1 across the locked plateau.
import { describe, expect, it } from 'vitest';
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import {
  BOOT_COMMAND,
  EXIT_COMMAND,
  FAREWELL_LINES,
  SCRUB_COMPLETE_FRACTION,
  TERMINAL_BEAT_DEFAULTS,
  WINDOW_FADE_IN_SPAN,
  bootCharsTyped,
  exitCharsTyped,
  liveTerminalBeatParams,
  terminalBeatFor,
  windowOpacityFor,
  windowPosePhase,
} from './terminal-beats';

const P = TERMINAL_BEAT_DEFAULTS;

describe('TERMINAL_BEAT_DEFAULTS', () => {
  it('spans exactly the code band', () => {
    expect(P.flightStart).toBe(SCALE_BOUNDARIES[5]);
    expect(P.dissolveEnd).toBe(SCALE_BOUNDARIES[6]);
  });

  it('orders every beat depth strictly', () => {
    const depths = [
      P.flightStart,
      P.bootStart,
      P.bootExecute,
      P.exitStart,
      P.exitExecute,
      P.farewellHoldEnd,
      P.dissolveEnd,
    ];
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i]).toBeGreaterThan(depths[i - 1]!);
    }
  });

  it('keeps the event-clock durations positive', () => {
    expect(P.outputPrintMs).toBeGreaterThan(0);
    expect(P.tapCompleteMs).toBeGreaterThan(0);
  });

  it('is frozen; the live copy starts identical but is a distinct object', () => {
    expect(Object.isFrozen(TERMINAL_BEAT_DEFAULTS)).toBe(true);
    expect(liveTerminalBeatParams).not.toBe(TERMINAL_BEAT_DEFAULTS);
    expect(liveTerminalBeatParams).toEqual(TERMINAL_BEAT_DEFAULTS);
    const saved = liveTerminalBeatParams.bootStart;
    liveTerminalBeatParams.bootStart = 0.9;
    expect(TERMINAL_BEAT_DEFAULTS.bootStart).toBe(saved);
    liveTerminalBeatParams.bootStart = saved;
  });
});

describe('terminalBeatFor', () => {
  it('assigns each threshold to the beat it begins', () => {
    expect(terminalBeatFor(0.7)).toBe('before');
    expect(terminalBeatFor(P.flightStart)).toBe('flight');
    expect(terminalBeatFor(P.bootStart)).toBe('boot');
    expect(terminalBeatFor(P.bootExecute)).toBe('plateau');
    expect(terminalBeatFor(P.exitStart)).toBe('exit');
    expect(terminalBeatFor(P.exitExecute)).toBe('farewell');
    expect(terminalBeatFor(P.farewellHoldEnd)).toBe('dissolve');
    expect(terminalBeatFor(P.dissolveEnd)).toBe('after');
    expect(terminalBeatFor(1)).toBe('after');
  });

  it('honors a custom params object (the dev-panel path)', () => {
    const shifted = { ...P, flightStart: 0.4, bootStart: 0.5, bootExecute: 0.6 };
    expect(terminalBeatFor(0.55, shifted)).toBe('boot');
    expect(bootCharsTyped(0.6, shifted)).toBe(BOOT_COMMAND.length);
  });
});

describe('command scrubs', () => {
  it('boot: zero at and below the beat start', () => {
    for (const d of [0, 0.7, P.flightStart, P.bootStart]) {
      expect(bootCharsTyped(d)).toBe(0);
    }
  });

  it('boot: the full command sits under the cursor BEFORE the execute crossing', () => {
    const completeAt = P.bootStart + (P.bootExecute - P.bootStart) * SCRUB_COMPLETE_FRACTION;
    expect(completeAt).toBeLessThan(P.bootExecute);
    expect(bootCharsTyped(completeAt)).toBe(BOOT_COMMAND.length);
  });

  it('boot: saturates at the full command from the execute threshold onward', () => {
    for (const d of [P.bootExecute, 0.8, P.dissolveEnd, 1]) {
      expect(bootCharsTyped(d)).toBe(BOOT_COMMAND.length);
    }
  });

  it('boot: monotonic non-decreasing across a dense sweep', () => {
    let prev = 0;
    for (let d = P.bootStart; d <= P.bootExecute + 1e-9; d += 0.0002) {
      const chars = bootCharsTyped(d);
      expect(chars).toBeGreaterThanOrEqual(prev);
      expect(chars).toBeLessThanOrEqual(BOOT_COMMAND.length);
      prev = chars;
    }
  });

  it('boot: a pure function of depth — scrolling back re-derives the backspaced state', () => {
    const mid = (P.bootStart + P.bootExecute) / 2;
    const before = bootCharsTyped(mid);
    bootCharsTyped(P.bootExecute); // scrub past…
    expect(bootCharsTyped(mid)).toBe(before); // …and back
    expect(before).toBeGreaterThan(0);
    expect(before).toBeLessThan(BOOT_COMMAND.length);
  });

  it('exit: zero through the plateau, complete by its execute threshold', () => {
    for (const d of [P.bootExecute, 0.8, P.exitStart]) {
      expect(exitCharsTyped(d)).toBe(0);
    }
    expect(exitCharsTyped(P.exitExecute)).toBe(EXIT_COMMAND.length);
    expect(exitCharsTyped(1)).toBe(EXIT_COMMAND.length);
  });
});

describe('windowPosePhase', () => {
  it('is exactly zero at and outside the band edges', () => {
    for (const d of [0, 0.5, 0.7, P.flightStart, P.dissolveEnd, 0.9, 1]) {
      expect(windowPosePhase(d)).toBe(0);
    }
  });

  it('holds exactly 1 from the boot beat through the farewell hold', () => {
    for (const d of [P.bootStart, P.bootExecute, 0.78, P.exitStart, P.exitExecute, 0.848]) {
      expect(windowPosePhase(d)).toBe(1);
    }
  });

  it('rises monotonically through the flight and falls monotonically through the dissolve', () => {
    let prev = 0;
    for (let d = P.flightStart; d <= P.bootStart + 1e-9; d += 0.0005) {
      const phase = windowPosePhase(d);
      expect(phase).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = phase;
    }
    prev = 1;
    for (let d = P.farewellHoldEnd; d <= P.dissolveEnd + 1e-9; d += 0.0005) {
      const phase = windowPosePhase(d);
      expect(phase).toBeLessThanOrEqual(prev + 1e-12);
      prev = phase;
    }
  });

  it('stays inside [0, 1] everywhere', () => {
    for (let d = 0; d <= 1 + 1e-9; d += 0.001) {
      const phase = windowPosePhase(d);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThanOrEqual(1);
    }
  });
});

describe('windowOpacityFor', () => {
  it('is exactly zero at and outside the band edges', () => {
    for (const d of [0, 0.7, P.flightStart, P.dissolveEnd, 0.9, 1]) {
      expect(windowOpacityFor(d)).toBe(0);
    }
  });

  it('holds exactly 1 through the whole session (fade-in end → farewell hold)', () => {
    for (const d of [
      P.flightStart + WINDOW_FADE_IN_SPAN,
      0.73,
      P.bootExecute,
      0.8,
      P.farewellHoldEnd,
    ]) {
      expect(windowOpacityFor(d)).toBe(1);
    }
  });

  it('dissolves in step with the receding pose (both zero at dissolveEnd)', () => {
    const mid = (P.farewellHoldEnd + P.dissolveEnd) / 2;
    expect(windowOpacityFor(mid)).toBeGreaterThan(0);
    expect(windowOpacityFor(mid)).toBeLessThan(1);
    expect(windowOpacityFor(P.dissolveEnd)).toBe(0);
    expect(windowPosePhase(P.dissolveEnd)).toBe(0);
  });
});

describe('session script', () => {
  it('boots with an honest working directory and exits with the authentic farewell', () => {
    expect(BOOT_COMMAND).toBe('cd projects && ls -la');
    expect(EXIT_COMMAND).toBe('exit');
    expect(FAREWELL_LINES).toEqual(['logout', 'Saving session ...completed.']);
  });
});
