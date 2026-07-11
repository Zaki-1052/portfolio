// src/scales/chromatin/coil-thread-path.test.ts
// Contracts for the wound-thread path math: exact fill, C0 junctions, wraps
// that sit on the drum wall and sweep exactly wrapTurns revolutions,
// orthonormal ring frames, aimed entries, and — the load-bearing one —
// continuity in openT (the unwind re-samples this path every tween tick; any
// quantized branch would pop the cord mid-animation).
import { describe, expect, it } from 'vitest';
import {
  COIL_GROWTH_DEFAULTS,
  generateCoil,
  type CoilNode,
  type Vec3,
} from '@/utils/coil-generator';
import {
  BRIDGE_SAMPLES,
  WRAP_SAMPLES,
  WRAP_SINK,
  WRAP_Z_FRACTION,
  cumulativeArcLength,
  computeTwistPhase,
  knobPlacements,
  sampleThreadPath,
  threadPointCount,
  wrapEntryAzimuth,
  type ThreadPathOpts,
} from './coil-thread-path';

const OPTS: ThreadPathOpts = {
  // strandRadius + helixRadius = 0.08 keeps the compound wall envelope W equal
  // to the old single-cord test radius, so the "on the wall" contract is
  // unchanged.
  strandRadius: 0.03,
  helixRadius: 0.05,
  twistPitch: 2.0,
  linkerWidthScale: 0.6,
  wrapTurns: 1.75,
  beadAspect: COIL_GROWTH_DEFAULTS.beadAspect,
  linkerSag: COIL_GROWTH_DEFAULTS.linkerSag,
  rungRadius: 0.018,
  rungSpacing: 1.0,
};

/** Compound wall envelope — where the axis path rides, mirroring the sweep. */
const WALL_W = OPTS.helixRadius + OPTS.strandRadius;

/** Derive the two backbone strand centers exactly as coil-geometry's sweep
 *  does (ignoring the linker taper, which is 1 at junctions and a continuous
 *  function elsewhere) — the object under test for twist continuity. */
function strandCenters(
  ns: CoilNode[],
  opts: ThreadPathOpts = OPTS,
): { a: Float32Array; b: Float32Array } {
  const total = threadPointCount(ns.length);
  const pts = new Float32Array(total * 3);
  const sides = new Float32Array(total * 3);
  const ups = new Float32Array(total * 3);
  sampleThreadPath(ns, opts, pts, sides, ups);
  const arc = new Float32Array(total);
  cumulativeArcLength(pts, total, arc);
  const psi = new Float32Array(total);
  computeTwistPhase(ns.length, sides, ups, arc, opts.twistPitch, psi);
  const a = new Float32Array(total * 3);
  const b = new Float32Array(total * 3);
  for (let i = 0; i < total; i++) {
    const k = i * 3;
    const c = Math.cos(psi[i]!);
    const s = Math.sin(psi[i]!);
    const sAx = c * sides[k]! + s * ups[k]!;
    const sAy = c * sides[k + 1]! + s * ups[k + 1]!;
    const sAz = c * sides[k + 2]! + s * ups[k + 2]!;
    a[k] = pts[k]! + opts.helixRadius * sAx;
    a[k + 1] = pts[k + 1]! + opts.helixRadius * sAy;
    a[k + 2] = pts[k + 2]! + opts.helixRadius * sAz;
    b[k] = pts[k]! - opts.helixRadius * sAx;
    b[k + 1] = pts[k + 1]! - opts.helixRadius * sAy;
    b[k + 2] = pts[k + 2]! - opts.helixRadius * sAz;
  }
  return { a, b };
}

interface Sampled {
  points: Float32Array;
  sides: Float32Array;
  ups: Float32Array;
}

