// src/scales/chromatin/coil-geometry.ts
// Coil bead list → BufferGeometry, two draw calls: one merged mesh of
// oriented oblate beads (the cluster body) and one merged tube sweep of
// sagging linker threads (the additive glow backbone). Merged hand-built
// geometry per the arbor precedent — NOT InstancedMesh. If the merged look
// disappoints, the reserved InstancedMesh rewrite swaps buildBeadGeometry's
// internals (shared base geometry + per-instance matrices/attributes) and
// the mesh JSX only; the shader contract (aCompactPos/aUnwoundPos morph +
// the #ifdef USE_INSTANCING guard) is already shaped for both paths.
import { BufferAttribute, BufferGeometry, Sphere, Vector3 } from 'three';
import { regionBeadIndices, type CoilNode, type Vec3 } from '@/utils/coil-generator';

// Low-poly lattice per bead: 9×13 = 117 verts × 96 beads ≈ 11k — well under
// budget, dense enough that the fresnel rim reads smooth at dpr 2.
const BEAD_ROWS = 8;
const BEAD_COLS = 12;

// Linker tube tessellation: short taut threads, 4 radial segments per the
// design spec (an additive glow line, not a lit solid).
const LINKER_SAMPLES = 6;
const LINKER_RADIAL = 4;

/** Deterministic per-index hash (same idiom as arbor-geometry) — drift
 *  phases stay reproducible across builds, never Math.random. */
