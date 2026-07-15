// src/utils/protein-loader.test.ts
// Validate the decode + slice logic against a small synthetic binary, then
// against the REAL committed assets read off disk — the network path is the
// only part not covered, and the byte-length check is exactly where a drift
// between the pipeline's output and this module's assumptions would surface.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeTrajectory, frameSlice, type ProteinMeta } from './protein-loader';

// Synthetic fixture: 2 frames, 3 receptor residues (×6), 2 G-protein
// residues (×6), 1 ligand atom (×3). 33 floats/frame = 264 bytes total.
function makeFixture(): ArrayBuffer {
  const floatsPerFrame = 3 * 6 + 2 * 6 + 1 * 3; // 18 + 12 + 3 = 33
  const totalFloats = floatsPerFrame * 2;
  const buf = new ArrayBuffer(totalFloats * 4);
  const view = new Float32Array(buf);
  for (let i = 0; i < totalFloats; i++) view[i] = i;
  return buf;
}

describe('decodeTrajectory', () => {
  it('returns correct layout counts', () => {
    const traj = decodeTrajectory(makeFixture(), 2, 3, 2, 1);
    expect(traj.floatsPerFrame).toBe(33);
    expect(traj.frameCount).toBe(2);
    expect(traj.receptorFloats).toBe(18);
    expect(traj.gproteinFloats).toBe(12);
    expect(traj.ligandFloats).toBe(3);
    expect(traj.buffer.length).toBe(66);
  });

  it('throws on buffer size mismatch', () => {
    const short = new ArrayBuffer(100);
    expect(() => decodeTrajectory(short, 2, 3, 2, 1)).toThrow(/expected 264 bytes.*got 100/);
  });

  it('accepts a zero-ligand system', () => {
    const floatsPerFrame = 3 * 6 + 2 * 6; // 30
    const buf = new ArrayBuffer(floatsPerFrame * 4 * 1);
    const traj = decodeTrajectory(buf, 1, 3, 2, 0);
    expect(traj.ligandFloats).toBe(0);
    expect(traj.floatsPerFrame).toBe(30);
  });
});

describe('frameSlice', () => {
  const traj = decodeTrajectory(makeFixture(), 2, 3, 2, 1);

  it('frame 0: receptor starts at 0, correct length', () => {
    const s = frameSlice(traj, 0);
    expect(s.receptor.length).toBe(18);
    expect(s.receptor[0]).toBe(0);
    expect(s.receptor[17]).toBe(17);
  });

  it('frame 0: gprotein starts after receptor', () => {
    const s = frameSlice(traj, 0);
    expect(s.gprotein.length).toBe(12);
    expect(s.gprotein[0]).toBe(18);
    expect(s.gprotein[11]).toBe(29);
  });

  it('frame 0: ligand starts after gprotein', () => {
    const s = frameSlice(traj, 0);
    expect(s.ligand.length).toBe(3);
    expect(s.ligand[0]).toBe(30);
    expect(s.ligand[2]).toBe(32);
  });

  it('frame 1: offsets by floatsPerFrame', () => {
    const s = frameSlice(traj, 1);
    expect(s.receptor[0]).toBe(33);
    expect(s.gprotein[0]).toBe(33 + 18);
    expect(s.ligand[0]).toBe(33 + 18 + 12);
  });

  it('returns subarray views (zero-copy)', () => {
    const s = frameSlice(traj, 0);
    expect(s.receptor.buffer).toBe(traj.buffer.buffer);
  });
});

// ---- The real committed assets ----
//
// These decode the actual files in public/protein/ rather than a fixture. The
// module was written against the format spec before the pipeline had ever run,
// so this is the first thing that proves the two agree — and it does it in
// node, without a browser or a dev server.

const ASSETS = join(process.cwd(), 'public', 'protein');

function readMeta(): ProteinMeta {
  return JSON.parse(readFileSync(join(ASSETS, 'protein-meta.json'), 'utf8')) as ProteinMeta;
}