function sample(nodes: CoilNode[], opts: ThreadPathOpts = OPTS): Sampled {
  const count = threadPointCount(nodes.length) * 3;
  const points = new Float32Array(count).fill(Number.NaN);
  const sides = new Float32Array(count).fill(Number.NaN);
  const ups = new Float32Array(count).fill(Number.NaN);
  sampleThreadPath(nodes, opts, points, sides, ups);
  return { points, sides, ups };
}

function at(arr: Float32Array, i: number): Vec3 {
  return [arr[i * 3]!, arr[i * 3 + 1]!, arr[i * 3 + 2]!];
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function maxPointMove(a: Float32Array, b: Float32Array): number {
  let max = 0;
  for (let k = 0; k < a.length; k += 3) {
    const move = Math.hypot(b[k]! - a[k]!, b[k + 1]! - a[k + 1]!, b[k + 2]! - a[k + 2]!);
    if (move > max) max = move;
  }
  return max;
}

/** Index of drum i's first wrap point in the path order. */
function wrapStart(i: number): number {
  return i * (WRAP_SAMPLES + BRIDGE_SAMPLES);
}

const nodes = generateCoil(COIL_GROWTH_DEFAULTS);

describe('sampleThreadPath', () => {
  it('is deterministic and fills every output slot exactly once', () => {
    const a = sample(nodes);
    const b = sample(nodes);
    expect(a.points).toEqual(b.points);
    expect(a.sides).toEqual(b.sides);
    expect(a.ups).toEqual(b.ups);
    for (const arr of [a.points, a.sides, a.ups]) {
      expect(arr.some(Number.isNaN)).toBe(false);
    }
  });

  it('meets C0 at every wrap↔bridge junction', () => {
    const { points } = sample(nodes);
    for (let i = 0; i < nodes.length - 1; i++) {
      const exitIdx = wrapStart(i) + WRAP_SAMPLES - 1;
      const bridgeFirst = exitIdx + 1;
      const bridgeLast = wrapStart(i) + WRAP_SAMPLES + BRIDGE_SAMPLES - 1;
      const nextEntry = wrapStart(i + 1);
      expect(dist(at(points, exitIdx), at(points, bridgeFirst))).toBeLessThan(1e-6);
      expect(dist(at(points, bridgeLast), at(points, nextEntry))).toBeLessThan(1e-6);
    }
  });

  it('keeps every wrap point on the wall: sunk cord radius off the axis, z within the wrap span', () => {
    const { points } = sample(nodes);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      const rWrap = node.radius + WALL_W * (1 - WRAP_SINK);
      const zW = WRAP_Z_FRACTION * node.radius * OPTS.beadAspect;
      for (let s = 0; s < WRAP_SAMPLES; s++) {
        const p = at(points, wrapStart(i) + s);
        const rel: Vec3 = [
          p[0] - node.position[0],
          p[1] - node.position[1],
          p[2] - node.position[2],
        ];
        const z = dot(rel, node.tangent);
        const radial = Math.sqrt(Math.max(0, dot(rel, rel) - z * z));
        expect(Math.abs(radial - rWrap)).toBeLessThan(1e-5);
        expect(Math.abs(z)).toBeLessThanOrEqual(zW + 1e-5);
      }
      const zFirst = dot(
        [
          at(points, wrapStart(i))[0] - node.position[0],
          at(points, wrapStart(i))[1] - node.position[1],
          at(points, wrapStart(i))[2] - node.position[2],
        ],
        node.tangent,
      );
      expect(zFirst).toBeCloseTo(-zW, 5);
    }
  });

  it('sweeps exactly wrapTurns revolutions per wrap', () => {
    const { points } = sample(nodes);
    for (const i of [0, 10, 27, nodes.length - 1]) {
      const node = nodes[i]!;
      let sweep = 0;
      let prevAngle: number | null = null;
      for (let s = 0; s < WRAP_SAMPLES; s++) {
        const p = at(points, wrapStart(i) + s);
        const rel: Vec3 = [
          p[0] - node.position[0],
          p[1] - node.position[1],
          p[2] - node.position[2],
        ];
        const angle = Math.atan2(dot(rel, node.binormal), dot(rel, node.normal));
        if (prevAngle !== null) {
          let d = angle - prevAngle;
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          sweep += d;
        }
        prevAngle = angle;
      }
      expect(Math.abs(Math.abs(sweep) - OPTS.wrapTurns * Math.PI * 2)).toBeLessThan(1e-3);
    }
  });

  it('emits orthonormal ring frames', () => {
    const { sides, ups } = sample(nodes);
    const total = threadPointCount(nodes.length);
    for (let k = 0; k < total; k += 7) {
      const s = at(sides, k);
      const u = at(ups, k);
      expect(Math.hypot(...s)).toBeCloseTo(1, 4);
      expect(Math.hypot(...u)).toBeCloseTo(1, 4);
      expect(Math.abs(dot(s, u))).toBeLessThan(1e-4);
    }
  });

  it('aims each interior entry at the previous drum', () => {
    // End drums excluded: the generator's one-sided tangent there is exactly
    // the chord to the neighbor, so the azimuthal aim is degenerate by
    // construction and the module falls back to a constant phase.
    const { sides } = sample(nodes);
    for (const i of [1, 15, 40, nodes.length - 2]) {
      const node = nodes[i]!;
      const prev = nodes[i - 1]!;
      const toPrev: Vec3 = [
        prev.position[0] - node.position[0],
        prev.position[1] - node.position[1],
        prev.position[2] - node.position[2],
      ];
      const along = dot(toPrev, node.tangent);
      const proj: Vec3 = [
        toPrev[0] - node.tangent[0] * along,
        toPrev[1] - node.tangent[1] * along,
        toPrev[2] - node.tangent[2] * along,
      ];
      const len = Math.hypot(...proj);
      const entrySide = at(sides, wrapStart(i));
      expect(dot(entrySide, [proj[0] / len, proj[1] / len, proj[2] / len])).toBeGreaterThan(0.999);
    }
  });

  it('is continuous in openT — no winding pops anywhere in the unwind', () => {
    // Verified by step-scaling probe (scripts/verify/thread-path-continuity):
    // the max per-point move halves as the openT step halves — continuous,
    // with fast-but-smooth wrap-phase swings near the region boundary (the
    // azimuth is ill-conditioned when a neighbor chord passes the tangent
    // plane; observed max 0.77 at step 0.01 with the default jitter 0.08,
    // halving cleanly all the way down — 0.77 → 0.39 → 0.16 → 0.07). A
    // winding pop would be step-INVARIANT at a half-to-full revolution
    // (≥ π·rWrap ≈ 1.8), so 0.9 at step 0.01 cleanly separates the two.
    // The 0 → 1e-4 seam (the gate between the compact fast path and the
    // open pipeline) must be near-zero.
    for (const region of [0, 1] as const) {
      let prev = sample(generateCoil(COIL_GROWTH_DEFAULTS, { region, openT: 0 }));
      let cur = sample(generateCoil(COIL_GROWTH_DEFAULTS, { region, openT: 1e-4 }));
      const seamMove = maxPointMove(prev.points, cur.points);
      expect(seamMove).toBeLessThan(0.02);
      for (let openT = 0.01; openT <= 1.0001; openT += 0.01) {
        cur = sample(generateCoil(COIL_GROWTH_DEFAULTS, { region, openT }));
        expect(maxPointMove(prev.points, cur.points)).toBeLessThan(0.9);
        prev = cur;
      }
    }
  });
});

