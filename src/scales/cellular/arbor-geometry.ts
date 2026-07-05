// src/scales/cellular/arbor-geometry.ts
// Turns the pure generator's node list into three GPU-ready geometries:
//   · trunk + limb spines — ONE merged tapered-tube sweep (parallel-transport
//     frames, so curved spines never twist), hand-built typed arrays like
//     buildCloudGeometry — no merge utils, 1 draw call;
//   · fine strands — camera-facing ribbon quads (billboard axis computed in
//     the vertex stage; WebGL lines clamp to 1px and can't taper), 1 draw call;
//   · tips — one Points buffer over the leaf nodes (soft additive sprites).
// Per-vertex seeds hash from NODE indices (not edges) so adjacent ribbon
// segments and their tip sprites sway as one connected piece.
import { BufferAttribute, BufferGeometry } from 'three';
import type { ArborNode, LimbIndex, Vec3 } from '@/utils/arbor-generator';

const RADIAL = 8; // ring vertices per spine point

/** Deterministic per-node hash → [0,1) — stable across builds (no Math.random,
 *  so review screenshots are reproducible). */
function hash01(i: number): number {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
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

interface SpinePoint {
  position: Vec3;
  radius: number;
  t: number;
  limb: number;
}

const SUBDIV = 3; // sweep samples per generator segment — rounds the joints

/** Centripetal-flavored Catmull-Rom resample of a spine polyline (clamped
 *  ends). The generator's node semantics are untouched — this only rounds
 *  the swept surface between them so joints never facet. Radius/t lerp. */
function subdivideSpine(points: SpinePoint[]): SpinePoint[] {
  if (points.length < 3) return points;
  const out: SpinePoint[] = [];
  const P = (i: number): Vec3 => points[Math.max(0, Math.min(points.length - 1, i))]!.position;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    for (let s = 0; s < SUBDIV; s++) {
      const u = s / SUBDIV;
      const u2 = u * u;
      const u3 = u2 * u;
      const pos: Vec3 = [0, 0, 0];
      for (let ax = 0; ax < 3; ax++) {
        pos[ax] =
          0.5 *
          (2 * p1[ax]! +
            (-p0[ax]! + p2[ax]!) * u +
            (2 * p0[ax]! - 5 * p1[ax]! + 4 * p2[ax]! - p3[ax]!) * u2 +
            (-p0[ax]! + 3 * p1[ax]! - 3 * p2[ax]! + p3[ax]!) * u3);
      }
      const a = points[i]!;
      const b = points[i + 1]!;
      out.push({
        position: pos,
        radius: a.radius + (b.radius - a.radius) * u,
        t: a.t + (b.t - a.t) * u,
        limb: a.limb,
      });
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}

/** The four spine polylines: the trunk chain, then each limb chain prefixed
 *  with its junction node so the tubes connect seamlessly at the split. */
function extractSpines(nodes: ArborNode[]): SpinePoint[][] {
  const trunk: SpinePoint[] = [];
  const limbs: SpinePoint[][] = [[], [], []];
  for (const n of nodes) {
    if (n.region === 'trunk') {
      trunk.push({ position: n.position, radius: n.radius, t: n.t, limb: -1 });
    } else if (n.region === 'limb') {
      const chain = limbs[n.limb as LimbIndex]!;
      if (chain.length === 0) {
        const junction = nodes[n.parent]!;
        chain.push({
          position: junction.position,
          radius: junction.radius,
          t: junction.t,
          limb: n.limb,
        });
      }
      chain.push({ position: n.position, radius: n.radius, t: n.t, limb: n.limb });
    }
  }
  return [trunk, ...limbs];
}

/**
 * Merged tapered-tube sweep of the trunk + three limb spines.
 * Attributes: position, normal, aT, aRadius, aLimb.
 */
export function buildTrunkGeometry(nodes: ArborNode[]): BufferGeometry {
  const spines = extractSpines(nodes);

  const positions: number[] = [];
  const normals: number[] = [];
  const aT: number[] = [];
  const aRadius: number[] = [];
  const aLimb: number[] = [];
  const indices: number[] = [];

  for (const rawSpine of spines) {
    if (rawSpine.length < 2) continue;
    const spine = subdivideSpine(rawSpine);

    // Per-point tangent (average of adjacent segment directions).
    const tangents: Vec3[] = spine.map((p, i) => {
      const ahead = i < spine.length - 1 ? sub(spine[i + 1]!.position, p.position) : null;
      const behind = i > 0 ? sub(p.position, spine[i - 1]!.position) : null;
      if (ahead && behind) {
        return normalize([ahead[0] + behind[0], ahead[1] + behind[1], ahead[2] + behind[2]]);
      }
      return normalize(ahead ?? behind ?? [0, 1, 0]);
    });

    // Parallel-transport frame: project the previous side vector off each new
    // tangent — curved spines get twist-free rings.
    const ref: Vec3 = Math.abs(tangents[0]![1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
    let side = normalize(cross(tangents[0]!, ref));

    const ringStart: number[] = [];
    for (let i = 0; i < spine.length; i++) {
      const tan = tangents[i]!;
      side = normalize(
        sub(side, [
          tan[0] * dot(side, tan),
          tan[1] * dot(side, tan),
          tan[2] * dot(side, tan),
        ] as Vec3),
      );
      const up = cross(tan, side);
      const point = spine[i]!;
      ringStart.push(positions.length / 3);
      for (let r = 0; r < RADIAL; r++) {
        const a = (r / RADIAL) * Math.PI * 2;
        const nx = side[0] * Math.cos(a) + up[0] * Math.sin(a);
        const ny = side[1] * Math.cos(a) + up[1] * Math.sin(a);
        const nz = side[2] * Math.cos(a) + up[2] * Math.sin(a);
        positions.push(
          point.position[0] + nx * point.radius,
          point.position[1] + ny * point.radius,
          point.position[2] + nz * point.radius,
        );
        normals.push(nx, ny, nz);
        aT.push(point.t);
        aRadius.push(point.radius);
        aLimb.push(point.limb);
      }
    }

    // Quad strips between consecutive rings.
    for (let i = 0; i < spine.length - 1; i++) {
      const a0 = ringStart[i]!;
      const b0 = ringStart[i + 1]!;
      for (let r = 0; r < RADIAL; r++) {
        const r1 = (r + 1) % RADIAL;
        indices.push(a0 + r, b0 + r, a0 + r1, a0 + r1, b0 + r, b0 + r1);
      }
    }

    // Rounded end cap: a fan from the last ring to a point just past the tip.
    const last = spine[spine.length - 1]!;
    const lastTan = tangents[spine.length - 1]!;
    const capIndex = positions.length / 3;
    positions.push(
      last.position[0] + lastTan[0] * last.radius,
      last.position[1] + lastTan[1] * last.radius,
      last.position[2] + lastTan[2] * last.radius,
    );
    normals.push(lastTan[0], lastTan[1], lastTan[2]);
    aT.push(last.t);
    aRadius.push(last.radius);
    aLimb.push(last.limb);
    const lastRing = ringStart[spine.length - 1]!;
    for (let r = 0; r < RADIAL; r++) {
      indices.push(lastRing + r, capIndex, lastRing + ((r + 1) % RADIAL));
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geo.setAttribute('aT', new BufferAttribute(new Float32Array(aT), 1));
  geo.setAttribute('aRadius', new BufferAttribute(new Float32Array(aRadius), 1));
  geo.setAttribute('aLimb', new BufferAttribute(new Float32Array(aLimb), 1));
  geo.setIndex(indices);
  return geo;
}

/**
 * One ribbon quad per strand edge (parent → strand node). The `position`
 * attribute holds the true endpoint (honest bounding sphere); the vertex
 * stage pushes each side vertex out along cross(edgeDir, viewRay).
 * Attributes: position, aEdgeDir, aSide, aT, aRadius, aLimb, aSeed.
 */
export function buildStrandGeometry(nodes: ArborNode[]): BufferGeometry {
  const positions: number[] = [];
  const aEdgeDir: number[] = [];
  const aSide: number[] = [];
  const aT: number[] = [];
  const aRadius: number[] = [];
  const aLimb: number[] = [];
  const aSeed: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const child = nodes[i]!;
    if (child.region !== 'strand') continue;
    const parent = nodes[child.parent]!;
    const dir = normalize(sub(child.position, parent.position));

    const base = positions.length / 3;
    // Two vertices per endpoint (±side). Seed/t/radius are PER NODE so
    // consecutive segments and the tip sprites sway as one connected piece.
    const ends = [
      { node: parent, index: child.parent },
      { node: child, index: i },
    ];
    for (const end of ends) {
      for (const side of [-1, 1]) {
        positions.push(end.node.position[0], end.node.position[1], end.node.position[2]);
        aEdgeDir.push(dir[0], dir[1], dir[2]);
        aSide.push(side);
        aT.push(end.node.t);
        aRadius.push(end.node.radius);
        aLimb.push(child.limb);
        aSeed.push(hash01(end.index));
      }
    }
    indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('aEdgeDir', new BufferAttribute(new Float32Array(aEdgeDir), 3));
  geo.setAttribute('aSide', new BufferAttribute(new Float32Array(aSide), 1));
  geo.setAttribute('aT', new BufferAttribute(new Float32Array(aT), 1));
  geo.setAttribute('aRadius', new BufferAttribute(new Float32Array(aRadius), 1));
  geo.setAttribute('aLimb', new BufferAttribute(new Float32Array(aLimb), 1));
  geo.setAttribute('aSeed', new BufferAttribute(new Float32Array(aSeed), 1));
  geo.setIndex(indices);
  return geo;
}

/**
 * One point sprite per leaf node — the luminous endpoints of the canopy.
 * Attributes: position, aT, aLimb, aSeed (seeded like the strand endpoints,
 * so each sprite rides its strand's sway exactly).
 */
export function buildTipGeometry(nodes: ArborNode[]): BufferGeometry {
  const hasChild = new Array<boolean>(nodes.length).fill(false);
  for (const n of nodes) {
    if (n.parent >= 0) hasChild[n.parent] = true;
  }

  const positions: number[] = [];
  const aT: number[] = [];
  const aLimb: number[] = [];
  const aSeed: number[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    if (n.region !== 'strand' || hasChild[i]) continue;
    positions.push(n.position[0], n.position[1], n.position[2]);
    aT.push(n.t);
    aLimb.push(n.limb);
    aSeed.push(hash01(i));
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('aT', new BufferAttribute(new Float32Array(aT), 1));
  geo.setAttribute('aLimb', new BufferAttribute(new Float32Array(aLimb), 1));
  geo.setAttribute('aSeed', new BufferAttribute(new Float32Array(aSeed), 1));
  return geo;
}
