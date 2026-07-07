// src/utils/coil-generator.test.ts
// The coil generator is pure and seeded — every structural invariant the
// geometry builders, unwind engine, and future annotation anchors rely on is
// asserted here: frame orthonormality (oriented discs), the consecutive
// spacing floor (no interpenetrating beads at any seed or open state), region
// marking, and the Approach-B open-state contract (identity at openT 0,
// unwound targets at openT 1, continuity in between, non-region invariance).
import { describe, expect, it } from 'vitest';
import {
  COIL_GROWTH_DEFAULTS,
  generateCoil,
  loopArcPairs,
  regionAnchor,
  regionBeadIndices,
  type CoilNode,
  type Vec3,
} from './coil-generator';

function nodesOf(params = COIL_GROWTH_DEFAULTS): CoilNode[] {
  return generateCoil(params);
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Mean pairwise distance of a point set — the compact-vs-open spread gauge. */
function meanPairwise(points: Vec3[]): number {
  let sum = 0;
  let pairs = 0;
  for (let a = 0; a < points.length; a++) {
    for (let b = a + 1; b < points.length; b++) {
      sum += distance(points[a]!, points[b]!);
      pairs++;
    }
  }
  return sum / pairs;
}

describe('generateCoil — structure', () => {
  it('emits exactly beadCount beads with finite positions and indices in order', () => {
    const nodes = nodesOf();
    expect(nodes.length).toBe(COIL_GROWTH_DEFAULTS.beadCount);
    for (const [i, n] of nodes.entries()) {
      expect(n.index).toBe(i);
      expect(n.position.every(Number.isFinite)).toBe(true);
      expect(n.unwoundPosition.every(Number.isFinite)).toBe(true);
      expect(n.radius).toBeGreaterThan(0);
    }
  });

  it('assigns t as a strictly increasing arc-length fraction from 0 to 1', () => {
    const nodes = nodesOf();
    expect(nodes[0]!.t).toBe(0);
    expect(nodes[nodes.length - 1]!.t).toBeCloseTo(1, 9);
    for (let i = 1; i < nodes.length; i++) {
      expect(nodes[i]!.t).toBeGreaterThan(nodes[i - 1]!.t);
    }
  });

  it('never places consecutive beads closer than the spacing floor, at any seed', () => {
    // The floor is structural (forward-sweep enforcement), not a defaults
    // coincidence — assert it across several seeds and a cranked jitter.
    const variants = [
      COIL_GROWTH_DEFAULTS,
      { ...COIL_GROWTH_DEFAULTS, seed: 3 },
      { ...COIL_GROWTH_DEFAULTS, seed: 99, jitter: 0.4 },
    ];
    for (const params of variants) {
      const nodes = generateCoil(params);
      // Mirror of the generator's floor: bead surfaces can't interpenetrate
      // along the thread, capped by what the path's natural spacing allows.
      const speed = Math.hypot(params.coilRadius, params.coilPitch / (Math.PI * 2));
      const naturalSpacing = (speed * params.coilTurns * Math.PI * 2) / (params.beadCount - 1);
      const floor = Math.min(2 * params.beadRadius * 1.05, naturalSpacing * 0.95);
      for (let i = 1; i < nodes.length; i++) {
        expect(distance(nodes[i]!.position, nodes[i - 1]!.position)).toBeGreaterThanOrEqual(
          floor - 1e-9,
        );
      }
    }
  });
});

describe('generateCoil — transport frames', () => {
  it('produces orthonormal frames at every bead', () => {
    const nodes = nodesOf();
    for (const n of nodes) {
      const unit = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
      expect(unit(n.tangent)).toBeCloseTo(1, 6);
      expect(unit(n.normal)).toBeCloseTo(1, 6);
      expect(unit(n.binormal)).toBeCloseTo(1, 6);
      const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      expect(Math.abs(dot(n.tangent, n.normal))).toBeLessThan(1e-6);
      expect(Math.abs(dot(n.tangent, n.binormal))).toBeLessThan(1e-6);
      expect(Math.abs(dot(n.normal, n.binormal))).toBeLessThan(1e-6);
    }
  });

  it('keeps frames twist-free: consecutive normals never flip', () => {
    const nodes = nodesOf();
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1]!.normal;
      const b = nodes[i]!.normal;
      // Parallel transport changes the side vector slowly — a sign flip
      // (dot < 0) would twist the disc orientation 180° between neighbors.
      expect(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]).toBeGreaterThan(0);
    }
  });
});

