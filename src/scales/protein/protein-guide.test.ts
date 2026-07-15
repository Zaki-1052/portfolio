// src/scales/protein/protein-guide.test.ts
// Contracts for the ribbon guide math: exact fill, the Catmull-Rom identity at
// sub-sample 0, breaks the spline must not cross, sign-locked carbonyls — and
// the load-bearing one, the FRAME CONVENTION.
//
// The convention test builds an ideal coil from closed-form math and asserts
// `up` comes out radial. That is an independent fact about the shape we're
// trying to draw, not a restatement of the algebra in protein-guide: reading
// the shipped per-residue vector as the surface normal instead of the width
// axis produces an `up` that is axial, and this test fails. It is the whole
// reason a 90°-rotated ribbon can't reach a browser.
import { describe, expect, it } from 'vitest';
import {
  allocateGuides,
  deriveReferenceNormals,
  detectStrandRuns,
  guideCountFor,
  receptorCenter,
  sideFrom,
  writeGuides,
  type GuideArrays,
  type GuideFragment,
} from './protein-guide';
import { GUIDE_POINTS_PER_RESIDUE } from './protein-params';

/** An ideal coil, in the pose real backbone data takes: Cα on a helix of
 *  radius `R` about +z, and the carbonyl offset predominantly ALONG the axis
 *  (the i→i+4 bond direction) with a small, CONSISTENT outward lean — the real
 *  geometry, where the bond tilts ~10–15° off the axis. The lean must not
 *  alternate: that would be noise no real coil has, and flip correction has
 *  its own test rather than needing to be smuggled in here.
 *  Returns the interleaved [ca_xyz, o_xyz] the loader emits. */
function idealCoil(count: number, R = 2.3, rise = 1.5, twistDeg = 100): Float32Array {
  const caO = new Float32Array(count * 6);
  for (let r = 0; r < count; r++) {
    const th = (r * twistDeg * Math.PI) / 180;
    const cx = R * Math.cos(th);
    const cy = R * Math.sin(th);
    const cz = r * rise;
    caO[r * 6] = cx;
    caO[r * 6 + 1] = cy;
    caO[r * 6 + 2] = cz;
    const lean = 0.35;
    caO[r * 6 + 3] = cx + lean * Math.cos(th);
    caO[r * 6 + 4] = cy + lean * Math.sin(th);
    caO[r * 6 + 5] = cz + 2.35;
  }
  return caO;
}

/** Fill every output with NaN first, so an unwritten slot reads NaN rather
 *  than silently passing as 0. */
function nanFilled(fragments: GuideFragment[]): GuideArrays {
  const g = allocateGuides(fragments);
  g.positions.fill(Number.NaN);
  g.tangents.fill(Number.NaN);
  g.ups.fill(Number.NaN);
  return g;
}

function run(caO: Float32Array, fragments: GuideFragment[], count: number): GuideArrays {
  const refs = deriveReferenceNormals(caO, fragments, count);
  const g = nanFilled(fragments);
  writeGuides(g, caO, fragments, refs, count);
  return g;
}

describe('guideCountFor', () => {
  it("is count × 4 per fragment — the pipeline's totalGuidePoints contract", () => {
    // The real Gq receptor: two fragments either side of the backbone break.
    expect(
      guideCountFor([
        { startResidue: 0, count: 185 },
        { startResidue: 185, count: 81 },
      ]),
    ).toBe(1064);
    // The real G-protein chains, swept as one merged geometry.
    expect(
      guideCountFor([
        { startResidue: 0, count: 246 },
        { startResidue: 246, count: 338 },
        { startResidue: 584, count: 71 },
      ]),
    ).toBe(2620);
  });
});

