// src/utils/coil-generator.ts
// Pure, seeded generator for the third band's coil — a dense solenoid of
// oblate beads threaded along a helical fiber path. Emits a flat bead list
// ready for the geometry builders: bead centers with parallel-transport
// frames (for oriented disc geometry), two marked publication regions, and
// per-bead unwound morph targets (the open state the focus interaction
// blends toward in a later stage). Deterministic per seed — zero imports,
// foundation layer like math.ts and arbor-generator.ts.

export type Vec3 = [number, number, number];

export interface CoilGrowthParams {
  seed: number;
  /** Total beads threaded along the fiber. */
  beadCount: number;
  /** Helix path radius, vertical rise per revolution, and revolutions —
   *  together these set the packing density of the cluster. */
  coilRadius: number;
  coilPitch: number;
  coilTurns: number;
  /** Bead size: base radius and the squish factor along the thread axis
   *  (< 1 = disc-like, flat faces perpendicular to the fiber). */
  beadRadius: number;
  beadAspect: number;
  /** Per-bead positional noise. Clamped internally against the natural
   *  bead spacing so a dev-panel slider can never interpenetrate beads. */
  jitter: number;
  /** Thread sag between consecutive beads (geometry-consumed). */
  linkerSag: number;
  /** Beads per publication region and the t-domain separation between the
   *  two region centers (symmetric around the coil midpoint). */
  regionSize: number;
  regionGap: number;
}

export interface CoilNode {
  /** Compact placement (the default, tightly packed state). */
  position: Vec3;
  /** Parallel-transport frame at the bead — twist-free along the path. */
  tangent: Vec3;
  normal: Vec3;
  binormal: Vec3;
  radius: number;
  index: number;
  /** Arc-length fraction along the fiber, 0 at the start, 1 at the end. */
  t: number;
  /** -1 = unassigned, 0/1 = publication region membership. */
  region: -1 | 0 | 1;
  /** Morph target for the open state. Identical to `position` for
   *  region -1 beads — only a focused region ever moves. */
  unwoundPosition: Vec3;
}

// Dense-cluster defaults per the phase design spec: tight pitch relative to
// bead size so adjacent turns press close (the compressed, crystalline read),
// while along-thread spacing leaves short taut threads visible between discs.
export const COIL_GROWTH_DEFAULTS: CoilGrowthParams = {
  seed: 11,
  beadCount: 96,
  coilRadius: 2.8,
  coilPitch: 0.55,
  coilTurns: 6,
  beadRadius: 0.45,
  beadAspect: 0.6,
  jitter: 0.08,
  linkerSag: 0.12,
  regionSize: 15,
  regionGap: 0.33,
};

// Unwound-state shape: the open arc is wider and taller than the compact
// coil, with beads spread further apart along it (the third multiplier
// stretches each bead's angle away from the region center).
const UNWOUND_RADIUS_MULT = 3;
const UNWOUND_PITCH_MULT = 2;
const UNWOUND_SPREAD = 1.8;