function readBin(file: string): ArrayBuffer {
  const b = readFileSync(join(ASSETS, file));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

describe('the shipped assets', () => {
  const meta = readMeta();

  it('is the format this module was written for', () => {
    expect(meta.format).toBe('protein-scale-v1');
  });

  it.each(['gq', 'gi'] as const)(
    'decodes the %s trajectory at the byte length the meta implies',
    (sys) => {
      // decodeTrajectory throws on any mismatch, so reaching the assertions at
      // all is most of the contract.
      const traj = decodeTrajectory(
        readBin(meta.systems[sys].file),
        meta.systems[sys].frameCount,
        meta.receptor[sys].residueCount,
        meta.gprotein[sys].totalResidues,
        meta.ligand.heavyAtomCount,
      );
      expect(traj.frameCount).toBe(100);
      expect(traj.buffer.length).toBe(traj.floatsPerFrame * traj.frameCount);
      expect(traj.receptorFloats).toBe(meta.receptor[sys].residueCount * 6);
      expect(traj.gproteinFloats).toBe(meta.gprotein[sys].totalResidues * 6);
      expect(traj.ligandFloats).toBe(meta.ligand.heavyAtomCount * 3);
    },
  );

  it('carries every per-residue array at the length the sweep indexes by', () => {
    for (const sys of ['gq', 'gi'] as const) {
      const r = meta.receptor[sys];
      expect(r.ss.length).toBe(r.residueCount);
      expect(r.rmsf.length).toBe(r.residueCount);
      expect(r.litResids.length).toBe(r.residueCount);
      expect(r.regions.length).toBe(r.residueCount);
      // One vec3 per residue — the sweep's flip reference.
      expect(r.referenceNormals.length).toBe(r.residueCount * 3);
      // Fragments must tile the chain exactly: a hole would drop residues from
      // the sweep, an overlap would draw them twice.
      expect(r.fragments.reduce((n, f) => n + f.count, 0)).toBe(r.residueCount);
      expect(r.fragments[0]!.startResidue).toBe(0);
      expect(r.fragments[r.fragments.length - 1]!.endResidue).toBe(r.residueCount - 1);
      // Guide points are 4 per residue, per fragment.
      expect(r.totalGuidePoints).toBe(r.residueCount * r.guidePointsPerResidue);
    }
  });

  it('splits the supporting chains into blocks that sum to the binary layout', () => {
    for (const sys of ['gq', 'gi'] as const) {
      const g = meta.gprotein[sys];
      const summed = g.chains.reduce((n, c) => n + c.residueCount, 0);
      expect(summed).toBe(g.totalResidues);
      for (const c of g.chains) expect(c.ss.length).toBe(c.residueCount);
    }
  });

  it('places the bilayer on Z, not Y — the field name is a trap', () => {
    // The subject straddles the midplane along the bilayer normal. Slice the
    // real frame 0 and check which axis that actually holds for.
    const meta0 = readMeta();
    const traj = decodeTrajectory(
      readBin(meta0.systems.gq.file),
      meta0.systems.gq.frameCount,
      meta0.receptor.gq.residueCount,
      meta0.gprotein.gq.totalResidues,
      meta0.ligand.heavyAtomCount,
    );
    const { receptor } = frameSlice(traj, 0);
    const n = meta0.receptor.gq.residueCount;
    const mean = [0, 0, 0];
    for (let r = 0; r < n; r++)
      for (let ax = 0; ax < 3; ax++) mean[ax]! += receptor[r * 6 + ax]! / n;

    const midplane = meta0.membrane.gq.midplaneY;
    // Z tracks the midplane within a couple of Å…
    expect(Math.abs(mean[2]! - midplane)).toBeLessThan(3);
    // …and Y emphatically does not. If this ever inverts, the mount's
    // stand-upright rotation is wrong.
    expect(Math.abs(mean[1]! - midplane)).toBeGreaterThan(10);
  });

  it('measures a physically real bilayer thickness', () => {
    for (const sys of ['gq', 'gi'] as const) {
      expect(meta.membrane[sys].thickness).toBeGreaterThan(30);
      expect(meta.membrane[sys].thickness).toBeLessThan(45);
    }
  });

  it('maps every residue of the smaller construct onto the larger for the later morph', () => {
    const m = meta.receptor.sharedMap;
    expect(m.gqResidueIndices.length).toBe(m.count);
    expect(m.giResidueIndices.length).toBe(m.count);
    expect(m.count).toBeLessThanOrEqual(meta.receptor.gi.residueCount);
    for (let i = 0; i < m.count; i++) {
      expect(m.gqResidueIndices[i]!).toBeLessThan(meta.receptor.gq.residueCount);
      expect(m.giResidueIndices[i]!).toBeLessThan(meta.receptor.gi.residueCount);
    }
  });
});