describe('writeGuides — frame convention (the ideal coil)', () => {
  const COUNT = 40;
  const R = 2.3;
  const fragments: GuideFragment[] = [{ startResidue: 0, count: COUNT }];
  const caO = idealCoil(COUNT, R);
  const g = run(caO, fragments, COUNT);
  const points = COUNT * GUIDE_POINTS_PER_RESIDUE;

  it('fills every slot — no NaN survives anywhere', () => {
    for (const arr of [g.positions, g.tangents, g.ups]) {
      expect(arr.some(Number.isNaN)).toBe(false);
    }
  });

  // THE CONVENTION, measured on the AXIAL projection rather than the radial
  // one. Both would work in principle, but `up` and `side` each carry some
  // tangential content — the spline scallops between Cα (see the radius test
  // below), so the local radial direction drifts off the true helix radial and
  // a radial projection understates: |up·radial| ranges 0.62–0.99 here. The
  // axial projection has no such ambiguity (z is z), and it separates the two
  // candidate conventions by ~6×:
  //
  //                      as built      if the shipped vector were `up`
  //   |up   · axial|     0.10–0.15     ~0.9
  //   |side · axial|     0.85–0.94     ~0.15
  //
  // So these two assertions are what actually keep a 90°-rotated ribbon out of
  // the browser.
  it('THE CONVENTION: the surface normal is NOT axial — it points out of the coil', () => {
    for (let i = 2; i < points - 2; i++) {
      expect(Math.abs(g.ups[i * 3 + 2]!)).toBeLessThan(0.3);
    }
  });

  it('THE CONVENTION: the width axis IS axial — the tape is not a stack of washers', () => {
    const side = new Float32Array(3);
    for (let i = 2; i < points - 2; i++) {
      sideFrom(g.tangents, g.ups, i * 3, side);
      expect(Math.abs(side[2]!)).toBeGreaterThan(0.7);
    }
  });

  it('points the surface normal broadly outward, not inward or along the chain', () => {
    for (let i = 2; i < points - 2; i++) {
      const o = i * 3;
      const px = g.positions[o]!;
      const py = g.positions[o + 1]!;
      const rl = Math.hypot(px, py) || 1;
      const radial = (g.ups[o]! * px) / rl + (g.ups[o + 1]! * py) / rl;
      expect(Math.abs(radial)).toBeGreaterThan(0.5);
    }
  });

  it('produces an orthonormal frame at every guide point', () => {
    const side = new Float32Array(3);
    for (let i = 0; i < points; i++) {
      const o = i * 3;
      sideFrom(g.tangents, g.ups, o, side);
      expect(Math.hypot(g.tangents[o]!, g.tangents[o + 1]!, g.tangents[o + 2]!)).toBeCloseTo(1, 5);
      expect(Math.hypot(g.ups[o]!, g.ups[o + 1]!, g.ups[o + 2]!)).toBeCloseTo(1, 5);
      expect(Math.hypot(side[0]!, side[1]!, side[2]!)).toBeCloseTo(1, 5);
      const tu =
        g.tangents[o]! * g.ups[o]! +
        g.tangents[o + 1]! * g.ups[o + 1]! +
        g.tangents[o + 2]! * g.ups[o + 2]!;
      const ts =
        g.tangents[o]! * side[0]! + g.tangents[o + 1]! * side[1]! + g.tangents[o + 2]! * side[2]!;
      expect(tu).toBeCloseTo(0, 5);
      expect(ts).toBeCloseTo(0, 5);
    }
  });

  it('tracks the coil, scalloping between control points as a 4× spline must', () => {
    // Cα sit 100° apart, so a Catmull-Rom through them cuts inside the circle
    // between control points: hand-checked, the u=0.5 midpoint of a 100° span
    // on R=2.3 lands at 1.91, and with rise the sampled radius ranges
    // ~1.70–2.50. That is the spline behaving correctly, not a bug — real
    // cartoon renderers splining a raw Cα trace at this rate get the same
    // slight ropiness on helices. It is inherent to the 4-guide-points-per-
    // residue contract the pipeline already baked into totalGuidePoints. If it
    // reads badly at Gate 2 the fix is a smoothing pass on the Cα before
    // splining (what PyMOL does), not a change here.
    for (let i = 0; i < points; i++) {
      const o = i * 3;
      const rl = Math.hypot(g.positions[o]!, g.positions[o + 1]!);
      expect(rl).toBeGreaterThan(R * 0.6);
      expect(rl).toBeLessThan(R * 1.15);
    }
  });
});

describe('writeGuides — sampling', () => {
  it('reproduces each Cα exactly at sub-sample 0 (the Catmull-Rom identity)', () => {
    const COUNT = 12;
    const fragments: GuideFragment[] = [{ startResidue: 0, count: COUNT }];
    const caO = idealCoil(COUNT);
    const g = run(caO, fragments, COUNT);
    for (let r = 0; r < COUNT; r++) {
      const o = r * GUIDE_POINTS_PER_RESIDUE * 3;
      expect(g.positions[o]).toBeCloseTo(caO[r * 6]!, 4);
      expect(g.positions[o + 1]).toBeCloseTo(caO[r * 6 + 1]!, 4);
      expect(g.positions[o + 2]).toBeCloseTo(caO[r * 6 + 2]!, 4);
    }
  });

  it('never crosses a break — a distant second fragment leaves the first untouched', () => {
    // Two fragments whose atoms are far apart, as the real backbone gap is.
    // Clamped indexing must keep each sweep inside its own fragment; if it
    // reached across, the tail of fragment 1 would bend toward fragment 2.
    const COUNT = 8;
    const caO = new Float32Array(COUNT * 2 * 6);
    const near = idealCoil(COUNT);
    caO.set(near, 0);
    const far = idealCoil(COUNT);
    for (let r = 0; r < COUNT; r++) {
      for (let k = 0; k < 6; k++) {
        // Displace the second fragment 500 Å away along x.
        caO[(COUNT + r) * 6 + k] = far[r * 6 + k]! + (k % 3 === 0 ? 500 : 0);
      }
    }
    const split: GuideFragment[] = [
      { startResidue: 0, count: COUNT },
      { startResidue: COUNT, count: COUNT },
    ];
    const gSplit = run(caO, split, COUNT * 2);
    const gLone = run(near, [{ startResidue: 0, count: COUNT }], COUNT);

    const points = COUNT * GUIDE_POINTS_PER_RESIDUE;
    for (let i = 0; i < points * 3; i++) {
      expect(gSplit.positions[i]).toBeCloseTo(gLone.positions[i]!, 4);
    }
    // And no guide point strays into the void between the two fragments.
    for (let i = 0; i < points; i++) {
      expect(gSplit.positions[i * 3]!).toBeLessThan(100);
    }
  });
});