describe('cumulativeArcLength', () => {
  it('starts at zero and is monotonic non-decreasing and finite', () => {
    const total = threadPointCount(nodes.length);
    const { points } = sample(nodes);
    const arc = new Float32Array(total);
    cumulativeArcLength(points, total, arc);
    expect(arc[0]).toBe(0);
    for (let i = 1; i < total; i++) {
      expect(Number.isFinite(arc[i]!)).toBe(true);
      expect(arc[i]!).toBeGreaterThanOrEqual(arc[i - 1]!);
    }
  });
});

describe('computeTwistPhase', () => {
  it('yields deterministic, finite strand centers', () => {
    const { a, b } = strandCenters(nodes);
    expect(a.some(Number.isNaN)).toBe(false);
    expect(b.some(Number.isNaN)).toBe(false);
    expect(strandCenters(nodes).a).toEqual(a);
  });

  it('keeps both strands continuous across every bridge→wrap junction', () => {
    // The load-bearing rebase test: the wrap-entry frame is computed
    // independently of the incoming bridge's transported frame, so WITHOUT the
    // psiOffset correction (or with the wrong sign) the offset strands jump
    // ~2·helixRadius·sin(Δ/2) — order 0.05–0.08 for the real per-junction frame
    // rotations here. The correct rebase leaves only a ~1e-3 finite-sampling
    // residual (the tangents at the docked junction are equal only to sampling
    // precision), so 5e-3 passes the correct impl by 5× and fails a sign error
    // by 10×+.
    const { a, b } = strandCenters(nodes);
    for (let i = 1; i < nodes.length; i++) {
      const entry = wrapStart(i);
      const prev = entry - 1; // bridge-last of the previous drum
      expect(dist(at(a, prev), at(a, entry))).toBeLessThan(5e-3);
      expect(dist(at(b, prev), at(b, entry))).toBeLessThan(5e-3);
    }
  });

  it('derived strand positions are continuous in openT — no gross pop', () => {
    // Mirrors the axis openT test on the DERIVED strand centers. Smooth motion
    // (incl. the fast-but-smooth frame swings near the region boundary the axis
    // test documents, here amplified by the ±helixRadius offset) stays well
    // under a genuine winding pop (step-invariant ≥ π·rWrap ≈ 1.8); 1.3 cleanly
    // separates. (A subtle twist-rebase sign error is caught by the junction
    // test above, not here — its jump hides under the smooth boundary swing.)
    for (const region of [0, 1] as const) {
      let prev = strandCenters(generateCoil(COIL_GROWTH_DEFAULTS, { region, openT: 0 }));
      for (let openT = 0.01; openT <= 1.0001; openT += 0.01) {
        const cur = strandCenters(generateCoil(COIL_GROWTH_DEFAULTS, { region, openT }));
        expect(maxPointMove(prev.a, cur.a)).toBeLessThan(1.3);
        expect(maxPointMove(prev.b, cur.b)).toBeLessThan(1.3);
        prev = cur;
      }
    }
  });
});

