// src/scales/protein/protein-geometry.test.ts
// Contracts for the ribbon sweep: exact counts, fixed topology across frames
// (the animation rewrites positions, never re-tessellates), unit normals with
// no NaN even where the arrowhead tapers to nothing, the minimum-strand rule,
// and profile morphs that stay lerp-compatible.
import { describe, expect, it } from 'vitest';
import { BufferAttribute } from 'three';
import {
  buildRibbonGeometry,
  ribbonVertexCount,
  writeRibbonGeometry,
  SS_COIL,
  SS_HELIX,
  SS_SHEET,
} from './protein-geometry';
import {
  allocateGuides,
  deriveReferenceNormals,
  writeGuides,
  type GuideArrays,
  type GuideFragment,
} from './protein-guide';
import { RIBBON_RADIAL_SEGMENTS, SHEET_PROFILE_PEAK } from './protein-params';

/** Backbone-like atoms: a gentle arc, carbonyls leaning off it. Enough
 *  structure to exercise the frame without pretending to be real data. */
function backbone(count: number, phase = 0): Float32Array {
  const caO = new Float32Array(count * 6);
  for (let r = 0; r < count; r++) {
    const t = r * 0.6 + phase;
    const cx = Math.cos(t) * 5;
    const cy = Math.sin(t) * 5;
    const cz = r * 1.5;
    caO[r * 6] = cx;
    caO[r * 6 + 1] = cy;
    caO[r * 6 + 2] = cz;
    caO[r * 6 + 3] = cx + 0.4 * Math.cos(t);
    caO[r * 6 + 4] = cy + 0.4 * Math.sin(t);
    caO[r * 6 + 5] = cz + 2.3;
  }
  return caO;
}

function guidesFor(caO: Float32Array, fragments: GuideFragment[], count: number): GuideArrays {
  const refs = deriveReferenceNormals(caO, fragments, count);
  const g = allocateGuides(fragments);
  g.positions.fill(Number.NaN);
  g.tangents.fill(Number.NaN);
  g.ups.fill(Number.NaN);
  writeGuides(g, caO, fragments, refs, count);
  return g;
}

function build(ss: string, fragments: GuideFragment[], caO?: Float32Array) {
  const count = ss.length;
  const atoms = caO ?? backbone(count);
  const guides = guidesFor(atoms, fragments, count);
  const rmsf = new Float32Array(count).fill(1.2);
  const geo = buildRibbonGeometry(guides, ss, fragments, rmsf, count, 0);
  return { geo, guides, atoms, count };
}

describe('ribbonVertexCount', () => {
  it('is one ring per guide point plus two cap apexes per fragment', () => {
    // The real Gq receptor: 1064 guide points across two fragments.
    const receptor: GuideFragment[] = [
      { startResidue: 0, count: 185 },
      { startResidue: 185, count: 81 },
    ];
    expect(ribbonVertexCount(receptor)).toBe(1064 * RIBBON_RADIAL_SEGMENTS + 4);
    expect(ribbonVertexCount(receptor)).toBe(8516);

    // The real G-protein: three chains, one merged geometry.
    const gprotein: GuideFragment[] = [
      { startResidue: 0, count: 246 },
      { startResidue: 246, count: 338 },
      { startResidue: 584, count: 71 },
    ];
    expect(ribbonVertexCount(gprotein)).toBe(2620 * RIBBON_RADIAL_SEGMENTS + 6);
    expect(ribbonVertexCount(gprotein)).toBe(20966);
  });

  it('keeps the whole Gq body inside the vertex budget', () => {
    const total =
      ribbonVertexCount([
        { startResidue: 0, count: 185 },
        { startResidue: 185, count: 81 },
      ]) +
      ribbonVertexCount([
        { startResidue: 0, count: 246 },
        { startResidue: 246, count: 338 },
        { startResidue: 584, count: 71 },
      ]);
    expect(total).toBe(29482);
    expect(total).toBeLessThan(50_000); // design budget: ~30–50K
  });
});

