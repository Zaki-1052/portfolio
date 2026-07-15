// src/utils/protein-loader.test.ts
// Validate the decode + slice logic against a small synthetic binary.
// No network tests — only the pure typed-array math.
import { describe, expect, it } from 'vitest';
import { decodeTrajectory, frameSlice } from './protein-loader';

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