function hash01(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
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

/**
 * One merged mesh of all beads: an oblate UV-sphere per bead, squished along
 * the bead's transport-frame TANGENT axis (flat faces perpendicular to the
 * fiber — discs threaded on a string), oriented at build time.
 *
 * The `position` attribute holds only the small oriented LOCAL offset; the
 * bead center lives in aCompactPos/aUnwoundPos and is added in the vertex
 * shader (that is what makes the unwind morph a pure uniform blend).
 */
export function buildBeadGeometry(nodes: CoilNode[], beadAspect: number): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const aCompactPos: number[] = [];
  const aUnwoundPos: number[] = [];
  const aSeed: number[] = [];
  const aT: number[] = [];
  const aRegion: number[] = [];
  const aLocusW: number[] = [];
  const aGroove: number[] = [];
  const indices: number[] = [];

  // Locus weight: a hann window across each region span — 1 at the region's
  // center bead, 0 at its edges. The invitation marker reads as ONE soft
  // hotspot per region; a flat per-bead glow lit all ~15 beads into a hot
  // band under the bloom pass (verified in preview).
  const locusWeight = new Map<number, number>();
  for (const regionIndex of [0, 1] as const) {
    const members = regionBeadIndices(nodes, regionIndex);
    const span = members.length - 1;
    members.forEach((nodeIndex, rank) => {
      const w = span > 0 ? 0.5 * (1 - Math.cos((2 * Math.PI * rank) / span)) : 1;
      locusWeight.set(nodeIndex, w);
    });
  }

  // Extents of the union of compact ∪ unwound centers, for the manual
  // bounding sphere below.
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  let maxRadius = 0;
  const extend = (p: Vec3): void => {
    for (let ax = 0; ax < 3; ax++) {
      min[ax] = Math.min(min[ax]!, p[ax]!);
      max[ax] = Math.max(max[ax]!, p[ax]!);
    }
  };

  for (const node of nodes) {
    const r = node.radius;
    maxRadius = Math.max(maxRadius, r);
    extend(node.position);
    extend(node.unwoundPosition);
    const seed = hash01(node.index);
    const { tangent, normal, binormal } = node;
    const base = positions.length / 3;
    for (let row = 0; row <= BEAD_ROWS; row++) {
      const phi = (row / BEAD_ROWS) * Math.PI;
      for (let col = 0; col <= BEAD_COLS; col++) {
        const theta = (col / BEAD_COLS) * Math.PI * 2;
        // Unit-sphere direction; uz rides the tangent (squished) axis.
        const ux = Math.sin(phi) * Math.cos(theta);
        const uy = Math.cos(phi);
        const uz = Math.sin(phi) * Math.sin(theta);
        positions.push(
          normal[0] * ux * r + binormal[0] * uy * r + tangent[0] * uz * r * beadAspect,
          normal[1] * ux * r + binormal[1] * uy * r + tangent[1] * uz * r * beadAspect,
          normal[2] * ux * r + binormal[2] * uy * r + tangent[2] * uz * r * beadAspect,
        );
        // Ellipsoid shading normal: unit direction with the squished axis
        // component divided by the aspect, renormalized.
        const nz = uz / beadAspect;
        const nLen = Math.hypot(ux, uy, nz) || 1;
        normals.push(
          (normal[0] * ux + binormal[0] * uy + tangent[0] * nz) / nLen,
          (normal[1] * ux + binormal[1] * uy + tangent[1] * nz) / nLen,
          (normal[2] * ux + binormal[2] * uy + tangent[2] * nz) / nLen,
        );
        aCompactPos.push(node.position[0], node.position[1], node.position[2]);
        aUnwoundPos.push(node.unwoundPosition[0], node.unwoundPosition[1], node.unwoundPosition[2]);
        aSeed.push(seed);
        aT.push(node.t);
        aRegion.push(node.region);
        aLocusW.push(locusWeight.get(node.index) ?? 0);
        // Bead-local coordinate along the thread axis (-1..1): the groove
        // bands stack along it, so the wrap orientation follows each bead's
        // own frame instead of painting global world-axis stripes.
        aGroove.push(uz);
      }
    }
    for (let row = 0; row < BEAD_ROWS; row++) {
      for (let col = 0; col < BEAD_COLS; col++) {
        const a = base + row * (BEAD_COLS + 1) + col;
        const b = a + BEAD_COLS + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geo.setAttribute('aCompactPos', new BufferAttribute(new Float32Array(aCompactPos), 3));
  geo.setAttribute('aUnwoundPos', new BufferAttribute(new Float32Array(aUnwoundPos), 3));
  geo.setAttribute('aSeed', new BufferAttribute(new Float32Array(aSeed), 1));
  geo.setAttribute('aT', new BufferAttribute(new Float32Array(aT), 1));
  geo.setAttribute('aRegion', new BufferAttribute(new Float32Array(aRegion), 1));
  geo.setAttribute('aLocusW', new BufferAttribute(new Float32Array(aLocusW), 1));
  geo.setAttribute('aGroove', new BufferAttribute(new Float32Array(aGroove), 1));
  geo.setIndex(indices);

  // MANUAL bounding sphere — deliberate asymmetry with the linker geometry
  // below. `position` here is only the bead-local offset, so three's
  // computeBoundingSphere() would produce a tiny near-origin sphere and the
  // whole cluster would frustum-cull the moment the camera moves. The true
  // extent is the union of compact ∪ unwound centers (the morph must never
  // cull mid-blend), padded by the bead radius plus drift headroom. Do NOT
  // "fix" this into a computeBoundingSphere() call.
  const center = new Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  let radiusSq = 0;
  for (const node of nodes) {
    for (const p of [node.position, node.unwoundPosition]) {
      const dx = p[0] - center.x;
      const dy = p[1] - center.y;
      const dz = p[2] - center.z;
      radiusSq = Math.max(radiusSq, dx * dx + dy * dy + dz * dz);
    }
  }
  const DRIFT_PAD = 0.5;
  geo.boundingSphere = new Sphere(center, Math.sqrt(radiusSq) + maxRadius + DRIFT_PAD);

  return geo;
}

/**
 * One merged tube sweep of the linker threads between consecutive beads —
 * quadratic Bézier with a catenary-style sag at the midpoint, sampled into
 * short rings. Positions are true object-space coordinates (no shader-side
 * center addition), so the default computed bounding sphere is honest here.
 * Linkers stay in the compact state this stage — no morph attributes.
 */
export function buildLinkerGeometry(
  nodes: CoilNode[],
  linkerSag: number,
  radius: number,
): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const aT: number[] = [];
  const aRegion: number[] = [];
  const indices: number[] = [];

  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]!;
    const b = nodes[i]!;
    const span = Math.hypot(
      b.position[0] - a.position[0],
      b.position[1] - a.position[1],
      b.position[2] - a.position[2],
    );
    // Control point below the midpoint: the taut-thread sag.
    const control: Vec3 = [
      (a.position[0] + b.position[0]) / 2,
      (a.position[1] + b.position[1]) / 2 - linkerSag * span,
      (a.position[2] + b.position[2]) / 2,
    ];
    const sample = (t: number): Vec3 => {
      const u = 1 - t;
      return [
        u * u * a.position[0] + 2 * u * t * control[0] + t * t * b.position[0],
        u * u * a.position[1] + 2 * u * t * control[1] + t * t * b.position[1],
        u * u * a.position[2] + 2 * u * t * control[2] + t * t * b.position[2],
      ];
    };
    const sharedRegion = a.region === b.region ? a.region : -1;
    const base = positions.length / 3;
    for (let s = 0; s < LINKER_SAMPLES; s++) {
      const t = s / (LINKER_SAMPLES - 1);
      const point = sample(t);
      const tangent = normalize(sub(sample(Math.min(1, t + 0.05)), sample(Math.max(0, t - 0.05))));
      // Short local segments: a fresh ref-guarded frame per ring is fine
      // (no visible twist at 4 radial segments and thread-thin radius).
      const ref: Vec3 = Math.abs(tangent[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
      const side = normalize(cross(tangent, ref));
      const up = cross(tangent, side);
      for (let ring = 0; ring < LINKER_RADIAL; ring++) {
        const ang = (ring / LINKER_RADIAL) * Math.PI * 2;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        const nx = side[0] * cos + up[0] * sin;
        const ny = side[1] * cos + up[1] * sin;
        const nz = side[2] * cos + up[2] * sin;
        positions.push(point[0] + nx * radius, point[1] + ny * radius, point[2] + nz * radius);
        normals.push(nx, ny, nz);
        aT.push(a.t + (b.t - a.t) * t);
        aRegion.push(sharedRegion);
      }
    }
    for (let s = 0; s < LINKER_SAMPLES - 1; s++) {
      for (let ring = 0; ring < LINKER_RADIAL; ring++) {
        const r1 = (ring + 1) % LINKER_RADIAL;
        const p0 = base + s * LINKER_RADIAL + ring;
        const p1 = base + s * LINKER_RADIAL + r1;
        const p2 = p0 + LINKER_RADIAL;
        const p3 = p1 + LINKER_RADIAL;
        indices.push(p0, p2, p1, p1, p2, p3);
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geo.setAttribute('aT', new BufferAttribute(new Float32Array(aT), 1));
  geo.setAttribute('aRegion', new BufferAttribute(new Float32Array(aRegion), 1));
  geo.setIndex(indices);
  return geo;
}