describe('buildRibbonGeometry', () => {
  it('allocates every attribute at the vertex count and indexes only real vertices', () => {
    const fragments: GuideFragment[] = [{ startResidue: 0, count: 10 }];
    const { geo } = build('HHHHHCCCCC', fragments);
    const n = ribbonVertexCount(fragments);
    for (const name of [
      'position',
      'normal',
      'aResidueIndex',
      'aSSType',
      'aChainIndex',
      'aRmsf',
      'aShade',
    ]) {
      expect((geo.getAttribute(name) as BufferAttribute).count).toBe(n);
    }
    const idx = geo.getIndex()!;
    for (let i = 0; i < idx.count; i++) {
      expect(idx.getX(i)).toBeGreaterThanOrEqual(0);
      expect(idx.getX(i)).toBeLessThan(n);
    }
  });

  it('writes finite positions and unit normals everywhere', () => {
    const { geo } = build('HHHHHEEEEECCCCC', [{ startResidue: 0, count: 15 }]);
    const pos = geo.getAttribute('position') as BufferAttribute;
    const nrm = geo.getAttribute('normal') as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      expect(Number.isFinite(pos.getX(i))).toBe(true);
      expect(Number.isFinite(pos.getY(i))).toBe(true);
      expect(Number.isFinite(pos.getZ(i))).toBe(true);
      expect(Math.hypot(nrm.getX(i), nrm.getY(i), nrm.getZ(i))).toBeCloseTo(1, 4);
    }
  });

  it('marks a fragment break — the two sweeps share no triangle', () => {
    // Two fragments, contiguous in residue index but independent polylines.
    const fragments: GuideFragment[] = [
      { startResidue: 0, count: 6 },
      { startResidue: 6, count: 6 },
    ];
    const { geo } = build('CCCCCCCCCCCC', fragments);
    const firstFragVerts = 6 * 4 * RIBBON_RADIAL_SEGMENTS;
    const idx = geo.getIndex()!;
    // Every triangle sits wholly inside one fragment's vertex block (cap
    // apexes are appended per fragment, so allow them via the block bounds).
    const blockOf = (v: number): number => (v < firstFragVerts + 2 ? 0 : 1);
    for (let t = 0; t < idx.count; t += 3) {
      const a = blockOf(idx.getX(t));
      const b = blockOf(idx.getX(t + 1));
      const c = blockOf(idx.getX(t + 2));
      expect(a).toBe(b);
      expect(b).toBe(c);
    }
  });
});

describe('secondary structure', () => {
  it('tags helix, sheet and coil onto the vertices', () => {
    const { geo } = build('HHHHHEEEEECCCCC', [{ startResidue: 0, count: 15 }]);
    const ssAttr = geo.getAttribute('aSSType') as BufferAttribute;
    const at = (residue: number): number => ssAttr.getX(residue * 4 * RIBBON_RADIAL_SEGMENTS);
    expect(at(0)).toBe(SS_HELIX);
    expect(at(6)).toBe(SS_SHEET);
    expect(at(12)).toBe(SS_COIL);
  });

  it('renders a short E-run as coil — DSSP noise never becomes a strand', () => {
    // 'EE' is under the minimum; 'EEEE' is not.
    const { geo } = build('CEECCCEEEECC', [{ startResidue: 0, count: 12 }]);
    const ssAttr = geo.getAttribute('aSSType') as BufferAttribute;
    const at = (residue: number): number => ssAttr.getX(residue * 4 * RIBBON_RADIAL_SEGMENTS);
    expect(at(1)).toBe(SS_COIL); // the 2-run, demoted
    expect(at(2)).toBe(SS_COIL);
    expect(at(6)).toBe(SS_SHEET); // the 4-run, kept
    expect(at(9)).toBe(SS_SHEET);
  });

  it('fires the arrow taper on a surviving run and never on a demoted one', () => {
    const fragments: GuideFragment[] = [{ startResidue: 0, count: 12 }];
    const { geo } = build('CEECCCEEEECC', fragments);
    const profiles = geo.userData.profiles as { a: number; b: number; n: number }[];
    const gp = (residue: number, sub: number): { a: number } => profiles[residue * 4 + sub]!;

    // Residue 9 ends the 4-run: body at u=0, peak at u=0.5, tip at u=0.75.
    expect(gp(9, 0).a).toBeCloseTo(0.3, 5);
    expect(gp(9, 2).a).toBeCloseTo(SHEET_PROFILE_PEAK.a, 5);
    expect(gp(9, 3).a).toBeCloseTo(0, 5);
    // The demoted 2-run carries no arrow — it is a plain coil tube.
    expect(gp(2, 3).a).toBeCloseTo(0.15, 5);
  });

  it('morphs the cross-section across an SS boundary rather than stepping it', () => {
    const { geo } = build('HHHHCCCC', [{ startResidue: 0, count: 8 }]);
    const profiles = geo.userData.profiles as { a: number; b: number; n: number }[];
    // Residue 3 is the last helix; its final sub-samples blend toward coil.
    const helixA = profiles[3 * 4]!.a;
    const midA = profiles[3 * 4 + 2]!.a;
    const lastA = profiles[3 * 4 + 3]!.a;
    const coilA = profiles[4 * 4]!.a;
    expect(helixA).toBeCloseTo(0.6, 5);
    expect(coilA).toBeCloseTo(0.15, 5);
    // Strictly between, and monotonically approaching the coil profile.
    expect(midA).toBeLessThan(helixA);
    expect(midA).toBeGreaterThan(coilA);
    expect(lastA).toBeLessThan(midA);
  });
});

