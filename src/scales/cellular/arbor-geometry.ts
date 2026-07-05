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
import { BufferAttribute, BufferGeometry, Color } from 'three';
import type { ArborNode, Vec3 } from '@/utils/arbor-generator';

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

/** All spine polylines: the trunk chain, then every 'limb'-region chain —
 *  the three labeled majors, the decorative minors, and the trailing
 *  filament — each prefixed with its junction node so the tubes connect
 *  seamlessly. Chains are identified structurally (a limb node whose parent
 *  isn't the previous chain end starts a new chain), so any number of
 *  members works regardless of limb tag. */
function extractSpines(nodes: ArborNode[]): SpinePoint[][] {
  const trunk: SpinePoint[] = [];
  const chains: SpinePoint[][] = [];
  const chainEndingAt = new Map<number, SpinePoint[]>();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    if (n.region === 'trunk') {
      trunk.push({ position: n.position, radius: n.radius, t: n.t, limb: -1 });
    } else if (n.region === 'limb') {
      let chain = chainEndingAt.get(n.parent);
      if (!chain) {
        const junction = nodes[n.parent]!;
        chain = [
          {
            position: junction.position,
            radius: junction.radius,
            t: junction.t,
            limb: n.limb,
          },
        ];
        chains.push(chain);
      } else {
        chainEndingAt.delete(n.parent);
      }
      chain.push({ position: n.position, radius: n.radius, t: n.t, limb: n.limb });
      chainEndingAt.set(i, chain);
    }
  }
  return [trunk, ...chains];
}

/**
 * Merged tapered-tube sweep of the trunk + every limb spine, plus the hub —
 * a rounded central body at the split point that swallows the junctions, so
 * the members read as radiating from a mass rather than forking off a pole.
 * Attributes: position, normal, aT, aRadius, aLimb.
 */
