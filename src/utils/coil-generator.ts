// src/utils/coil-generator.ts
// Pure, seeded generator for the third band's coil — an open rising helix of
// drum-shaped beads threaded along a fiber path. Emits a flat bead list
// ready for the geometry builders: bead centers with parallel-transport
// frames (for oriented drum geometry) and two marked publication regions.
//
// Approach-B open state: the unwind interaction re-runs this WHOLE pipeline
// per animation tick with an `open` argument — the focused region's beads are
// placed by the same solenoid formula with three multipliers lerped toward
// the open-arc values, then the spacing floor and transport frames recompute
// over the result. Every intermediate state is a genuine re-coiled
// conformation (discs re-orient with the local path, seam neighbors tilt
// toward the opening), not a straight-line blend between two snapshots.
// Deterministic per seed — zero imports, foundation layer like math.ts and
// arbor-generator.ts.

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
  /** Per-bead radius variation (± fraction of beadRadius, seeded) — breaks
   *  the stamped-uniform read; 0 = every drum identical. */
  radiusJitter: number;
  /** Thread sag between consecutive beads (geometry-consumed). */
  linkerSag: number;
  /** Beads per publication region and the t-domain separation between the
   *  two region centers (symmetric around the coil midpoint). */
  regionSize: number;
  regionGap: number;
}

export interface CoilOpenState {
  /** Which publication region is opening. */
  region: 0 | 1;
  /** 0 = compact … 1 = fully open (clamped). The pipeline re-runs at every
   *  value, so an animation tweens THIS parameter, not bead positions. */
  openT: number;
}

export interface CoilNode {
  /** Placement for the requested open state (compact when none). */
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
  /** The fully open (openT = 1) placement — reference target the animated
   *  pipeline lands on. Identical to `position` for region -1 beads — only
   *  a focused region ever moves. */
  unwoundPosition: Vec3;
}

// Open-rising-coil defaults per the 5.5 modeling-fidelity pass (2026-07-07).
// The earlier dense-cluster packing (106 beads, pitch 0.5 — the 5.1 sign-off
// values) read as a lumpy wall; recognizability of the wound-spool structure
// now wins over density. 9 drums per turn (54 gaps / 6 turns) on a smaller
// radius leaves a clearly visible hollow core, and the raised pitch clears
// each turn over the drum diameter (2·beadRadius = 1.0 < 1.05) — a rising
// spiral staircase of drums. Natural spacing ≈ 1.54 keeps the spacing floor
// (1.05 at these values) inactive at defaults, and the ~0.54 rim-to-rim gap
// leaves room for the wound-thread bridges between drums. jitter stays 0.08
// — the register is organic; the open spacing means the irregularity never
// approaches the floor. regionSize 15 → 9 = one full
// turn per publication locus (≥ 5 for loopArcPairs, ≤ count/3). regionGap
// 0.375 unchanged (5.4 rationale): 2.25 revolutions between the two locus
// centers keeps them ~80° apart on the rim, so labels and unwind bearings
// never stack at one azimuth.
// 5.6 feedback retune: pitch 1.05 → 1.18 opens a real gap between stacked
// turns (the near-touching turns read as cracked columns face-on), and the
// raised jitter + new radiusJitter make the stack loosely coiled and
// hand-wound instead of stamped.
export const COIL_GROWTH_DEFAULTS: CoilGrowthParams = {
  seed: 11,
  beadCount: 55,
  coilRadius: 2.2,
  coilPitch: 1.18,
  coilTurns: 6,
  beadRadius: 0.5,
  beadAspect: 0.62,
  jitter: 0.12,
  radiusJitter: 0.12,
  linkerSag: 0.1,
  regionSize: 9,
  regionGap: 0.375,
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

export function generateCoil(params: CoilGrowthParams, open?: CoilOpenState | null): CoilNode[] {
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

  // Jitter offsets drawn up front (one per bead). The stream depends only on
  // the seed — never on the open state — so every openT of the same coil
  // shares the same organic irregularity. Radius factors draw AFTER the
  // offsets so adding them (5.6) left every seed's positions untouched.
  const jitterOffsets: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    jitterOffsets.push([
      (rng() * 2 - 1) * jitterAmp,
      (rng() * 2 - 1) * jitterAmp,
      (rng() * 2 - 1) * jitterAmp,
    ]);
  }
  const radiusFactors: number[] = [];
  for (let i = 0; i < count; i++) {
    radiusFactors.push(1 + (rng() * 2 - 1) * Math.max(0, Math.min(params.radiusJitter, 0.4)));
  }

  // --- Publication regions: centers symmetric around the coil midpoint,
  // separated by regionGap in the t domain; each spans regionSize beads.
  // Computed from count and params alone, ahead of placement — the placement
  // loop routes the opening region's beads through the open formula. ---
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

  // Open-state placement family: one formula that IS the compact solenoid at
  // openT 0 (all three multipliers 1) and IS the unwound arc at openT 1 — a
  // wider, taller arc with each bead's angle stretched away from the region
  // center. The unwind tweens openT, so intermediate shapes come from HERE,
  // not from blending two endpoint snapshots.
  const openAt = (i: number, centerIdx: number, t: number): Vec3 => {
    const theta = thetaFor(i);
    const thetaC = thetaFor(centerIdx);
    const radiusMult = 1 + (UNWOUND_RADIUS_MULT - 1) * t;
    const pitchMult = 1 + (UNWOUND_PITCH_MULT - 1) * t;
    const spreadMult = 1 + (UNWOUND_SPREAD - 1) * t;
    const thetaS = thetaC + (theta - thetaC) * spreadMult;
    const centerY = pitchPerRad * thetaC - totalHeight / 2;
    const j = jitterOffsets[i]!;
    return [
      params.coilRadius * radiusMult * Math.cos(thetaS) + j[0],
      centerY + (thetaS - thetaC) * pitchPerRad * pitchMult + j[1],
      params.coilRadius * radiusMult * Math.sin(thetaS) + j[2],
    ];
  };

  // Strictly-positive gate keeps openT 0 (and no open arg) on the exact
  // compact code path — bitwise-identical output, provable in tests.
  const openT = open ? Math.min(1, Math.max(0, open.openT)) : 0;
  const openRegion = open != null && openT > 0 ? open.region : null;

  const positions: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    if (openRegion !== null && regionFor(i) === openRegion) {
      positions.push(openAt(i, regionCenterIndex[openRegion], openT));
    } else {
      const base = compactAt(thetaFor(i));
      const j = jitterOffsets[i]!;
      positions.push([base[0] + j[0], base[1] + j[1], base[2] + j[2]]);
    }
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
      radius: params.beadRadius * radiusFactors[i]!,
      index: i,
      t: i / (count - 1),
      region,
      unwoundPosition:
        region === -1
          ? [position[0], position[1], position[2]]
          : openAt(i, regionCenterIndex[region], 1),
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