describe('degenerate guard', () => {
  it('keeps normals unit and finite where the arrowhead tapers to zero width', () => {
    // The tip profile is a = b = 0: all 8 ring vertices collapse onto the
    // centerline. The position formula multiplies by a/b so that is exactly
    // the intended point; the normal divides by them, which is why the floor
    // exists. Without it this is Infinity, then NaN.
    const fragments: GuideFragment[] = [{ startResidue: 0, count: 8 }];
    const { geo } = build('CEEEEECC', fragments);
    const profiles = geo.userData.profiles as { a: number; b: number }[];
    const tip = profiles.findIndex((p) => p.a === 0 && p.b === 0);
    expect(tip).toBeGreaterThan(-1); // the taper really did reach zero

    const nrm = geo.getAttribute('normal') as BufferAttribute;
    for (let k = 0; k < RIBBON_RADIAL_SEGMENTS; k++) {
      const v = tip * RIBBON_RADIAL_SEGMENTS + k;
      expect(Math.hypot(nrm.getX(v), nrm.getY(v), nrm.getZ(v))).toBeCloseTo(1, 4);
    }
    const pos = geo.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < pos.count; i++) expect(Number.isNaN(pos.getX(i))).toBe(false);
  });
});

describe('writeRibbonGeometry', () => {
  it('moves the surface without re-tessellating it — topology is frame-invariant', () => {
    const ss = 'HHHHHEEEEECCCCC';
    const fragments: GuideFragment[] = [{ startResidue: 0, count: 15 }];
    const { geo } = build(ss, fragments);
    const vertsBefore = (geo.getAttribute('position') as BufferAttribute).count;
    const idxBefore = geo.getIndex()!.count;
    const before = Float32Array.from((geo.getAttribute('position') as BufferAttribute).array);
    // needsUpdate is a setter-only property on BufferAttribute — it bumps
    // `version`, which is what the renderer actually reads to re-upload.
    const versionBefore = (geo.getAttribute('position') as BufferAttribute).version;

    // A different frame of the "trajectory".
    const guides2 = guidesFor(backbone(15, 0.9), fragments, 15);
    writeRibbonGeometry(geo, guides2, fragments);

    const posAttr = geo.getAttribute('position') as BufferAttribute;
    expect(posAttr.count).toBe(vertsBefore);
    expect(geo.getIndex()!.count).toBe(idxBefore);
    expect(posAttr.version).toBeGreaterThan(versionBefore);
    // The surface actually moved.
    const after = posAttr.array as Float32Array;
    let moved = 0;
    for (let i = 0; i < after.length; i++) if (Math.abs(after[i]! - before[i]!) > 1e-4) moved++;
    expect(moved).toBeGreaterThan(after.length / 2);
    for (let i = 0; i < after.length; i++) expect(Number.isFinite(after[i]!)).toBe(true);
  });

  it('is deterministic — the same guides rewrite the same surface', () => {
    const fragments: GuideFragment[] = [{ startResidue: 0, count: 10 }];
    const { geo, guides } = build('HHHHHCCCCC', fragments);
    const first = Float32Array.from((geo.getAttribute('position') as BufferAttribute).array);
    writeRibbonGeometry(geo, guides, fragments);
    const second = (geo.getAttribute('position') as BufferAttribute).array as Float32Array;
    expect(Array.from(second)).toEqual(Array.from(first));
  });
});

describe('attributes', () => {
  it('carries the chain index so subunits dim without a second draw call', () => {
    const { geo } = build('HHHHCCCC', [{ startResidue: 0, count: 8 }]);
    const chain = geo.getAttribute('aChainIndex') as BufferAttribute;
    for (let i = 0; i < chain.count; i++) expect(chain.getX(i)).toBe(0);
  });

  it('carries RAW RMSF per residue — the shader owns the range, so the dev slider stays a uniform write', () => {
    const fragments: GuideFragment[] = [{ startResidue: 0, count: 4 }];
    const guides = guidesFor(backbone(4), fragments, 4);
    const rmsf = new Float32Array([0.1, 0.3, 2.15, 99]);
    const geo = buildRibbonGeometry(guides, 'CCCC', fragments, rmsf, 4, 0);
    const a = geo.getAttribute('aRmsf') as BufferAttribute;
    const at = (r: number): number => a.getX(r * 4 * RIBBON_RADIAL_SEGMENTS);
    for (let r = 0; r < 4; r++) expect(at(r)).toBeCloseTo(rmsf[r]!, 4);
  });

  it('bakes rim shade on a flat ribbon and none on a round tube', () => {
    const { geo } = build('HHHHCCCC', [{ startResidue: 0, count: 8 }]);
    const shade = geo.getAttribute('aShade') as BufferAttribute;
    // Helix (flat): ring vertex 0 sits on the thin rim (|cos 0| = 1).
    expect(shade.getX(0)).toBeGreaterThan(0.5);
    // Helix: ring vertex 2 is the broad face (|cos 90°| = 0).
    expect(shade.getX(2)).toBeCloseTo(0, 5);
    // Coil (a == b): no rim anywhere.
    const coilBase = 4 * 4 * RIBBON_RADIAL_SEGMENTS;
    for (let k = 0; k < RIBBON_RADIAL_SEGMENTS; k++) {
      expect(shade.getX(coilBase + k)).toBeCloseTo(0, 5);
    }
  });
});
