// src/scales/expression/signal-pulse.test.ts
// The event clock's pulse math: unfired means exactly zero, progress is
// monotonic in elapsed time, saturates at exactly one, and a non-positive
// duration is the reduced-motion instant path.
import { describe, expect, it } from 'vitest';
import { eventPulseProgress } from './signal-pulse';

describe('eventPulseProgress', () => {
  it('is exactly zero while unfired (null stamp)', () => {
    expect(eventPulseProgress(null, 123456, 900)).toBe(0);
  });

  it('is zero before the stamp (a future stamp never runs backward)', () => {
    expect(eventPulseProgress(1000, 999, 900)).toBe(0);
  });

  it('progresses monotonically and saturates at exactly one', () => {
    let prev = 0;
    for (let elapsed = 0; elapsed <= 2000; elapsed += 50) {
      const t = eventPulseProgress(1000, 1000 + elapsed, 900);
      expect(t).toBeGreaterThanOrEqual(prev);
      expect(t).toBeLessThanOrEqual(1);
      prev = t;
    }
    expect(eventPulseProgress(1000, 1900, 900)).toBe(1);
    expect(eventPulseProgress(1000, 5000, 900)).toBe(1);
  });

  it('lands instantly when duration is non-positive (reduced motion)', () => {
    expect(eventPulseProgress(1000, 1000, 0)).toBe(1);
    expect(eventPulseProgress(1000, 1001, -5)).toBe(1);
  });
});
