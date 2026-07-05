// src/utils/arbor-generator.ts
// Pure, seeded branching generator for the second scale's tree — the arbor.
// Grows a trunk, splits it into three major limbs at unequal azimuths, then
// recurses into fine strands (both from the spine tips and as side sprouts
// along the spines, so the canopy fills instead of reading as tufts on
// sticks). Output is a flat node list ready for the geometry builders:
// spine regions ('trunk'/'limb') become the swept solid tubes, 'strand'
// nodes become the emissive ribbon periphery. Deterministic per seed —
// zero imports, foundation layer like math.ts.

export type Vec3 = [number, number, number];

export interface ArborGrowthParams {
  seed: number;
  /** Trunk: node count, total height, base radius. */
  trunkSegments: number;
  trunkLength: number;
  trunkRadius: number;
  /** Major limb spines: nodes per spine, length, base radius, angle off
   *  vertical (deg), and wander strength along the spine. */
  limbSegments: number;
  limbLength: number;
  limbRadius: number;
  limbSpreadDeg: number;
  limbCurl: number;
  /** Fine periphery: recursion depth, children per split, angular spread
   *  (deg), per-generation length/radius decay, wander, and the probability
   *  that an intermediate spine node sprouts a side strand. */
  fineLevels: number;
  fineSplits: number;
  fineSpreadDeg: number;
  fineLengthTaper: number;
  fineRadiusTaper: number;
  fineCurl: number;
  sideSproutRate: number;
  /** Recursion hard stop: no strand thinner than this is grown. */
  strandRadiusFloor: number;
}

export type LimbIndex = 0 | 1 | 2;

export interface ArborNode {
  position: Vec3;
  radius: number;
  /** Index of the parent node; -1 only for the root. Parents always precede
   *  their children in the list (the sweep builders rely on it). */
  parent: number;
  /** Which major limb this node belongs to; -1 = shared trunk. */
  limb: -1 | LimbIndex;
  /** Growth generation counter (trunk rings count up from 0). */
  level: number;
  region: 'trunk' | 'limb' | 'strand';
  /** Normalized cumulative path length from the root: 0 at the base, 1 at
   *  the deepest tip. Drives the solid→luminous gradient. */
  t: number;
}

// Deliberately organic defaults: three limbs of unequal reach, canopy filled
// by side sprouts. Values iterate via the arbor dev panel and freeze here.
export const ARBOR_GROWTH_DEFAULTS: ArborGrowthParams = {
  seed: 7,
  trunkSegments: 5,
  trunkLength: 7,
  trunkRadius: 0.85,
  limbSegments: 9,
  limbLength: 14,
  limbRadius: 0.6,
  limbSpreadDeg: 42,
  limbCurl: 0.35,
  fineLevels: 6,
  fineSplits: 2,
  fineSpreadDeg: 28,
  fineLengthTaper: 0.72,
  fineRadiusTaper: 0.68,
  fineCurl: 0.5,
  sideSproutRate: 0.35,
  strandRadiusFloor: 0.015,
};

/** Compact deterministic PRNG (mulberry32) — one stream per generateArbor call. */
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