/** Compact deterministic PRNG (mulberry32) — one stream per generateCoil call. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function generateCoil(params: CoilGrowthParams): CoilNode[] {
  const rng = mulberry32(params.seed);
  const count = Math.max(4, Math.floor(params.beadCount));
  const turnAngle = params.coilTurns * Math.PI * 2;
  const pitchPerRad = params.coilPitch / (Math.PI * 2);
  const totalHeight = params.coilPitch * params.coilTurns;

  // A helix parametrized by angle is a constant-speed curve, so equal-angle
  // steps ARE equal arc-length steps — no numeric integration needed.
  const speed = Math.hypot(params.coilRadius, pitchPerRad);
  const naturalSpacing = (speed * turnAngle) / (count - 1);
  const jitterAmp = Math.min(params.jitter, naturalSpacing * 0.35);

  const thetaFor = (i: number): number => (i / (count - 1)) * turnAngle;
  // Vertically centered on the origin so world placement and orbit pivots
  // act on the cluster's middle, not its base.
  const compactAt = (theta: number): Vec3 => [
    params.coilRadius * Math.cos(theta),
    pitchPerRad * theta - totalHeight / 2,
    params.coilRadius * Math.sin(theta),
  ];

  // Jitter offsets drawn up front (one per bead) so the compact and unwound
  // placements share the same organic irregularity.
  const jitterOffsets: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    jitterOffsets.push([
      (rng() * 2 - 1) * jitterAmp,
      (rng() * 2 - 1) * jitterAmp,
      (rng() * 2 - 1) * jitterAmp,
    ]);
  }

  const positions: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const base = compactAt(thetaFor(i));
    const j = jitterOffsets[i]!;
    positions.push([base[0] + j[0], base[1] + j[1], base[2] + j[2]]);
  }

  // Spacing floor (forward sweep): consecutive beads may never sit closer
  // than the floor, regardless of seed or slider values — each pair is fixed
  // by pushing the downstream bead out along the pair axis, and the next
  // iteration re-checks the pair that push affected. Structural guarantee,
  // not a defaults-only coincidence.
  const spacingFloor = Math.min(2 * params.beadRadius * 1.05, naturalSpacing * 0.95);
  for (let i = 1; i < count; i++) {
    const a = positions[i - 1]!;
    const b = positions[i]!;
    const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(d[0], d[1], d[2]);
    if (len < spacingFloor) {
      // Degenerate coincident pair: separate along the analytic tangent.
      const dir: Vec3 =
        len > 1e-9
          ? [d[0] / len, d[1] / len, d[2] / len]
          : normalize([-Math.sin(thetaFor(i)), pitchPerRad, Math.cos(thetaFor(i))]);
      positions[i] = [
        a[0] + dir[0] * spacingFloor,
        a[1] + dir[1] * spacingFloor,
        a[2] + dir[2] * spacingFloor,
      ];
    }
  }

  // --- Publication regions: centers symmetric around the coil midpoint,
  // separated by regionGap in the t domain; each spans regionSize beads. ---
  const regionSize = Math.max(1, Math.min(Math.floor(params.regionSize), Math.floor(count / 3)));
  const half = Math.floor(regionSize / 2);
  const center0 = Math.round((0.5 - params.regionGap / 2) * (count - 1));
  const center1 = Math.round((0.5 + params.regionGap / 2) * (count - 1));
  const r0Start = Math.max(0, Math.min(center0 - half, count - 2 * regionSize - 1));
  const r0End = r0Start + regionSize - 1;
  // Region 1 never overlaps region 0, whatever the gap slider says.
  const r1Start = Math.min(Math.max(center1 - half, r0End + 2), count - regionSize);
  const r1End = r1Start + regionSize - 1;
  const regionFor = (i: number): -1 | 0 | 1 => {
    if (i >= r0Start && i <= r0End) return 0;
    if (i >= r1Start && i <= r1End) return 1;
    return -1;
  };
  const regionCenterIndex: [number, number] = [
    Math.round((r0Start + r0End) / 2),
    Math.round((r1Start + r1End) / 2),
  ];

  // Unwound morph target: same solenoid formula on a wider, taller arc, with
  // each bead's angle stretched away from the region center for the further
  // spacing of the open state. Non-region beads never move.
  const unwoundAt = (i: number, centerIdx: number): Vec3 => {
    const theta = thetaFor(i);
    const thetaC = thetaFor(centerIdx);
    const spread = thetaC + (theta - thetaC) * UNWOUND_SPREAD;
    const centerY = pitchPerRad * thetaC - totalHeight / 2;
    const j = jitterOffsets[i]!;
    return [
      params.coilRadius * UNWOUND_RADIUS_MULT * Math.cos(spread) + j[0],
      centerY + (spread - thetaC) * pitchPerRad * UNWOUND_PITCH_MULT + j[1],
      params.coilRadius * UNWOUND_RADIUS_MULT * Math.sin(spread) + j[2],
    ];
  };

  // --- Parallel-transport frames from the final (jittered + floored)
  // positions, so oriented discs match what actually renders. Finite
  // differences for tangents; the side vector is projected off each new
  // tangent instead of rebuilt, which kills Frenet twist artifacts. ---
  const tangents: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const ahead = positions[Math.min(i + 1, count - 1)]!;
    const behind = positions[Math.max(i - 1, 0)]!;
    tangents.push(normalize([ahead[0] - behind[0], ahead[1] - behind[1], ahead[2] - behind[2]]));
  }
  const first = tangents[0]!;
  // Same reference-axis guard as the arbor generator and the shaders: a dev
  // panel pushing the pitch near-vertical must not degenerate the frame.
  const ref: Vec3 = Math.abs(first[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
  let side = normalize(cross(first, ref));
  const nodes: CoilNode[] = [];
  for (let i = 0; i < count; i++) {
    const tangent = tangents[i]!;
    const k = dot(side, tangent);
    let projected: Vec3 = [
      side[0] - tangent[0] * k,
      side[1] - tangent[1] * k,
      side[2] - tangent[2] * k,
    ];
    if (Math.hypot(projected[0], projected[1], projected[2]) < 1e-6) {
      projected = cross(tangent, ref);
    }
    side = normalize(projected);
    const binormal = cross(tangent, side);
    const region = regionFor(i);
    const position = positions[i]!;
    nodes.push({
      position,
      tangent,
      normal: side,
      binormal,
      radius: params.beadRadius,
      index: i,
      t: i / (count - 1),
      region,
      unwoundPosition:
        region === -1
          ? [position[0], position[1], position[2]]
          : unwoundAt(i, regionCenterIndex[region]),
    });
  }

  return nodes;
}

/** Bead indices belonging to one publication region, in fiber order. */
export function regionBeadIndices(nodes: CoilNode[], regionIndex: 0 | 1): number[] {
  const indices: number[] = [];
  for (const n of nodes) {
    if (n.region === regionIndex) indices.push(n.index);
  }
  return indices;
}

