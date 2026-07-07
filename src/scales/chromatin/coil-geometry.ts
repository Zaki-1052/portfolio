// src/scales/chromatin/coil-geometry.ts
// Coil bead list → GPU resources, two draw calls: an InstancedMesh of oblate
// disc beads (ONE shared template geometry, per-bead placement in instance
// matrices — the design doc's original bead spec) and one merged tube sweep
// of sagging linker threads (the additive glow backbone).
//
// Approach-B contract: the unwind engine re-runs the generator per animation
// tick and pushes the new state through the write* functions here — ~100
// instance-matrix writes for the beads, a position/normal rewrite-in-place
// for the linkers. Buffer SIZES are open-state invariant (bead count and
// segment topology never change), so the writers never reallocate.
import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Matrix4,
  type InstancedMesh,
} from 'three';
import { regionBeadIndices, type CoilNode, type Vec3 } from '@/utils/coil-generator';

// Low-poly lattice per bead: 9×13 = 117 verts on the shared template — dense
// enough that the fresnel rim reads smooth at dpr 2.
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
 * The shared bead template: ONE unit-radius oblate UV-sphere, squished along
 * its local Z by `beadAspect` with correct ellipsoid shading normals baked
 * in. Instance matrices carry ONLY rigid rotation + uniform radius scale +
 * translation (aspect lives here in the template), so the vertex shader's
 * `mat3(instanceMatrix) * normal` stays valid — a non-uniform instance scale
 * would skew normals.
 *
 * Per-bead data rides in InstancedBufferAttributes on the same geometry:
 * aSeed (drift phase), aT, aRegion, aLocusW (hann-windowed locus hotspot).
 * aGroove is per TEMPLATE vertex (the local-Z coordinate the groove bands
 * stack along) — identical for every instance by construction.
 *
 * The computed bounding sphere is the honest TEMPLATE sphere — right for
 * InstancedMesh.raycast (which tests it per instance through each matrix),
 * wrong for frustum culling of the whole cluster; the mesh disables culling
 * (see CoilMesh) since instance matrices move per tick during the unwind.
 */