describe('deriveReferenceNormals', () => {
  it('leaves no adjacent pair pointing against each other', () => {
    const COUNT = 30;
    const fragments: GuideFragment[] = [{ startResidue: 0, count: COUNT }];
    const refs = deriveReferenceNormals(idealCoil(COUNT), fragments, COUNT);
    for (let r = 1; r < COUNT; r++) {
      const o = r * 3;
      const p = o - 3;
      const d = refs[o]! * refs[p]! + refs[o + 1]! * refs[p + 1]! + refs[o + 2]! * refs[p + 2]!;
      expect(d).toBeGreaterThanOrEqual(0);
    }
  });

  it('emits unit vectors and restarts the walk per fragment', () => {
    const COUNT = 6;
    const caO = new Float32Array(COUNT * 2 * 6);
    caO.set(idealCoil(COUNT), 0);
    caO.set(idealCoil(COUNT), COUNT * 6);
    const refs = deriveReferenceNormals(
      caO,
      [
        { startResidue: 0, count: COUNT },
        { startResidue: COUNT, count: COUNT },
      ],
      COUNT * 2,
    );
    for (let r = 0; r < COUNT * 2; r++) {
      expect(Math.hypot(refs[r * 3]!, refs[r * 3 + 1]!, refs[r * 3 + 2]!)).toBeCloseTo(1, 5);
    }
  });
});

describe('flip correction', () => {
  it('sign-locks a deliberately inverted carbonyl back to the reference', () => {
    const COUNT = 10;
    const fragments: GuideFragment[] = [{ startResidue: 0, count: COUNT }];
    const caO = idealCoil(COUNT);
    const refs = deriveReferenceNormals(caO, fragments, COUNT);
    const clean = nanFilled(fragments);
    writeGuides(clean, caO, fragments, refs, COUNT);

    // Mirror residue 5's O through its Cα — the carbonyl now points the
    // opposite way. Correction against the fixed reference must undo it, so
    // the frame is unchanged (up to the tape's 180° rotational symmetry).
    const flipped = Float32Array.from(caO);
    for (let k = 0; k < 3; k++) {
      flipped[5 * 6 + 3 + k] = 2 * caO[5 * 6 + k]! - caO[5 * 6 + 3 + k]!;
    }
    const after = nanFilled(fragments);
    writeGuides(after, flipped, fragments, refs, COUNT);

    const o = 5 * GUIDE_POINTS_PER_RESIDUE * 3;
    const dot =
      clean.ups[o]! * after.ups[o]! +
      clean.ups[o + 1]! * after.ups[o + 1]! +
      clean.ups[o + 2]! * after.ups[o + 2]!;
    expect(dot).toBeGreaterThan(0.9);
  });
});

describe('detectStrandRuns', () => {
  const whole: GuideFragment[] = [{ startResidue: 0, count: 12 }];

  it('finds maximal runs of E at or above the minimum length', () => {
    //             0123456789ab
    expect(detectStrandRuns('CCEEEECCEEEC', whole)).toEqual([
      { start: 2, end: 5 },
      { start: 8, end: 10 },
    ]);
  });

  it('drops runs shorter than the minimum — they render as coil', () => {
    expect(detectStrandRuns('CECCEECCEEEC', whole)).toEqual([{ start: 8, end: 10 }]);
    expect(detectStrandRuns('CECCEECCCCCC', whole)).toEqual([]);
  });

  it('closes a run that reaches a fragment end', () => {
    expect(detectStrandRuns('CCCCCCCCCEEE', whole)).toEqual([{ start: 9, end: 11 }]);
  });

  it('never merges a run across a break', () => {
    // Two fragments: 'CCCE' + 'EECC'. Merged, that is a 4-long strand; per
    // fragment it is 1 + 2, both under the minimum, so nothing survives.
    const split: GuideFragment[] = [
      { startResidue: 0, count: 4 },
      { startResidue: 4, count: 4 },
    ];
    expect(detectStrandRuns('CCCEEECC', split)).toEqual([]);
  });
});

describe('receptorCenter', () => {
  it('averages the Cα positions and ignores the carbonyls', () => {
    const caO = new Float32Array([
      0,
      0,
      0,
      99,
      99,
      99, //
      2,
      4,
      6,
      -99,
      -99,
      -99,
    ]);
    expect(receptorCenter(caO, 2)).toEqual([1, 2, 3]);
  });
});
