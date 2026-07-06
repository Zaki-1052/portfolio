// src/scales/cellular/arbor-anchors.test.ts
// The anchors are the single source of truth shared by the floating cards,
// the focus poses, and the hover markers — if they drift from the rendered
// tree (wrong offset, degenerate tips) every 4.4 interaction breaks at once.
import { describe, expect, it } from 'vitest';
import { ARBOR_ORIGIN } from './arbor-params';
import { getBranchAnchors, computeBranchAnchors } from './arbor-anchors';

const LIMBS = [0, 1, 2] as const;

describe('branch anchors', () => {
  it('is deterministic and matches the memoized getter', () => {
    expect(computeBranchAnchors()).toEqual(computeBranchAnchors());
    expect(getBranchAnchors()).toEqual(computeBranchAnchors());
  });

  it('yields three spatially distinct anchors', () => {
    const anchors = getBranchAnchors();
    for (let a = 0; a < LIMBS.length; a++) {
      for (let b = a + 1; b < LIMBS.length; b++) {
        const pa = anchors[LIMBS[a]!];
        const pb = anchors[LIMBS[b]!];
        const d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
        expect(d).toBeGreaterThan(3);
      }
    }
  });

  it('sits in the canopy: above the root, within the tree bounding sphere', () => {
    const anchors = getBranchAnchors();
    for (const limb of LIMBS) {
      const p = anchors[limb];
      // Tips grow upward from the origin (trunk + rising limbs).
      expect(p[1]).toBeGreaterThan(ARBOR_ORIGIN[1] + 2);
      const d = Math.hypot(p[0] - ARBOR_ORIGIN[0], p[1] - ARBOR_ORIGIN[1], p[2] - ARBOR_ORIGIN[2]);
      // Never further than trunk + limb + full strand run.
      expect(d).toBeLessThan(45);
    }
  });
});