describe('knobPlacements', () => {
  it('places 2 knobs per drum, on the wall, entry coincident with the wrap start', () => {
    const count = nodes.length * 2 * 3;
    const pos = new Float32Array(count).fill(Number.NaN);
    const radial = new Float32Array(count).fill(Number.NaN);
    const tangent = new Float32Array(count).fill(Number.NaN);
    knobPlacements(nodes, OPTS, pos, radial, tangent);
    expect(pos.some(Number.isNaN)).toBe(false);

    const { points } = sample(nodes);
    for (const i of [0, 8, 30, nodes.length - 1]) {
      const entry = at(pos, i * 2);
      expect(dist(entry, at(points, wrapStart(i)))).toBeLessThan(1e-6);
      const r = at(radial, i * 2);
      const t = at(tangent, i * 2);
      expect(Math.hypot(...r)).toBeCloseTo(1, 4);
      expect(Math.abs(dot(r, t))).toBeLessThan(1e-4);
    }
  });
});

describe('wrapEntryAzimuth', () => {
  it('is deterministic and finite for every drum', () => {
    for (let i = 0; i < nodes.length; i++) {
      const a = wrapEntryAzimuth(nodes, i, OPTS.wrapTurns);
      expect(Number.isFinite(a)).toBe(true);
      expect(wrapEntryAzimuth(nodes, i, OPTS.wrapTurns)).toBe(a);
    }
  });
});