describe('generateCoil — publication regions', () => {
  it('marks two non-overlapping regions of exactly regionSize beads', () => {
    const nodes = nodesOf();
    const r0 = regionBeadIndices(nodes, 0);
    const r1 = regionBeadIndices(nodes, 1);
    expect(r0.length).toBe(COIL_GROWTH_DEFAULTS.regionSize);
    expect(r1.length).toBe(COIL_GROWTH_DEFAULTS.regionSize);
    const overlap = r0.filter((i) => r1.includes(i));
    expect(overlap).toEqual([]);
    // Region 0 sits earlier along the fiber than region 1.
    expect(Math.max(...r0)).toBeLessThan(Math.min(...r1));
  });

  it('anchors the two regions at distinct points', () => {
    const nodes = nodesOf();
    const a = regionAnchor(nodes, 0);
    const b = regionAnchor(nodes, 1);
    expect(distance(a, b)).toBeGreaterThan(1);
  });

  it('spreads unwound positions further apart than compact within each region', () => {
    const nodes = nodesOf();
    for (const region of [0, 1] as const) {
      const indices = regionBeadIndices(nodes, region);
      const compact = indices.map((i) => nodes[i]!.position);
      const open = indices.map((i) => nodes[i]!.unwoundPosition);
      expect(meanPairwise(open)).toBeGreaterThan(meanPairwise(compact) * 1.5);
    }
  });

  it('keeps every non-region bead perfectly still in the unwound target', () => {
    const nodes = nodesOf();
    for (const n of nodes) {
      if (n.region !== -1) continue;
      expect(n.unwoundPosition[0]).toBe(n.position[0]);
      expect(n.unwoundPosition[1]).toBe(n.position[1]);
      expect(n.unwoundPosition[2]).toBe(n.position[2]);
    }
  });
});

describe('generateCoil — loop arc pairs', () => {
  it('returns 4-6 deterministic pairs of distant same-region beads', () => {
    const nodes = nodesOf();
    for (const region of [0, 1] as const) {
      const members = new Set(regionBeadIndices(nodes, region));
      const pairs = loopArcPairs(nodes, region);
      expect(pairs.length).toBeGreaterThanOrEqual(4);
      expect(pairs.length).toBeLessThanOrEqual(6);
      for (const [a, b] of pairs) {
        expect(members.has(a)).toBe(true);
        expect(members.has(b)).toBe(true);
        expect(a).not.toBe(b);
      }
      expect(loopArcPairs(nodes, region)).toEqual(pairs);
    }
  });
});

describe('generateCoil — determinism', () => {
  it('produces identical output for the same seed', () => {
    expect(nodesOf()).toEqual(nodesOf());
  });

  it('produces a different coil for a different seed', () => {
    const a = generateCoil(COIL_GROWTH_DEFAULTS);
    const b = generateCoil({ ...COIL_GROWTH_DEFAULTS, seed: COIL_GROWTH_DEFAULTS.seed + 1 });
    const differs = a.some((n, i) => n.position.some((v, ax) => v !== b[i]!.position[ax]));
    expect(differs).toBe(true);
  });
});

