// src/scales/chromatin/coil-geometry.ts
// Coil bead list → GPU resources, three instanced/merged layers: an
// InstancedMesh of beveled drum beads (ONE shared puck template, per-bead
// placement in instance matrices), one merged tube sweep of the wound amber
// thread (per-drum rim wraps + free bridges, path math in coil-thread-path),
// and an InstancedMesh of cinch knobs at each drum's thread entry/exit.
//
// Approach-B contract: the unwind engine re-runs the generator per animation
// tick and pushes the new state through the write* functions here — instance
// matrix writes for beads and knobs, a position/normal rewrite-in-place for
// the thread. Buffer SIZES are open-state invariant (bead count and segment
// topology never change), so the writers never reallocate.
import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Matrix4,
  type InstancedMesh,
} from 'three';
import { loopArcPairs, regionBeadIndices, type CoilNode, type Vec3 } from '@/utils/coil-generator';
import {
  BRIDGE_SAMPLES,
  WRAP_SAMPLES,
  WRAP_Z_FRACTION,
  knobPlacements,
  sampleThreadPath,
  threadPointCount,
  type ThreadPathOpts,
} from './coil-thread-path';

// Puck template tessellation (5.5): 15 profile rows (cap → bevel arc → wall →
// mirrored) revolved over 28 radial segments = 15×29 = 435 verts on the
// shared template — enough that the bevel's highlight ring reads as a clean
// circle at dpr 2, still trivial × ~55 instances.
const PUCK_RADIAL = 28;
// Interior samples across each bevel quarter-arc (plus its two shared
// boundary rows on the cap edge and wall top).
const PUCK_BEVEL_STEPS = [Math.PI / 8, Math.PI / 4, (3 * Math.PI) / 8];

// Wound-thread tube tessellation: 8 radial segments (5.6 face-on fix — at
// 6 the interpolation bands split the cord into two dark rails when a wrap
// faces the camera; 8 rounds the highlight into one continuous core).
const THREAD_RADIAL = 8;

// Cinch-knob template: a small squashed dome stud, 6×10 lattice — reads
// round under the rim highlight at its ~0.11-unit size.
const KNOB_ROWS = 5;
const KNOB_COLS = 10;
const KNOB_ASPECT = 0.65;
// Outward bulge: how far the knob center sits above the thread's wall
// contact point, as a fraction of knobSize.
const KNOB_LIFT = 0.4;

// Loop-ribbon tessellation: long bowed arcs between distant same-region
// beads, so they need far more length samples than the short linkers.
const RIBBON_SAMPLES = 24;
const RIBBON_RADIAL = 4;

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
 * The shared bead template: ONE beveled puck (drum) — flat cap faces, a
 * quarter-arc bevel around each rim, a straight side wall — revolved around
 * local Z, the fiber-tangent axis (same convention the old oblate squish
 * used). Half-thickness (`beadAspect`) and the rim bevel are baked HERE in
 * template space with analytic normals per profile row (caps flat, wall
 * radial, bevel sweeping the quarter arc — the ring the rim highlight
 * rides), so instance matrices carry ONLY rigid rotation + uniform radius
 * scale + translation and the vertex shader's `mat3(instanceMatrix) * normal`
 * stays exact — a non-uniform instance scale would skew normals.
 *
 * Per-bead data rides in InstancedBufferAttributes on the same geometry:
 * aSeed (drift phase + mottle phase), aT, aRegion, aLocusW (hann-windowed
 * locus hotspot). aCapMask is per TEMPLATE vertex — 1 on the cap faces,
 * cos(bevel angle) across the bevel, 0 on the wall; the frag uses it for a
 * faint cap-skin tint.
 *
 * The computed bounding sphere is the honest TEMPLATE sphere — right for
 * InstancedMesh.raycast (which tests it per instance through each matrix),
 * wrong for frustum culling of the whole cluster; the mesh disables culling
 * (see CoilMesh) since instance matrices move per tick during the unwind.
 */