export function buildBeadTemplate(nodes: CoilNode[], beadAspect: number): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const aGroove: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= BEAD_ROWS; row++) {
    const phi = (row / BEAD_ROWS) * Math.PI;
    for (let col = 0; col <= BEAD_COLS; col++) {
      const theta = (col / BEAD_COLS) * Math.PI * 2;
      // Unit-sphere direction; local Z is the squished (thread) axis.
      const ux = Math.sin(phi) * Math.cos(theta);
      const uy = Math.cos(phi);
      const uz = Math.sin(phi) * Math.sin(theta);
      positions.push(ux, uy, uz * beadAspect);
      // Ellipsoid shading normal: squished-axis component divided by the
      // aspect, renormalized.
      const nz = uz / beadAspect;
      const nLen = Math.hypot(ux, uy, nz) || 1;
      normals.push(ux / nLen, uy / nLen, nz / nLen);
      // Bead-local coordinate along the thread axis (-1..1): the groove
      // bands stack along it, following each bead's own frame.
      aGroove.push(uz);
    }
  }
  for (let row = 0; row < BEAD_ROWS; row++) {
    for (let col = 0; col < BEAD_COLS; col++) {
      const a = row * (BEAD_COLS + 1) + col;
      const b = a + BEAD_COLS + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

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

  const count = nodes.length;
  const aSeed = new Float32Array(count);
  const aT = new Float32Array(count);
  const aRegion = new Float32Array(count);
  const aLocusW = new Float32Array(count);
  for (const node of nodes) {
    aSeed[node.index] = hash01(node.index);
    aT[node.index] = node.t;
    aRegion[node.index] = node.region;
    aLocusW[node.index] = locusWeight.get(node.index) ?? 0;
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geo.setAttribute('aGroove', new BufferAttribute(new Float32Array(aGroove), 1));
  geo.setAttribute('aSeed', new InstancedBufferAttribute(aSeed, 1));
  geo.setAttribute('aT', new InstancedBufferAttribute(aT, 1));
  geo.setAttribute('aRegion', new InstancedBufferAttribute(aRegion, 1));
  geo.setAttribute('aLocusW', new InstancedBufferAttribute(aLocusW, 1));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

// Module-scope temp — writeBeadInstances runs per animation tick during the
// unwind; no allocations on that path.
const _instanceMatrix = new Matrix4();

/**
 * Push a node state into the instanced bead mesh: per bead, basis columns
 * (normal, binormal, tangent) × uniform radius scale + position translation.
 * Instance order == node index order (the click handler relies on this).
 */
export function writeBeadInstances(mesh: InstancedMesh, nodes: CoilNode[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    const r = n.radius;
    _instanceMatrix.set(
      n.normal[0] * r,
      n.binormal[0] * r,
      n.tangent[0] * r,
      n.position[0],
      n.normal[1] * r,
      n.binormal[1] * r,
      n.tangent[1] * r,
      n.position[1],
      n.normal[2] * r,
      n.binormal[2] * r,
      n.tangent[2] * r,
      n.position[2],
      0,
      0,
      0,
      1,
    );
    mesh.setMatrixAt(i, _instanceMatrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * One merged tube sweep of the linker threads between consecutive beads —
 * quadratic Bézier with a catenary-style sag at the midpoint, sampled into
 * short rings. Structure (index buffer, aT, aRegion) is open-state invariant
 * and computed once here; positions/normals are filled by
 * writeLinkerGeometry, which the unwind engine re-calls per tick with the
 * re-generated node state. No bounding sphere is maintained — the mesh
 * renders with culling disabled (threads follow the beads out during the
 * unwind, so any build-time sphere would go stale).
 */
export function buildLinkerGeometry(
  nodes: CoilNode[],
  linkerSag: number,
  radius: number,
): BufferGeometry {
  const segments = nodes.length - 1;
  const vertCount = segments * LINKER_SAMPLES * LINKER_RADIAL;
  const aT = new Float32Array(vertCount);
  const aRegion = new Float32Array(vertCount);
  const indices: number[] = [];

  let v = 0;
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]!;
    const b = nodes[i]!;
    const sharedRegion = a.region === b.region ? a.region : -1;
    const base = (i - 1) * LINKER_SAMPLES * LINKER_RADIAL;
    for (let s = 0; s < LINKER_SAMPLES; s++) {
      const t = s / (LINKER_SAMPLES - 1);
      for (let ring = 0; ring < LINKER_RADIAL; ring++) {
        aT[v] = a.t + (b.t - a.t) * t;
        aRegion[v] = sharedRegion;
        v++;
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
  const position = new BufferAttribute(new Float32Array(vertCount * 3), 3);
  const normal = new BufferAttribute(new Float32Array(vertCount * 3), 3);
  position.setUsage(DynamicDrawUsage);
  normal.setUsage(DynamicDrawUsage);
  geo.setAttribute('position', position);
  geo.setAttribute('normal', normal);
  geo.setAttribute('aT', new BufferAttribute(aT, 1));
  geo.setAttribute('aRegion', new BufferAttribute(aRegion, 1));
  geo.setIndex(indices);
  writeLinkerGeometry(geo, nodes, linkerSag, radius);
  return geo;
}

/**
 * Rewrite the linker tube positions/normals in place from a node state —
 * same Bézier sag math as always, writing through a cursor instead of
 * allocating. Threads stay attached to their beads through every open state,
 * and the sag deepens naturally as the spans stretch.
 */
export function writeLinkerGeometry(
  geo: BufferGeometry,
  nodes: CoilNode[],
  linkerSag: number,
  radius: number,
): void {
  const position = geo.getAttribute('position') as BufferAttribute;
  const normal = geo.getAttribute('normal') as BufferAttribute;
  const pArr = position.array as Float32Array;
  const nArr = normal.array as Float32Array;

  let w = 0;
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
        pArr[w] = point[0] + nx * radius;
        nArr[w] = nx;
        w++;
        pArr[w] = point[1] + ny * radius;
        nArr[w] = ny;
        w++;
        pArr[w] = point[2] + nz * radius;
        nArr[w] = nz;
        w++;
      }
    }
  }
  position.needsUpdate = true;
  normal.needsUpdate = true;
}