describe('generateCoil — open state (Approach B)', () => {
  it('is exactly the compact coil at openT 0 (and for null / omitted open)', () => {
    const base = nodesOf();
    expect(generateCoil(COIL_GROWTH_DEFAULTS, { region: 0, openT: 0 })).toEqual(base);
    expect(generateCoil(COIL_GROWTH_DEFAULTS, { region: 1, openT: 0 })).toEqual(base);
    expect(generateCoil(COIL_GROWTH_DEFAULTS, null)).toEqual(base);
  });

  it('lands region beads exactly on their unwound targets at openT 1', () => {
    const base = nodesOf();
    for (const region of [0, 1] as const) {
      const open = generateCoil(COIL_GROWTH_DEFAULTS, { region, openT: 1 });
      for (const i of regionBeadIndices(base, region)) {
        // Same formula family at t = 1 — bitwise agreement, since the spacing
        // floor cannot trigger at full spread.
        expect(open[i]!.position).toEqual(base[i]!.unwoundPosition);
      }
    }
  });

  it('keeps beads outside the opening region compact (exact before it, relaxed-bounded after)', () => {
    // The spacing-floor sweep is part of the pipeline, so a non-region bead
    // that was floor-pushed by a crowding region neighbor legitimately
    // RELAXES toward its raw placement once that region opens — crowding
    // relief, continuous in openT. The sweep is forward, so beads before the
    // region are bitwise-identical; beads after it may shift by at most the
    // push scale.
    const base = nodesOf();
    const regionStart = Math.min(...regionBeadIndices(base, 0));
    for (const t of [0.2, 0.5, 0.8, 1]) {
      const open = generateCoil(COIL_GROWTH_DEFAULTS, { region: 0, openT: t });
      for (const [i, n] of open.entries()) {
        if (base[i]!.region === 0) continue;
        if (i < regionStart) {
          expect(n.position).toEqual(base[i]!.position);
        } else {
          expect(distance(n.position, base[i]!.position)).toBeLessThan(0.3);
        }
      }
    }
  });

  it('opens continuously — small openT steps move beads by small distances', () => {
    // Mid-range step AND the compact seam (openT 0 → 0+ crosses from the
    // compact code path into the open formula + floor re-run).
    const pairs: [number, number][] = [
      [0.5, 0.501],
      [0, 1e-4],
    ];
    for (const region of [0, 1] as const) {
      for (const [t0, t1] of pairs) {
        const a = generateCoil(COIL_GROWTH_DEFAULTS, { region, openT: t0 });
        const b = generateCoil(COIL_GROWTH_DEFAULTS, { region, openT: t1 });
        for (const [i, n] of a.entries()) {
          expect(distance(n.position, b[i]!.position)).toBeLessThan(0.05);
        }
      }
    }
  });

  it('holds the spacing floor at every openT, across seeds and cranked jitter', () => {
    const variants = [COIL_GROWTH_DEFAULTS, { ...COIL_GROWTH_DEFAULTS, seed: 7, jitter: 0.3 }];
    for (const params of variants) {
      const speed = Math.hypot(params.coilRadius, params.coilPitch / (Math.PI * 2));
      const naturalSpacing = (speed * params.coilTurns * Math.PI * 2) / (params.beadCount - 1);
      const floor = Math.min(2 * params.beadRadius * 1.05, naturalSpacing * 0.95);
      for (const region of [0, 1] as const) {
        for (const t of [0.25, 0.6, 1]) {
          const nodes = generateCoil(params, { region, openT: t });
          for (let i = 1; i < nodes.length; i++) {
            expect(distance(nodes[i]!.position, nodes[i - 1]!.position)).toBeGreaterThanOrEqual(
              floor - 1e-9,
            );
          }
        }
      }
    }
  });

  it('keeps frames orthonormal at every openT', () => {
    const unit = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
    const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    for (const t of [0.3, 0.7, 1]) {
      const nodes = generateCoil(COIL_GROWTH_DEFAULTS, { region: 0, openT: t });
      for (const n of nodes) {
        expect(unit(n.tangent)).toBeCloseTo(1, 6);
        expect(unit(n.normal)).toBeCloseTo(1, 6);
        expect(unit(n.binormal)).toBeCloseTo(1, 6);
        expect(Math.abs(dot(n.tangent, n.normal))).toBeLessThan(1e-6);
        expect(Math.abs(dot(n.tangent, n.binormal))).toBeLessThan(1e-6);
        expect(Math.abs(dot(n.normal, n.binormal))).toBeLessThan(1e-6);
      }
    }
  });

  it('is deterministic for the same open state and clamps openT', () => {
    const a = generateCoil(COIL_GROWTH_DEFAULTS, { region: 1, openT: 0.42 });
    expect(generateCoil(COIL_GROWTH_DEFAULTS, { region: 1, openT: 0.42 })).toEqual(a);
    const over = generateCoil(COIL_GROWTH_DEFAULTS, { region: 1, openT: 1.7 });
    expect(over).toEqual(generateCoil(COIL_GROWTH_DEFAULTS, { region: 1, openT: 1 }));
    const under = generateCoil(COIL_GROWTH_DEFAULTS, { region: 1, openT: -0.3 });
    expect(under).toEqual(nodesOf());
  });
});