/** Center of a region's compact placement — the annotation card anchor. */
export function regionAnchor(nodes: CoilNode[], regionIndex: 0 | 1): Vec3 {
  const indices = regionBeadIndices(nodes, regionIndex);
  if (indices.length === 0) throw new Error(`coil: region ${regionIndex} has no beads`);
  const sum: Vec3 = [0, 0, 0];
  for (const i of indices) {
    const p = nodes[i]!.position;
    sum[0] += p[0];
    sum[1] += p[1];
    sum[2] += p[2];
  }
  return [sum[0] / indices.length, sum[1] / indices.length, sum[2] / indices.length];
}

/**
 * Deterministic pairs of distant same-region beads — the endpoints the loop
 * arcs will connect when the region is focused (rendered in a later stage).
 * Derived from region order alone, no randomness: same nodes, same pairs.
 */
export function loopArcPairs(nodes: CoilNode[], regionIndex: 0 | 1): [number, number][] {
  const indices = regionBeadIndices(nodes, regionIndex);
  const n = indices.length;
  if (n < 5) return [];
  const offsetPairs: [number, number][] = [
    [0, n - 1],
    [1, Math.floor(n * 0.7)],
    [Math.floor(n * 0.2), n - 2],
    [Math.floor(n * 0.35), n - 1],
    [0, Math.floor(n * 0.55)],
  ];
  const pairs: [number, number][] = [];
  const seen = new Set<string>();
  for (const [a, b] of offsetPairs) {
    if (Math.abs(a - b) < 3) continue;
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push([indices[a]!, indices[b]!]);
  }
  return pairs;
}

/**
 * Approach-B seam: returns a copy with one region's beads repositioned onto
 * an open arc — a radial scale to `openRadius` about the coil axis plus a
 * vertical stretch by `openPitch` about the region's own center height.
 * Self-contained over the node list (no growth params needed); callers doing
 * a full CPU-rebuild open state would regenerate frames afterward. Not wired
 * to any render path in this stage.
 */
export function unwindRegion(
  nodes: CoilNode[],
  regionIndex: 0 | 1,
  openRadius: number,
  openPitch: number,
): CoilNode[] {
  const indices = regionBeadIndices(nodes, regionIndex);
  if (indices.length === 0) return nodes.map((n) => ({ ...n }));
  let centerY = 0;
  for (const i of indices) centerY += nodes[i]!.position[1];
  centerY /= indices.length;
  const members = new Set(indices);
  return nodes.map((n) => {
    if (!members.has(n.index)) return { ...n };
    const [x, y, z] = n.position;
    const radial = Math.hypot(x, z) || 1;
    const scale = openRadius / radial;
    const position: Vec3 = [x * scale, centerY + (y - centerY) * openPitch, z * scale];
    return { ...n, position };
  });
}
