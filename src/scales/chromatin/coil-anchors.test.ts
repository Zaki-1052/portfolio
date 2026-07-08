// src/scales/chromatin/coil-anchors.test.ts
// The anchors are the single source of truth shared by the floating
// publication cards and the region focus poses — if they drift from the
// rendered cluster (wrong offset, degenerate centroids) every 5.4
// interaction breaks at once.
import { describe, expect, it } from 'vitest';
import { COIL_ORIGIN } from './coil-params';
import { computeRegionAnchors, getRegionAnchors } from './coil-anchors';

const REGIONS = [0, 1] as const;

const dist = (a: readonly number[], b: readonly number[]): number =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

describe('region anchors', () => {
  it('is deterministic and matches the memoized getter', () => {
    expect(computeRegionAnchors()).toEqual(computeRegionAnchors());
    expect(getRegionAnchors()).toEqual(computeRegionAnchors());
  });

  it('yields two spatially distinct compact anchors', () => {
    const { compact } = getRegionAnchors();
    expect(dist(compact[0], compact[1])).toBeGreaterThan(3);
  });

  it('sits near the cluster: every anchor within the open-arc reach of the origin', () => {
    const { compact, open } = getRegionAnchors();
    for (const r of REGIONS) {
      // Compact anchors live on the packed cluster (radius ~2.8 + jitter).
      expect(dist(compact[r], COIL_ORIGIN)).toBeLessThan(6);
      // Open centroids stay inside the unwound arc's reach (3× radius + spread).
      expect(dist(open[r], COIL_ORIGIN)).toBeLessThan(14);
    }
  });

  it('moves the open anchor away from the compact one (the unwind travels)', () => {
    const { compact, open } = getRegionAnchors();
    for (const r of REGIONS) {
      expect(dist(compact[r], open[r])).toBeGreaterThan(1.5);
    }
  });
});