/** Orthonormal frame around `dir` (same ref-axis guard as the shaders). */
function frame(dir: Vec3): { t: Vec3; b: Vec3 } {
  const ref: Vec3 = Math.abs(dir[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
  const t = normalize([
    dir[1] * ref[2] - dir[2] * ref[1],
    dir[2] * ref[0] - dir[0] * ref[2],
    dir[0] * ref[1] - dir[1] * ref[0],
  ]);
  const b: Vec3 = [
    dir[1] * t[2] - dir[2] * t[1],
    dir[2] * t[0] - dir[0] * t[2],
    dir[0] * t[1] - dir[1] * t[0],
  ];
  return { t, b };
}

/** Tilt `dir` by `angle` radians toward the azimuth `az` in its own frame. */
function coneSpread(dir: Vec3, angle: number, az: number): Vec3 {
  const { t, b } = frame(dir);
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const lat: Vec3 = [
    t[0] * Math.cos(az) + b[0] * Math.sin(az),
    t[1] * Math.cos(az) + b[1] * Math.sin(az),
    t[2] * Math.cos(az) + b[2] * Math.sin(az),
  ];
  return normalize([dir[0] * c + lat[0] * s, dir[1] * c + lat[1] * s, dir[2] * c + lat[2] * s]);
}

/** Small random wander of a direction — the organic crookedness dial. */
function wander(dir: Vec3, amount: number, rng: () => number): Vec3 {
  return normalize([
    dir[0] + (rng() * 2 - 1) * amount,
    dir[1] + (rng() * 2 - 1) * amount,
    dir[2] + (rng() * 2 - 1) * amount,
  ]);
}

const DEG = Math.PI / 180;

// Unequal base azimuths for the three limbs — deliberately NOT 120°-symmetric
// (the same asymmetry ethos as the shell's mirrored halves).
const LIMB_AZIMUTHS = [0.4, 2.1, 4.35];

export function generateArbor(params: ArborGrowthParams): ArborNode[] {
  const rng = mulberry32(params.seed);
  const nodes: ArborNode[] = [];

  const push = (
    position: Vec3,
    radius: number,
    parent: number,
    limb: -1 | LimbIndex,
    level: number,
    region: ArborNode['region'],
  ): number => {
    nodes.push({ position, radius, parent, limb, level, region, t: 0 });
    return nodes.length - 1;
  };

  // --- Trunk: root upward with a slight wander, radius easing in. ---
  let trunkDir: Vec3 = [0, 1, 0];
  const trunkStep = params.trunkLength / params.trunkSegments;
  let cursor = push([0, 0, 0], params.trunkRadius, -1, -1, 0, 'trunk');
  for (let i = 1; i <= params.trunkSegments; i++) {
    trunkDir = wander(trunkDir, 0.07, rng);
    const prev = nodes[cursor]!;
    const radius = params.trunkRadius * (1 - 0.15 * (i / params.trunkSegments));
    cursor = push(
      [
        prev.position[0] + trunkDir[0] * trunkStep,
        prev.position[1] + trunkDir[1] * trunkStep,
        prev.position[2] + trunkDir[2] * trunkStep,
      ],
      radius,
      cursor,
      -1,
      i,
      'trunk',
    );
  }
  const trunkTip = cursor;

  // --- Fine strand recursion (shared by tip crowns and side sprouts). ---
  const growStrand = (
    parent: number,
    dir: Vec3,
    length: number,
    radius: number,
    level: number,
    limb: LimbIndex,
  ): void => {
    if (radius < params.strandRadiusFloor || level > params.fineLevels) return;
    const bent = wander(dir, params.fineCurl * 0.3, rng);
    const from = nodes[parent]!;
    // Radius may only shrink along an edge — clamp against the parent.
    const r = Math.min(radius, from.radius);
    const idx = push(
      [
        from.position[0] + bent[0] * length,
        from.position[1] + bent[1] * length,
        from.position[2] + bent[2] * length,
      ],
      r,
      parent,
      limb,
      level,
      'strand',
    );
    for (let s = 0; s < params.fineSplits; s++) {
      const az = (s / params.fineSplits) * Math.PI * 2 + (rng() * 2 - 1) * 0.8;
      const spread = params.fineSpreadDeg * DEG * (0.7 + rng() * 0.6);
      growStrand(
        idx,
        coneSpread(bent, spread, az),
        length * params.fineLengthTaper,
        r * params.fineRadiusTaper,
        level + 1,
        limb,
      );
    }
  };

  // --- Three major limb spines from the trunk tip. ---
  const spineStep = params.limbLength / params.limbSegments;
  const limbTipRadius = Math.max(params.limbRadius * 0.22, params.strandRadiusFloor * 3);
  for (const limb of [0, 1, 2] as const) {
    const az = LIMB_AZIMUTHS[limb]! + (rng() * 2 - 1) * 0.25;
    // Wide per-limb variety — spread AND reach differ limb to limb, so the
    // crown never reads as a symmetric trident.
    const spread = params.limbSpreadDeg * DEG * (0.7 + rng() * 0.7);
    const reach = spineStep * (0.85 + rng() * 0.45);
    let dir = coneSpread([0, 1, 0], spread, az);
    let spineCursor = trunkTip;
    for (let i = 1; i <= params.limbSegments; i++) {
      // Wander plus an upward pull growing toward the tips — limbs sweep out,
      // then lift as they thin, the classic silhouette.
      dir = wander(dir, (params.limbCurl / params.limbSegments) * 2.2, rng);
      dir = normalize([dir[0], dir[1] + 0.045 * (i / params.limbSegments), dir[2]]);
      const prev = nodes[spineCursor]!;
      const k = i / params.limbSegments;
      const radius = params.limbRadius + (limbTipRadius - params.limbRadius) * Math.pow(k, 1.2);
      spineCursor = push(
        [
          prev.position[0] + dir[0] * reach,
          prev.position[1] + dir[1] * reach,
          prev.position[2] + dir[2] * reach,
        ],
        Math.min(radius, prev.radius),
        spineCursor,
        limb,
        i,
        'limb',
      );
      // Side sprouts along the spine (skip the junction zone) fill the canopy.
      if (i >= 2 && i < params.limbSegments && rng() < params.sideSproutRate) {
        const sproutAz = rng() * Math.PI * 2;
        growStrand(
          spineCursor,
          coneSpread(dir, params.fineSpreadDeg * DEG * 1.5, sproutAz),
          reach * params.fineLengthTaper * 1.3,
          nodes[spineCursor]!.radius * params.fineRadiusTaper * 0.8,
          2, // side sprouts start deeper so their subtrees stay small
          limb,
        );
      }
    }
    // Tip crown: a burst of initial strands continuing past the spine.
    for (let s = 0; s < params.fineSplits + 1; s++) {
      const crownAz = (s / (params.fineSplits + 1)) * Math.PI * 2 + rng() * 0.9;
      growStrand(
        spineCursor,
        coneSpread(dir, params.fineSpreadDeg * DEG * (0.4 + rng() * 0.8), crownAz),
        reach * 1.1,
        nodes[spineCursor]!.radius * params.fineRadiusTaper,
        1,
        limb,
      );
    }
  }

  // --- Second pass: t = cumulative path length from root, normalized. ---
  const pathLen = new Float64Array(nodes.length);
  let maxLen = 0;
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i]!;
    const p = nodes[n.parent]!;
    const dx = n.position[0] - p.position[0];
    const dy = n.position[1] - p.position[1];
    const dz = n.position[2] - p.position[2];
    pathLen[i] = pathLen[n.parent]! + Math.hypot(dx, dy, dz);
    maxLen = Math.max(maxLen, pathLen[i]!);
  }
  if (maxLen > 0) {
    for (let i = 0; i < nodes.length; i++) nodes[i]!.t = pathLen[i]! / maxLen;
  }

  return nodes;
}

/** The deepest node of one limb — card anchor + focus-pose reference. */
export function limbTipNode(nodes: ArborNode[], limb: LimbIndex): ArborNode {
  let best: ArborNode | null = null;
  for (const n of nodes) {
    if (n.limb === limb && (best === null || n.t > best.t)) best = n;
  }
  if (!best) throw new Error(`arbor: limb ${limb} has no nodes`);
  return best;
}