export function buildBeadTemplate(
  nodes: CoilNode[],
  beadAspect: number,
  beadBevel: number,
): BufferGeometry {
  // Profile in (radial, axial) coordinates: unit outer radius, half-thickness
  // h, bevel arc of radius b centered at (1-b, h-b). Clamping b against h
  // keeps the wall extent positive under any dev-slider pairing.
  const h = beadAspect;
  const b = Math.min(beadBevel, h * 0.95, 0.95);
  const rEdge = 1 - b;
  const profile: { r: number; z: number; nr: number; nz: number; cap: number }[] = [
    { r: 0, z: h, nr: 0, nz: 1, cap: 1 },
    { r: rEdge * 0.5, z: h, nr: 0, nz: 1, cap: 1 },
    { r: rEdge, z: h, nr: 0, nz: 1, cap: 1 },
    ...PUCK_BEVEL_STEPS.map((alpha) => ({
      r: rEdge + b * Math.sin(alpha),
      z: h - b + b * Math.cos(alpha),
      nr: Math.sin(alpha),
      nz: Math.cos(alpha),
      cap: Math.cos(alpha),
    })),
    { r: 1, z: h - b, nr: 1, nz: 0, cap: 0 },
    { r: 1, z: 0, nr: 1, nz: 0, cap: 0 },
    { r: 1, z: -(h - b), nr: 1, nz: 0, cap: 0 },
  ];
  // Mirror the bevel + cap below the wall (z and the normal's axial
  // component flip; row order keeps z monotonically descending).
  for (let i = 5; i >= 0; i--) {
    const p = profile[i]!;
    profile.push({ r: p.r, z: -p.z, nr: p.nr, nz: -p.nz, cap: p.cap });
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const aCapMask: number[] = [];
  const indices: number[] = [];

  for (const p of profile) {
    for (let col = 0; col <= PUCK_RADIAL; col++) {
      const theta = (col / PUCK_RADIAL) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      positions.push(p.r * cos, p.r * sin, p.z);
      // Analytic: nr²+nz² = 1 per row, so no renormalization needed.
      normals.push(p.nr * cos, p.nr * sin, p.nz);
      aCapMask.push(p.cap);
    }
  }
  for (let row = 0; row < profile.length - 1; row++) {
    for (let col = 0; col < PUCK_RADIAL; col++) {
      const a = row * (PUCK_RADIAL + 1) + col;
      const b2 = a + PUCK_RADIAL + 1;
      indices.push(a, b2, a + 1, a + 1, b2, b2 + 1);
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
  geo.setAttribute('aCapMask', new BufferAttribute(new Float32Array(aCapMask), 1));
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

// Ring sweep tables — THREAD_RADIAL is fixed, so the per-ring trig is
// precomputed once for the whole module.
const RING_COS = Array.from({ length: THREAD_RADIAL }, (_, r) =>
  Math.cos((r / THREAD_RADIAL) * Math.PI * 2),
);
const RING_SIN = Array.from({ length: THREAD_RADIAL }, (_, r) =>
  Math.sin((r / THREAD_RADIAL) * Math.PI * 2),
);

// Static occlusion profiles for the cord's baked aShade (5.6): the wrap ring
// basis always has side = radial-outward from the drum axis, so ring angle π
// faces the drum wall (contact shadow) and ±π/2 face along the drum axis
// (where adjacent turns crowd). Ring index → angle never changes, so these
// are exact for wraps at every unwind tick — the attribute stays static.
const RING_WALL_SHADE = Array.from(
  { length: THREAD_RADIAL },
  (_, r) => 0.45 * Math.pow(Math.max(0, -RING_COS[r]!), 1.5),
);
const RING_AXIAL_SHADE = Array.from(
  { length: THREAD_RADIAL },
  (_, r) => 0.35 * Math.pow(Math.abs(RING_SIN[r]!), 1.5),
);

function smoothstep01(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * One merged tube sweep of the wound thread — per drum, a helical wrap
 * around the rim, then a free bridge to the next drum's entry (path math and
 * point order in coil-thread-path). Structure (index buffer, aT, aRegion,
 * drift seeds, the baked aShade occlusion) is open-state invariant and
 * computed once here;
 * positions/normals are filled by writeThreadGeometry, which the unwind
 * engine re-calls per tick with the re-generated node state. Junction rings
 * are duplicated (wrap exit == bridge start by construction), so segments
 * never share vertices and the surface stays sealed through any frame phase.
 * No bounding sphere is maintained — the mesh renders with culling disabled
 * (the thread follows the drums out during the unwind).
 *
 * Drift registration: the drums drift in their vertex shader, so the thread
 * carries the SAME formula — a per-vertex seed pair + blend factor (wrap
 * verts ride their drum exactly; bridge verts blend their two endpoint
 * drums). Without this the wound cord would visibly detach from a drifting
 * drum.
 */
export function buildThreadGeometry(nodes: CoilNode[], opts: ThreadPathOpts): BufferGeometry {
  const n = nodes.length;
  const totalPoints = threadPointCount(n);
  const vertCount = totalPoints * THREAD_RADIAL;
  const aT = new Float32Array(vertCount);
  const aRegion = new Float32Array(vertCount);
  const aSeedA = new Float32Array(vertCount);
  const aSeedB = new Float32Array(vertCount);
  const aDriftMix = new Float32Array(vertCount);
  const aShade = new Float32Array(vertCount);
  const indices: number[] = [];

  let point = 0;
  let v = 0;
  const pushRing = (
    region: number,
    seedA: number,
    seedB: number,
    mix: number,
    wallK: number,
    axialK: number,
  ): void => {
    const t = point / (totalPoints - 1);
    for (let ring = 0; ring < THREAD_RADIAL; ring++) {
      aT[v] = t;
      aRegion[v] = region;
      aSeedA[v] = seedA;
      aSeedB[v] = seedB;
      aDriftMix[v] = mix;
      aShade[v] = wallK * RING_WALL_SHADE[ring]! + axialK * RING_AXIAL_SHADE[ring]!;
      v++;
    }
    point++;
  };
  const pushStrip = (ringCount: number, firstPoint: number): void => {
    for (let s = 0; s < ringCount - 1; s++) {
      for (let ring = 0; ring < THREAD_RADIAL; ring++) {
        const r1 = (ring + 1) % THREAD_RADIAL;
        const p0 = (firstPoint + s) * THREAD_RADIAL + ring;
        const p1 = (firstPoint + s) * THREAD_RADIAL + r1;
        const p2 = p0 + THREAD_RADIAL;
        const p3 = p1 + THREAD_RADIAL;
        indices.push(p0, p2, p1, p1, p2, p3);
      }
    }
  };

  for (let i = 0; i < n; i++) {
    const node = nodes[i]!;
    const seed = hash01(i);
    // Adjacent-turn crowding: how tightly the wrap turns pack along the drum
    // axis, in cord radii. Below ~2.5 radii the turns shade each other;
    // fades out by 4 (at the shipping packing the turns sit apart, so this
    // stays subtle — it earns its keep when wrapTurns is dialed up).
    const zW = WRAP_Z_FRACTION * node.radius * opts.beadAspect;
    const turnPitch = (2 * zW) / Math.max(opts.wrapTurns, 1e-3);
    const adjacencyK = 1 - smoothstep01(2.5, 4, turnPitch / Math.max(opts.threadRadius, 1e-4));
    const wrapFirst = point;
    for (let s = 0; s < WRAP_SAMPLES; s++) pushRing(node.region, seed, seed, 0, 1, adjacencyK);
    pushStrip(WRAP_SAMPLES, wrapFirst);
    if (i === n - 1) break;
    const next = nodes[i + 1]!;
    const shared = node.region === next.region ? node.region : -1;
    const nextSeed = hash01(i + 1);
    const bridgeFirst = point;
    for (let s = 0; s < BRIDGE_SAMPLES; s++) {
      // The free span sheds its contact shadow: full at each junction ring
      // (matching the coincident wrap ring so no seam shows), gone within a
      // few samples of leaving the wall.
      const wallK = Math.max(0, 1 - s / 2.5, 1 - (BRIDGE_SAMPLES - 1 - s) / 2.5);
      pushRing(shared, seed, nextSeed, s / (BRIDGE_SAMPLES - 1), wallK, 0);
    }
    pushStrip(BRIDGE_SAMPLES, bridgeFirst);
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
  geo.setAttribute('aSeedA', new BufferAttribute(aSeedA, 1));
  geo.setAttribute('aSeedB', new BufferAttribute(aSeedB, 1));
  geo.setAttribute('aDriftMix', new BufferAttribute(aDriftMix, 1));
  geo.setAttribute('aShade', new BufferAttribute(aShade, 1));
  geo.setIndex(indices);
  writeThreadGeometry(geo, nodes, opts);
  return geo;
}

// Path scratch for writeThreadGeometry — sized on first use, resized only
// when the bead count changes (a dev-slider event); zero allocation on the
// tween path.
let _threadPts = new Float32Array(0);
let _threadSides = new Float32Array(0);
let _threadUps = new Float32Array(0);

/**
 * Rewrite the thread tube positions/normals in place from a node state:
 * re-sample the wound path from the live transport frames, then sweep each
 * ring frame into THREAD_RADIAL vertices. The winding follows the unwind
 * naturally because the wrap is defined ON the drum's live frame.
 */
export function writeThreadGeometry(
  geo: BufferGeometry,
  nodes: CoilNode[],
  opts: ThreadPathOpts,
): void {
  const floats = threadPointCount(nodes.length) * 3;
  if (_threadPts.length !== floats) {
    _threadPts = new Float32Array(floats);
    _threadSides = new Float32Array(floats);
    _threadUps = new Float32Array(floats);
  }
  sampleThreadPath(nodes, opts, _threadPts, _threadSides, _threadUps);

  const position = geo.getAttribute('position') as BufferAttribute;
  const normal = geo.getAttribute('normal') as BufferAttribute;
  const pArr = position.array as Float32Array;
  const nArr = normal.array as Float32Array;
  const rho = opts.threadRadius;

  let w = 0;
  for (let k = 0; k < floats; k += 3) {
    const px = _threadPts[k]!;
    const py = _threadPts[k + 1]!;
    const pz = _threadPts[k + 2]!;
    const sx = _threadSides[k]!;
    const sy = _threadSides[k + 1]!;
    const sz = _threadSides[k + 2]!;
    const ux = _threadUps[k]!;
    const uy = _threadUps[k + 1]!;
    const uz = _threadUps[k + 2]!;
    for (let ring = 0; ring < THREAD_RADIAL; ring++) {
      const cos = RING_COS[ring]!;
      const sin = RING_SIN[ring]!;
      const nx = sx * cos + ux * sin;
      const ny = sy * cos + uy * sin;
      const nz = sz * cos + uz * sin;
      pArr[w] = px + nx * rho;
      nArr[w] = nx;
      w++;
      pArr[w] = py + ny * rho;
      nArr[w] = ny;
      w++;
      pArr[w] = pz + nz * rho;
      nArr[w] = nz;
      w++;
    }
  }
  position.needsUpdate = true;
  normal.needsUpdate = true;
}

/**
 * Cinch-knob layer: one InstancedMesh of small squashed dome studs, 2 per
 * drum at the thread's wall entry and exit points — the clasp detail that
 * pins the winding to each drum. Same rigid-instance convention as the
 * beads: the squish is baked in the template (local Z = outward radial),
 * matrices carry rotation + uniform knobSize scale + translation only.
 */
export function buildKnobGeometry(nodes: CoilNode[]): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= KNOB_ROWS; row++) {
    const phi = (row / KNOB_ROWS) * Math.PI;
    for (let col = 0; col <= KNOB_COLS; col++) {
      const theta = (col / KNOB_COLS) * Math.PI * 2;
      const ux = Math.sin(phi) * Math.cos(theta);
      const uy = Math.cos(phi);
      const uz = Math.sin(phi) * Math.sin(theta);
      positions.push(ux, uy, uz * KNOB_ASPECT);
      const nz = uz / KNOB_ASPECT;
      const nLen = Math.hypot(ux, uy, nz) || 1;
      normals.push(ux / nLen, uy / nLen, nz / nLen);
    }
  }
  for (let row = 0; row < KNOB_ROWS; row++) {
    for (let col = 0; col < KNOB_COLS; col++) {
      const a = row * (KNOB_COLS + 1) + col;
      const b = a + KNOB_COLS + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const count = nodes.length * 2;
  const aSeed = new Float32Array(count);
  const aRegion = new Float32Array(count);
  for (let i = 0; i < nodes.length; i++) {
    const seed = hash01(i);
    const region = nodes[i]!.region;
    aSeed[i * 2] = seed;
    aSeed[i * 2 + 1] = seed;
    aRegion[i * 2] = region;
    aRegion[i * 2 + 1] = region;
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geo.setAttribute('aSeed', new InstancedBufferAttribute(aSeed, 1));
  geo.setAttribute('aRegion', new InstancedBufferAttribute(aRegion, 1));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

// Placement scratch for writeKnobInstances — same lifecycle as the thread
// path scratch above.
let _knobPos = new Float32Array(0);
let _knobRadial = new Float32Array(0);
let _knobTangent = new Float32Array(0);

/**
 * Push a node state into the knob instances: basis columns (e_θ, drum
 * tangent, outward radial) × uniform knobSize + the entry/exit placement
 * lifted slightly off the wall so the stud bulges above the cord.
 */
export function writeKnobInstances(
  mesh: InstancedMesh,
  nodes: CoilNode[],
  opts: ThreadPathOpts,
  knobSize: number,
): void {
  const floats = nodes.length * 2 * 3;
  if (_knobPos.length !== floats) {
    _knobPos = new Float32Array(floats);
    _knobRadial = new Float32Array(floats);
    _knobTangent = new Float32Array(floats);
  }
  knobPlacements(nodes, opts, _knobPos, _knobRadial, _knobTangent);

  const lift = knobSize * KNOB_LIFT;
  for (let i = 0; i < nodes.length * 2; i++) {
    const k = i * 3;
    const rx = _knobRadial[k]!;
    const ry = _knobRadial[k + 1]!;
    const rz = _knobRadial[k + 2]!;
    const tx = _knobTangent[k]!;
    const ty = _knobTangent[k + 1]!;
    const tz = _knobTangent[k + 2]!;
    // x = T × e_r (unit — T ⊥ e_r by construction), y = T, z = e_r outward:
    // right-handed, so the template's squashed axis points off the wall.
    const xx = ty * rz - tz * ry;
    const xy = tz * rx - tx * rz;
    const xz = tx * ry - ty * rx;
    const s = knobSize;
    _instanceMatrix.set(
      xx * s,
      tx * s,
      rx * s,
      _knobPos[k]! + rx * lift,
      xy * s,
      ty * s,
      ry * s,
      _knobPos[k + 1]! + ry * lift,
      xz * s,
      tz * s,
      rz * s,
      _knobPos[k + 2]! + rz * lift,
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
 * One merged tube sweep of the loop ribbons — bowed arcs connecting distant
 * same-region bead pairs, the connection streams revealed while a region is
 * unwound. Both regions' arcs live in ONE geometry (one draw call); the
 * shader gates visibility per fragment via aRegion against the focused
 * region. Pair topology comes from loopArcPairs, which is rank-derived from
 * the fixed region layout — open-state invariant, so the index buffer and
 * attribute sizes never change and writeRibbonGeometry can rewrite in place
 * per unwind tick, exactly like the thread. No bounding sphere maintained —
 * the mesh renders with culling disabled.
 */
export function buildRibbonGeometry(nodes: CoilNode[], width: number): BufferGeometry {
  const arcs = [
    ...loopArcPairs(nodes, 0).map((pair) => ({ pair, region: 0 })),
    ...loopArcPairs(nodes, 1).map((pair) => ({ pair, region: 1 })),
  ];
  const vertsPerArc = RIBBON_SAMPLES * RIBBON_RADIAL;
  const vertCount = arcs.length * vertsPerArc;
  const aArcT = new Float32Array(vertCount);
  const aRegion = new Float32Array(vertCount);
  const aArc = new Float32Array(vertCount);
  const indices: number[] = [];

  let v = 0;
  for (let arc = 0; arc < arcs.length; arc++) {
    const base = arc * vertsPerArc;
    for (let s = 0; s < RIBBON_SAMPLES; s++) {
      const t = s / (RIBBON_SAMPLES - 1);
      for (let ring = 0; ring < RIBBON_RADIAL; ring++) {
        aArcT[v] = t;
        aRegion[v] = arcs[arc]!.region;
        aArc[v] = arc;
        v++;
      }
    }
    for (let s = 0; s < RIBBON_SAMPLES - 1; s++) {
      for (let ring = 0; ring < RIBBON_RADIAL; ring++) {
        const r1 = (ring + 1) % RIBBON_RADIAL;
        const p0 = base + s * RIBBON_RADIAL + ring;
        const p1 = base + s * RIBBON_RADIAL + r1;
        const p2 = p0 + RIBBON_RADIAL;
        const p3 = p1 + RIBBON_RADIAL;
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
  geo.setAttribute('aArcT', new BufferAttribute(aArcT, 1));
  geo.setAttribute('aRegion', new BufferAttribute(aRegion, 1));
  geo.setAttribute('aArc', new BufferAttribute(aArc, 1));
  geo.setIndex(indices);
  writeRibbonGeometry(geo, nodes, width);
  return geo;
}

/**
 * Rewrite the ribbon tube positions/normals in place from a node state. Each
 * arc is a quadratic Bézier whose control point pushes the midpoint OUTWARD
 * from the cluster axis and lifts it — the streams bow around the mass
 * instead of cutting through it, and they stretch with the region as it
 * unwinds (endpoints ride the live bead positions).
 */
export function writeRibbonGeometry(geo: BufferGeometry, nodes: CoilNode[], width: number): void {
  const position = geo.getAttribute('position') as BufferAttribute;
  const normal = geo.getAttribute('normal') as BufferAttribute;
  const pArr = position.array as Float32Array;
  const nArr = normal.array as Float32Array;
  const arcs = [...loopArcPairs(nodes, 0), ...loopArcPairs(nodes, 1)];

  let w = 0;
  for (const [ia, ib] of arcs) {
    const a = nodes[ia]!.position;
    const b = nodes[ib]!.position;
    const span = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    // Outward = the midpoint's horizontal bearing off the cluster axis
    // (nodes are cluster-local, axis = local Y); guard the on-axis case.
    const hLen = Math.hypot(mid[0], mid[2]);
    const out: Vec3 = hLen > 1e-6 ? [mid[0] / hLen, 0, mid[2] / hLen] : [1, 0, 0];
    const control: Vec3 = [
      mid[0] + out[0] * span * 0.35,
      mid[1] + span * 0.15,
      mid[2] + out[2] * span * 0.35,
    ];
    const sample = (t: number): Vec3 => {
      const u = 1 - t;
      return [
        u * u * a[0] + 2 * u * t * control[0] + t * t * b[0],
        u * u * a[1] + 2 * u * t * control[1] + t * t * b[1],
        u * u * a[2] + 2 * u * t * control[2] + t * t * b[2],
      ];
    };
    for (let s = 0; s < RIBBON_SAMPLES; s++) {
      const t = s / (RIBBON_SAMPLES - 1);
      const point = sample(t);
      const tangent = normalize(sub(sample(Math.min(1, t + 0.03)), sample(Math.max(0, t - 0.03))));
      const ref: Vec3 = Math.abs(tangent[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
      const side = normalize(cross(tangent, ref));
      const up = cross(tangent, side);
      for (let ring = 0; ring < RIBBON_RADIAL; ring++) {
        const ang = (ring / RIBBON_RADIAL) * Math.PI * 2;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        const nx = side[0] * cos + up[0] * sin;
        const ny = side[1] * cos + up[1] * sin;
        const nz = side[2] * cos + up[2] * sin;
        pArr[w] = point[0] + nx * width;
        nArr[w] = nx;
        w++;
        pArr[w] = point[1] + ny * width;
        nArr[w] = ny;
        w++;
        pArr[w] = point[2] + nz * width;
        nArr[w] = nz;
        w++;
      }
    }
  }
  position.needsUpdate = true;
  normal.needsUpdate = true;
}