export function buildTrunkGeometry(nodes: ArborNode[], hubScale = 2.1): BufferGeometry {
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

    // Rounded end caps on BOTH ends — an uncapped ring reads as an open pipe
    // mouth the moment the camera sees down the axis (the trunk's root sat
    // exactly there, under the hub).
    const capEnd = (index: number, sign: number): void => {
      const point = spine[index]!;
      const tan = tangents[index]!;
      const capIndex = positions.length / 3;
      positions.push(
        point.position[0] + tan[0] * point.radius * sign,
        point.position[1] + tan[1] * point.radius * sign,
        point.position[2] + tan[2] * point.radius * sign,
      );
      normals.push(tan[0] * sign, tan[1] * sign, tan[2] * sign);
      aT.push(point.t);
      aRadius.push(point.radius);
      aLimb.push(point.limb);
      const ring = ringStart[index]!;
      for (let r = 0; r < RADIAL; r++) {
        const r1 = (r + 1) % RADIAL;
        if (sign > 0) indices.push(ring + r, capIndex, ring + r1);
        else indices.push(ring + r, ring + r1, capIndex);
      }
    };
    capEnd(spine.length - 1, 1);
    capEnd(0, -1);
  }

  // --- The hub: a UV sphere at the split point, radius scaled off the
  // trunk-tip ring so the panel's hubScale dial reshapes it live. Same
  // material/relief as the limbs (aRadius = hub radius caps the bark grain
  // at full strength). ---
  const trunkNodes = nodes.filter((n) => n.region === 'trunk');
  const hubNode = trunkNodes[trunkNodes.length - 1];
  if (hubNode) {
    const hubR = hubNode.radius * hubScale;
    // Dense enough that the fbm relief reads as surface, not facets.
    const ROWS = 20;
    const COLS = 32;
    const base = positions.length / 3;
    for (let r = 0; r <= ROWS; r++) {
      const phi = (r / ROWS) * Math.PI;
      for (let c = 0; c <= COLS; c++) {
        const theta = (c / COLS) * Math.PI * 2;
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);
        positions.push(
          hubNode.position[0] + nx * hubR,
          hubNode.position[1] + ny * hubR,
          hubNode.position[2] + nz * hubR,
        );
        normals.push(nx, ny, nz);
        aT.push(hubNode.t);
        aRadius.push(hubR);
        // -2 marks HUB vertices: the shaders damp the bark relief and light
        // the granular inner glow there (never dims on focus, like -1).
        aLimb.push(-2);
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const a = base + r * (COLS + 1) + c;
        const b = a + COLS + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
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
  const aLevel: number[] = [];
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
        // Strand generation depth — the frag ramps luminance up from the
        // attachment so strands GROW out of their member instead of
        // snapping on at full glow (the hologram seam).
        aLevel.push(child.level);
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
  geo.setAttribute('aLevel', new BufferAttribute(new Float32Array(aLevel), 1));
  geo.setIndex(indices);
  return geo;
}

/** Hex '#rrggbb' → LINEAR rgb floats via three's color management (sRGB→linear,
 *  matching how the strand/tip uColor uniforms resolve). Raw byte/255 values
 *  would be treated as linear and read lighter + desaturated under bloom/ACES. */
function hexToRgb(hex: string): [number, number, number] {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
}

/**
 * The bead layer: multicolor glowing dots strung along EVERY member (spines
 * and strands both) at ~spacing world-unit intervals, offset just off the
 * surface — the fluorescence reference's signature. One Points buffer.
 * Attributes: position, aColor, aT, aLimb, aSeed.
 */
export function buildPunctaGeometry(
  nodes: ArborNode[],
  spacing: number,
  palette: readonly string[],
): BufferGeometry {
  const colors = palette.map(hexToRgb);
  const positions: number[] = [];
  const aColor: number[] = [];
  const aT: number[] = [];
  const aLimb: number[] = [];
  const aSeed: number[] = [];

  let bead = 0;
  let carry = 0; // spacing remainder carried across edges → even chains
  for (let i = 0; i < nodes.length; i++) {
    const child = nodes[i]!;
    if (child.parent < 0) continue;
    const parent = nodes[child.parent]!;
    const dx = child.position[0] - parent.position[0];
    const dy = child.position[1] - parent.position[1];
    const dz = child.position[2] - parent.position[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-6) continue;

    let s = carry <= 0 ? spacing * 0.5 : carry;
    while (s <= len) {
      const u = s / len;
      const h1 = hash01(bead * 3 + 1);
      const h2 = hash01(bead * 3 + 2);
      // Perch each bead just off the member's surface, jittered around it.
      const az = h1 * Math.PI * 2;
      const ref: Vec3 = Math.abs(dy / len) < 0.99 ? [0, 1, 0] : [1, 0, 0];
      const side = normalize(cross([dx / len, dy / len, dz / len], ref));
      const up = cross([dx / len, dy / len, dz / len], side);
      const r = (parent.radius + (child.radius - parent.radius) * u) * 0.9 + 0.08 + h2 * 0.22;
      positions.push(
        parent.position[0] + dx * u + (side[0] * Math.cos(az) + up[0] * Math.sin(az)) * r,
        parent.position[1] + dy * u + (side[1] * Math.cos(az) + up[1] * Math.sin(az)) * r,
        parent.position[2] + dz * u + (side[2] * Math.cos(az) + up[2] * Math.sin(az)) * r,
      );
      const col = colors[Math.floor(hash01(bead * 3) * colors.length) % colors.length]!;
      aColor.push(col[0], col[1], col[2]);
      const tAt = parent.t + (child.t - parent.t) * u;
      aT.push(tAt);
      aLimb.push(child.limb);
      aSeed.push(hash01(bead + 977));
      bead++;
      // Beads crowd toward the reaches (the reference's crowns are the
      // densest); the roots stay sparser.
      s += spacing * (0.75 + hash01(bead * 7) * 0.5) * (1.25 - 0.65 * tAt);
    }
    carry = s - len;
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('aColor', new BufferAttribute(new Float32Array(aColor), 3));
  geo.setAttribute('aT', new BufferAttribute(new Float32Array(aT), 1));
  geo.setAttribute('aLimb', new BufferAttribute(new Float32Array(aLimb), 1));
  geo.setAttribute('aSeed', new BufferAttribute(new Float32Array(aSeed), 1));
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
