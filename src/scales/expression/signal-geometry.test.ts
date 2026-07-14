// src/scales/expression/signal-geometry.test.ts
// resolveSignalOrigin is the single source of truth three consumers share
// (node, lines, camera focus) — these tests pin the custody-handoff
// contract: the authored anchor whenever there is no live cursor, the exact
// frozen cursor at the ease start, the exact authored anchor from the ease
// end onward, and a channel table whose bearings are unit-length and whose
// indices are stable.
import { describe, expect, it } from 'vitest';
import {
  AUTHORED_NODE_HEIGHT,
  AUTHORED_NODE_WIDTH,
  AUTHORED_SIGNAL_ORIGIN,
  ORIGIN_EASE_END,
  ORIGIN_EASE_START,
  SIGNAL_CHANNEL_DIRECTIONS,
  SIGNAL_CHANNEL_IDS,
  SIGNAL_LINE_LENGTH,
  channelIndexOf,
  originBlendT,
  resolveSignalOrigin,
  resolveSignalNodeSize,
  signalChannelTerminus,
} from './signal-geometry';

const FROZEN = {
  position: [-2.1, -35.2, -45.4] as const,
  width: 0.13,
  height: 0.21,
  active: true,
  version: 7,
};
const INACTIVE = { position: [0, 0, 0] as const, width: 0, height: 0, active: false, version: 8 };

describe('SIGNAL_CHANNEL_IDS / SIGNAL_CHANNEL_DIRECTIONS', () => {
  it('covers exactly the five links.json channels, in doc-register order', () => {
    expect(SIGNAL_CHANNEL_IDS).toEqual(['email', 'github', 'linkedin', 'bluesky', 'resume']);
  });

  it('channelIndexOf is a bijection over the channel list', () => {
    const indices = SIGNAL_CHANNEL_IDS.map((c) => channelIndexOf(c));
    expect(indices).toEqual([0, 1, 2, 3, 4]);
  });

  it('every bearing is unit-length', () => {
    for (const id of SIGNAL_CHANNEL_IDS) {
      const d = SIGNAL_CHANNEL_DIRECTIONS[id];
      expect(Math.hypot(d[0], d[1], d[2])).toBeCloseTo(1, 10);
    }
  });

  it('every pair of bearings is distinct (the fan never folds)', () => {
    for (let a = 0; a < SIGNAL_CHANNEL_IDS.length; a++) {
      for (let b = a + 1; b < SIGNAL_CHANNEL_IDS.length; b++) {
        const da = SIGNAL_CHANNEL_DIRECTIONS[SIGNAL_CHANNEL_IDS[a]!];
        const db = SIGNAL_CHANNEL_DIRECTIONS[SIGNAL_CHANNEL_IDS[b]!];
        const dot = da[0] * db[0] + da[1] * db[1] + da[2] * db[2];
        expect(dot).toBeLessThan(0.95);
      }
    }
  });
});

describe('resolveSignalOrigin', () => {
  it('returns the authored anchor when there is no live cursor', () => {
    expect(resolveSignalOrigin(0.9, INACTIVE)).toEqual(AUTHORED_SIGNAL_ORIGIN);
    expect(resolveSignalOrigin(ORIGIN_EASE_START, INACTIVE)).toEqual(AUTHORED_SIGNAL_ORIGIN);
  });

  it('adopts the frozen cursor exactly at the ease start (the custody crossing)', () => {
    const o = resolveSignalOrigin(ORIGIN_EASE_START, FROZEN);
    expect(o[0]).toBeCloseTo(FROZEN.position[0], 12);
    expect(o[1]).toBeCloseTo(FROZEN.position[1], 12);
    expect(o[2]).toBeCloseTo(FROZEN.position[2], 12);
  });

  it('sits exactly on the authored anchor from the ease end onward', () => {
    for (const d of [ORIGIN_EASE_END, 0.92, 1]) {
      const o = resolveSignalOrigin(d, FROZEN);
      expect(o[0]).toBeCloseTo(AUTHORED_SIGNAL_ORIGIN[0], 12);
      expect(o[1]).toBeCloseTo(AUTHORED_SIGNAL_ORIGIN[1], 12);
      expect(o[2]).toBeCloseTo(AUTHORED_SIGNAL_ORIGIN[2], 12);
    }
  });

  it('eases monotonically between the two (per axis, no overshoot)', () => {
    for (let d = ORIGIN_EASE_START; d <= ORIGIN_EASE_END + 1e-9; d += 0.001) {
      const o = resolveSignalOrigin(d, FROZEN);
      for (let ax = 0; ax < 3; ax++) {
        const lo = Math.min(FROZEN.position[ax]!, AUTHORED_SIGNAL_ORIGIN[ax]!);
        const hi = Math.max(FROZEN.position[ax]!, AUTHORED_SIGNAL_ORIGIN[ax]!);
        expect(o[ax]!).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(o[ax]!).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
    expect(originBlendT(ORIGIN_EASE_START)).toBe(0);
    expect(originBlendT(ORIGIN_EASE_END)).toBe(1);
  });
});

describe('resolveSignalNodeSize', () => {
  it('adopts the frozen cell exactly at the crossing and the authored size at the ease end', () => {
    const start = resolveSignalNodeSize(ORIGIN_EASE_START, FROZEN);
    expect(start.width).toBeCloseTo(FROZEN.width, 12);
    expect(start.height).toBeCloseTo(FROZEN.height, 12);
    const end = resolveSignalNodeSize(ORIGIN_EASE_END, FROZEN);
    expect(end.width).toBeCloseTo(AUTHORED_NODE_WIDTH, 12);
    expect(end.height).toBeCloseTo(AUTHORED_NODE_HEIGHT, 12);
  });

  it('falls back to the authored size with no live cursor (or a degenerate cell)', () => {
    expect(resolveSignalNodeSize(0.9, INACTIVE)).toEqual({
      width: AUTHORED_NODE_WIDTH,
      height: AUTHORED_NODE_HEIGHT,
    });
  });
});

describe('signalChannelTerminus', () => {
  it('sits exactly one line-length from the origin along the bearing', () => {
    for (const id of SIGNAL_CHANNEL_IDS) {
      const t = signalChannelTerminus(AUTHORED_SIGNAL_ORIGIN, id);
      const d = Math.hypot(
        t[0] - AUTHORED_SIGNAL_ORIGIN[0],
        t[1] - AUTHORED_SIGNAL_ORIGIN[1],
        t[2] - AUTHORED_SIGNAL_ORIGIN[2],
      );
      expect(d).toBeCloseTo(SIGNAL_LINE_LENGTH, 10);
    }
  });
});
