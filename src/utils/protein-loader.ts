// src/utils/protein-loader.ts
// Fetch + decode the offline-pipeline output (protein-meta.json and the two
// trajectory binaries). The binary format ships per-residue Cα + carbonyl-O
// positions per frame — the TS renderer computes splines and normals from
// these at runtime. All molecular biology happened in the Python pipeline;
// this loader does only network + typed-array slicing.

// ---- Metadata interfaces (mirrors protein-meta.json) ----

export interface SystemInfo {
  file: string;
  frameCount: number;
  timestepNs: number;
  totalTimeNs: number;
}

export interface ReceptorFragment {
  startResidue: number;
  endResidue: number;
  count: number;
}

export interface ReceptorSystem {
  residueCount: number;
  guidePointsPerResidue: number;
  totalGuidePoints: number;
  fragments: ReceptorFragment[];
  ss: string;
  rmsf: number[];
  litResids: number[];
  regions: string[];
  bindingPocketLitResids: number[];
  aromaticCageLitResids: number[];
  referenceNormals: number[];
}

export interface SharedMap {
  count: number;
  gqResidueIndices: number[];
  giResidueIndices: number[];
}

export interface GProteinChain {
  name: string;
  residueCount: number;
  ss: string;
}

export interface GProteinSystem {
  chains: GProteinChain[];
  totalResidues: number;
}

export interface LigandInfo {
  heavyAtomCount: number;
  bonds: [number, number][];
}

export interface MembraneInfo {
  /**
   * Bilayer midplane along the raw box's **Z** axis, in Ångström — despite the
   * name, which the v1 schema fixed before the pipeline chose its axis. The
   * bilayer normal is +Z: verified against the shipped assets, where the
   * subject's own Z centroid (89.52) sits on this value (88.78) while the
   * supporting chains hang below it to Z = −6.44, and `thickness` measures a
   * physically correct bilayer across the same axis.
   *
   * Assigning this to a `.y` is therefore always wrong. The scene stands the
   * structure upright with a −90° X rotation at the mount (see ProteinMesh),
   * which is what puts the bilayer in the world's horizontal plane.
   *
   * The key stays as-is because it is the shipped contract with the committed
   * binaries; renaming it would mean re-running the pipeline and re-validating
   * for no behavioural gain.
   */
  midplaneY: number;
  thickness: number;
  radius: number;
}

export interface ProteinMeta {
  format: string;
  systems: Record<'gq' | 'gi', SystemInfo>;
  receptor: {
    gq: ReceptorSystem;
    gi: ReceptorSystem;
    sharedMap: SharedMap;
  };
  gprotein: Record<'gq' | 'gi', GProteinSystem>;
  ligand: LigandInfo;
  membrane: Record<'gq' | 'gi', MembraneInfo>;
}

// ---- Trajectory decode ----

export interface TrajectoryFrames {
  buffer: Float32Array;
  floatsPerFrame: number;
  frameCount: number;
  receptorFloats: number;
  gproteinFloats: number;
  ligandFloats: number;
}

export interface FrameSlice {
  receptor: Float32Array;
  gprotein: Float32Array;
  ligand: Float32Array;
}

export interface ProteinData {
  meta: ProteinMeta;
  gq: TrajectoryFrames;
  gi: TrajectoryFrames;
}

export function decodeTrajectory(
  buffer: ArrayBuffer,
  frameCount: number,
  receptorResidues: number,
  gproteinResidues: number,
  ligandAtoms: number,
): TrajectoryFrames {
  const receptorFloats = receptorResidues * 6;
  const gproteinFloats = gproteinResidues * 6;
  const ligandFloats = ligandAtoms * 3;
  const floatsPerFrame = receptorFloats + gproteinFloats + ligandFloats;
  const expectedBytes = floatsPerFrame * 4 * frameCount;
  if (buffer.byteLength !== expectedBytes) {
    throw new Error(
      `protein-loader: expected ${expectedBytes} bytes ` +
        `(${frameCount} frames × ${floatsPerFrame} floats × 4), got ${buffer.byteLength}`,
    );
  }
  return {
    buffer: new Float32Array(buffer),
    floatsPerFrame,
    frameCount,
    receptorFloats,
    gproteinFloats,
    ligandFloats,
  };
}

export function frameSlice(traj: TrajectoryFrames, frame: number): FrameSlice {
  const base = frame * traj.floatsPerFrame;
  const rEnd = base + traj.receptorFloats;
  const gEnd = rEnd + traj.gproteinFloats;
  const lEnd = gEnd + traj.ligandFloats;
  return {
    receptor: traj.buffer.subarray(base, rEnd),
    gprotein: traj.buffer.subarray(rEnd, gEnd),
    ligand: traj.buffer.subarray(gEnd, lEnd),
  };
}

// ---- Network fetch ----

function decodeSys(meta: ProteinMeta, sys: 'gq' | 'gi', buffer: ArrayBuffer): TrajectoryFrames {
  return decodeTrajectory(
    buffer,
    meta.systems[sys].frameCount,
    meta.receptor[sys].residueCount,
    meta.gprotein[sys].totalResidues,
    meta.ligand.heavyAtomCount,
  );
}

export async function loadProteinData(basePath = '/protein'): Promise<ProteinData> {
  const metaRes = await fetch(`${basePath}/protein-meta.json`);
  if (!metaRes.ok) throw new Error(`protein-loader: failed to fetch metadata (${metaRes.status})`);
  const meta: ProteinMeta = await metaRes.json();

  const [gqBuf, giBuf] = await Promise.all([
    fetch(`${basePath}/${meta.systems.gq.file}`).then((r) => {
      if (!r.ok) throw new Error(`protein-loader: failed to fetch gq trajectory (${r.status})`);
      return r.arrayBuffer();
    }),
    fetch(`${basePath}/${meta.systems.gi.file}`).then((r) => {
      if (!r.ok) throw new Error(`protein-loader: failed to fetch gi trajectory (${r.status})`);
      return r.arrayBuffer();
    }),
  ]);

  return {
    meta,
    gq: decodeSys(meta, 'gq', gqBuf),
    gi: decodeSys(meta, 'gi', giBuf),
  };
}
