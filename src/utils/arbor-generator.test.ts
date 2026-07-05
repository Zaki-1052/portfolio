// src/utils/arbor-generator.test.ts
// The branching generator is pure and seeded — every structural invariant the
// geometry builders and card anchors rely on is asserted here, so a parameter
// tweak that silently breaks the tree (orphan nodes, radius inversions, an
// exploding recursion) fails in CI instead of rendering garbage.
import { describe, expect, it } from 'vitest';
import {
  ARBOR_GROWTH_DEFAULTS,
  generateArbor,
  limbTipNode,
  type ArborNode,
} from './arbor-generator';

const LIMBS = [0, 1, 2] as const;

function nodesOf(params = ARBOR_GROWTH_DEFAULTS): ArborNode[] {
  return generateArbor(params);
}

describe('generateArbor — structure', () => {
  it('has exactly one root (index 0, parent -1) and valid parent links', () => {
    const nodes = nodesOf();
    expect(nodes[0]!.parent).toBe(-1);
    for (let i = 1; i < nodes.length; i++) {
      const p = nodes[i]!.parent;
      expect(p).toBeGreaterThanOrEqual(0);
      // Parents always precede children — the geometry sweep relies on it.
      expect(p).toBeLessThan(i);
    }
  });

  it('every node walks up to the root without cycles', () => {
    const nodes = nodesOf();
    for (let i = 0; i < nodes.length; i++) {
      let cursor = i;
      let hops = 0;
      while (nodes[cursor]!.parent !== -1) {
        cursor = nodes[cursor]!.parent;
        hops++;
        expect(hops).toBeLessThan(nodes.length);
      }
      expect(cursor).toBe(0);
    }
  });

  it('radius never increases from parent to child', () => {
    const nodes = nodesOf();
    for (let i = 1; i < nodes.length; i++) {
      const parent = nodes[nodes[i]!.parent]!;
      expect(nodes[i]!.radius).toBeLessThanOrEqual(parent.radius + 1e-9);
      expect(nodes[i]!.radius).toBeGreaterThan(0);
    }
  });

  it('positions are finite and radii respect the strand floor scale', () => {
    const nodes = nodesOf();
    for (const n of nodes) {
      expect(n.position.every(Number.isFinite)).toBe(true);
      expect(n.radius).toBeLessThanOrEqual(ARBOR_GROWTH_DEFAULTS.trunkRadius);
    }
  });

  it('stays inside the node budget for the default params', () => {
    const count = nodesOf().length;
    // Perf guard: a parameter change that explodes the recursion should fail
    // here, not silently quadruple the geometry build.
    expect(count).toBeGreaterThan(150);
    expect(count).toBeLessThan(2000);
  });
});

describe('generateArbor — growth parameter t', () => {
  it('assigns t in [0, 1] with the root at 0 and the deepest tip at 1', () => {
    const nodes = nodesOf();
    let max = 0;
    for (const n of nodes) {
      expect(n.t).toBeGreaterThanOrEqual(0);
      expect(n.t).toBeLessThanOrEqual(1);
      max = Math.max(max, n.t);
    }
    expect(nodes[0]!.t).toBe(0);
    expect(max).toBeCloseTo(1, 6);
  });

  it('t never decreases from parent to child (path length is cumulative)', () => {
    const nodes = nodesOf();
    for (let i = 1; i < nodes.length; i++) {
      expect(nodes[i]!.t).toBeGreaterThanOrEqual(nodes[nodes[i]!.parent]!.t);
    }
  });
});

describe('generateArbor — the three limbs', () => {
  it('populates all three limb indices with spine and strand regions', () => {
    const nodes = nodesOf();
    for (const limb of LIMBS) {
      const members = nodes.filter((n) => n.limb === limb);
      expect(members.length).toBeGreaterThan(ARBOR_GROWTH_DEFAULTS.limbSegments);
      expect(members.some((n) => n.region === 'limb')).toBe(true);
      expect(members.some((n) => n.region === 'strand')).toBe(true);
    }
    // The trunk itself is shared, pre-split.
    expect(nodes.some((n) => n.limb === -1 && n.region === 'trunk')).toBe(true);
  });

  it('limbTipNode returns a distinct far-out tip per limb', () => {
    const nodes = nodesOf();
    const tips = LIMBS.map((limb) => limbTipNode(nodes, limb));
    for (const [i, tip] of tips.entries()) {
      expect(tip.limb).toBe(LIMBS[i]);
      // A tip is the limb's deepest node.
      const deepest = Math.max(...nodes.filter((n) => n.limb === LIMBS[i]).map((n) => n.t));
      expect(tip.t).toBeCloseTo(deepest, 9);
    }
    // Tips are spatially distinct — anchors/cards depend on separation.
    for (let a = 0; a < tips.length; a++) {
      for (let b = a + 1; b < tips.length; b++) {
        const dx = tips[a]!.position[0] - tips[b]!.position[0];
        const dy = tips[a]!.position[1] - tips[b]!.position[1];
        const dz = tips[a]!.position[2] - tips[b]!.position[2];
        expect(Math.hypot(dx, dy, dz)).toBeGreaterThan(3);
      }
    }
  });
});

describe('generateArbor — determinism', () => {
  it('produces identical output for the same seed', () => {
    expect(nodesOf()).toEqual(nodesOf());
  });

  it('produces a different tree for a different seed', () => {
    const a = generateArbor(ARBOR_GROWTH_DEFAULTS);
    const b = generateArbor({ ...ARBOR_GROWTH_DEFAULTS, seed: ARBOR_GROWTH_DEFAULTS.seed + 1 });
    const differs =
      a.length !== b.length ||
      a.some((n, i) => n.position.some((v, ax) => v !== b[i]!.position[ax]));
    expect(differs).toBe(true);
  });
});
