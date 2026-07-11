// src/scales/chromatin/coil-geometry.ts
// Coil bead list → GPU resources, three instanced/merged layers: an
// InstancedMesh of beveled drum beads (ONE shared puck template, per-bead
// placement in instance matrices), one merged tube sweep of the wound DNA-style
// double-helix thread (two backbone strands twisting around the coil-thread-path
// axis + sparse rung bars), and an InstancedMesh of cinch knobs at each drum's
// thread entry/exit.
//
// Approach-B contract: the unwind engine re-runs the generator per animation
// tick and pushes the new state through the write* functions here — instance
// matrix writes for beads and knobs, a position/normal/aShade rewrite-in-place
// for the thread. Buffer SIZES are open-state invariant (bead count and segment
// topology never change — rung count is fixed at build), so the writers never
// reallocate.
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
  cumulativeArcLength,
  computeTwistPhase,
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

// Backbone-strand tube tessellation: each of the two strands is a thin tube
// swept with 6 radial segments — rounder than a hexagon at this small radius,
// and modest since there are now two strands where there was one cord.
const STRAND_RADIAL = 6;
// Rung-bar tessellation: the sparse base-pair cross-bars are tiny and nearly
// straight, so a 2-ring, 4-sided stub reads round enough.
const RUNG_RADIAL = 4;

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
  beadDome = 0,
): BufferGeometry {
  // Profile in (radial, axial) coordinates: unit outer radius, half-thickness
  // h, bevel arc of radius b centered at (1-b, h-b). Clamping b against h
  // keeps the wall extent positive under any dev-slider pairing. The cap is
  // a shallow paraboloid crown (5.6 feedback: flat caps read as coins, not
  // pucks) — z = h + dome·(1 − (r/rEdge)²), analytic slope normals.
  const h = beadAspect;
  const b = Math.min(beadBevel, h * 0.95, 0.95);
  const rEdge = 1 - b;
  const dome = Math.max(0, beadDome);
  // Paraboloid surface normal at radius r: ∝ (2·dome·r/rEdge², 1).
  const capRow = (r: number): { r: number; z: number; nr: number; nz: number; cap: number } => {
    const q = r / rEdge;
    const slope = (2 * dome * r) / (rEdge * rEdge);
    const len = Math.hypot(slope, 1);
    return { r, z: h + dome * (1 - q * q), nr: slope / len, nz: 1 / len, cap: 1 };
  };
  const profile: { r: number; z: number; nr: number; nz: number; cap: number }[] = [
    capRow(0),
    capRow(rEdge * 0.5),
    capRow(rEdge),
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

// Ring sweep tables — the radial counts are fixed, so the per-ring trig is
// precomputed once for the whole module.
const STRAND_COS = Array.from({ length: STRAND_RADIAL }, (_, r) =>
  Math.cos((r / STRAND_RADIAL) * Math.PI * 2),
);
const STRAND_SIN = Array.from({ length: STRAND_RADIAL }, (_, r) =>
  Math.sin((r / STRAND_RADIAL) * Math.PI * 2),
);
const RUNG_COS = Array.from({ length: RUNG_RADIAL }, (_, r) =>
  Math.cos((r / RUNG_RADIAL) * Math.PI * 2),
);
const RUNG_SIN = Array.from({ length: RUNG_RADIAL }, (_, r) =>
  Math.sin((r / RUNG_RADIAL) * Math.PI * 2),
);

function smoothstep01(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * The wound thread as a DNA-style double helix: the coil-thread-path centerline
 * is the duplex AXIS, and TWO thin backbone strands twist around it (offset by
 * ±helixRadius at the twist phase ψ), joined by sparse rung bars. One merged
 * geometry, one material — strand A verts, then strand B verts, then the rungs.
 *
 * Static per-vertex data (index buffer, aT, aRegion, drift seeds, aStrand) is
 * open-state invariant and baked once here. Dynamic data — position, normal,
 * and aShade (whose occlusion now rotates with ψ) — is rewritten every unwind
 * tick by writeThreadGeometry. Junction rings are duplicated per strand (wrap
 * exit == bridge start by construction), so segments never share vertices and
 * each strand's surface stays sealed through any frame phase. No bounding
 * sphere is maintained — the mesh renders with culling disabled.
 *
 * Rung count is fixed at build time from the compact path's arc length (so the
 * buffers never resize during the unwind); their world spacing simply stretches
 * with the strands as a region opens.
 *
 * Drift registration: the drums drift in their vertex shader, so both strands
 * and the rungs carry the SAME formula — a per-vertex seed pair + blend factor,
 * inherited from the axis sample they ride (wrap samples pin to one drum; bridge
 * samples blend their two endpoint drums). Without this the winding would
 * visibly detach from a drifting drum.
 */
export function buildThreadGeometry(nodes: CoilNode[], opts: ThreadPathOpts): BufferGeometry {
  const n = nodes.length;
  const totalPoints = threadPointCount(n);
  const strandVerts = totalPoints * STRAND_RADIAL;

  // Choose sparse rung anchor points by arc length along the COMPACT path.
  // Build runs only on a param change, so this local sampling is off the
  // per-tick path; the count is FIXED here (open-state invariant).
  const cp = new Float32Array(totalPoints * 3);
  const cs = new Float32Array(totalPoints * 3);
  const cu = new Float32Array(totalPoints * 3);
  sampleThreadPath(nodes, opts, cp, cs, cu);
  const carc = new Float32Array(totalPoints);
  cumulativeArcLength(cp, totalPoints, carc);
  const spacing = opts.rungSpacing;
  const rungCount = spacing > 1e-4 ? Math.max(0, Math.floor(carc[totalPoints - 1]! / spacing)) : 0;
  const rungPointIdx = new Int32Array(rungCount);
  {
    let j = 0;
    for (let r = 0; r < rungCount; r++) {
      const target = (r + 0.5) * spacing;
      while (j < totalPoints - 1 && carc[j]! < target) j++;
      rungPointIdx[r] = j;
    }
  }

  const rungBase = 2 * strandVerts;
  const totalVerts = rungBase + rungCount * 2 * RUNG_RADIAL;

  const aT = new Float32Array(totalVerts);
  const aRegion = new Float32Array(totalVerts);
  const aSeedA = new Float32Array(totalVerts);
  const aSeedB = new Float32Array(totalVerts);
  const aDriftMix = new Float32Array(totalVerts);
  const aStrand = new Float32Array(totalVerts);
  const indices: number[] = [];

  // Per-axis-point metadata: describes which drum(s) the sample belongs to —
  // identical for both strands and any rung anchored there. Same drum/segment
  // structure as the path's point order.
  const tp = new Float32Array(totalPoints);
  const rp = new Float32Array(totalPoints);
  const sap = new Float32Array(totalPoints);
  const sbp = new Float32Array(totalPoints);
  const dmp = new Float32Array(totalPoints);
  {
    let pt = 0;
    for (let i = 0; i < n; i++) {
      const node = nodes[i]!;
      const seed = hash01(i);
      for (let s = 0; s < WRAP_SAMPLES; s++) {
        tp[pt] = pt / (totalPoints - 1);
        rp[pt] = node.region;
        sap[pt] = seed;
        sbp[pt] = seed;
        dmp[pt] = 0;
        pt++;
      }
      if (i === n - 1) break;
      const next = nodes[i + 1]!;
      const shared = node.region === next.region ? node.region : -1;
      const nextSeed = hash01(i + 1);
      for (let s = 0; s < BRIDGE_SAMPLES; s++) {
        tp[pt] = pt / (totalPoints - 1);
        rp[pt] = shared;
        sap[pt] = seed;
        sbp[pt] = nextSeed;
        dmp[pt] = s / (BRIDGE_SAMPLES - 1);
        pt++;
      }
    }
  }

  // Expand per-point metadata into each strand's ring, then the rungs.
  for (let strand = 0; strand < 2; strand++) {
    const base = strand * strandVerts;
    for (let pt = 0; pt < totalPoints; pt++) {
      for (let ring = 0; ring < STRAND_RADIAL; ring++) {
        const v = base + pt * STRAND_RADIAL + ring;
        aT[v] = tp[pt]!;
        aRegion[v] = rp[pt]!;
        aSeedA[v] = sap[pt]!;
        aSeedB[v] = sbp[pt]!;
        aDriftMix[v] = dmp[pt]!;
        aStrand[v] = strand;
      }
    }
  }
  for (let r = 0; r < rungCount; r++) {
    const pt = rungPointIdx[r]!;
    for (let vv = 0; vv < 2 * RUNG_RADIAL; vv++) {
      const v = rungBase + r * 2 * RUNG_RADIAL + vv;
      aT[v] = tp[pt]!;
      aRegion[v] = rp[pt]!;
      aSeedA[v] = sap[pt]!;
      aSeedB[v] = sbp[pt]!;
      aDriftMix[v] = dmp[pt]!;
      aStrand[v] = 0; // rungs share strand A's pulse phase
    }
  }

  // Index strips: each strand tube segment-by-segment (wrap then bridge), with
  // junction rings duplicated; then each rung's 2-ring stub.
  const pushStrip = (base: number, firstPoint: number, ringCount: number, radial: number): void => {
    for (let s = 0; s < ringCount - 1; s++) {
      for (let ring = 0; ring < radial; ring++) {
        const r1 = (ring + 1) % radial;
        const p0 = base + (firstPoint + s) * radial + ring;
        const p1 = base + (firstPoint + s) * radial + r1;
        const p2 = p0 + radial;
        const p3 = p1 + radial;
        indices.push(p0, p2, p1, p1, p2, p3);
      }
    }
  };
  for (let strand = 0; strand < 2; strand++) {
    const base = strand * strandVerts;
    let fp = 0;
    for (let i = 0; i < n; i++) {
      pushStrip(base, fp, WRAP_SAMPLES, STRAND_RADIAL);
      fp += WRAP_SAMPLES;
      if (i === n - 1) break;
      pushStrip(base, fp, BRIDGE_SAMPLES, STRAND_RADIAL);
      fp += BRIDGE_SAMPLES;
    }
  }
  for (let r = 0; r < rungCount; r++) {
    pushStrip(rungBase + r * 2 * RUNG_RADIAL, 0, 2, RUNG_RADIAL);
  }

  const geo = new BufferGeometry();
  const position = new BufferAttribute(new Float32Array(totalVerts * 3), 3);
  const normal = new BufferAttribute(new Float32Array(totalVerts * 3), 3);
  const shade = new BufferAttribute(new Float32Array(totalVerts), 1);
  position.setUsage(DynamicDrawUsage);
  normal.setUsage(DynamicDrawUsage);
  shade.setUsage(DynamicDrawUsage);
  geo.setAttribute('position', position);
  geo.setAttribute('normal', normal);
  geo.setAttribute('aShade', shade);
  geo.setAttribute('aT', new BufferAttribute(aT, 1));
  geo.setAttribute('aRegion', new BufferAttribute(aRegion, 1));
  geo.setAttribute('aSeedA', new BufferAttribute(aSeedA, 1));
  geo.setAttribute('aSeedB', new BufferAttribute(aSeedB, 1));
  geo.setAttribute('aDriftMix', new BufferAttribute(aDriftMix, 1));
  geo.setAttribute('aStrand', new BufferAttribute(aStrand, 1));
  geo.setIndex(indices);
  geo.userData.rungPointIdx = rungPointIdx;
  geo.userData.rungCount = rungCount;
  writeThreadGeometry(geo, nodes, opts);
  return geo;
}

// Path + twist scratch for writeThreadGeometry — sized on first use, resized
// only when the bead count changes (a dev-slider event); zero allocation on
// the tween path.
let _threadPts = new Float32Array(0);
let _threadSides = new Float32Array(0);
let _threadUps = new Float32Array(0);
let _arc = new Float32Array(0);
let _psi = new Float32Array(0);

/**
 * Rewrite the duplex positions/normals/aShade in place from a node state:
 * re-sample the axis path + its arc length + the twist phase ψ, then per axis
 * sample offset the two strands by ±effHelix along (cos ψ·side + sin ψ·up) and
 * sweep each into STRAND_RADIAL vertices; finally sweep the sparse rungs
 * between the two strand centers. The winding (and its twist) follows the
 * unwind naturally because everything is defined ON the drum's live frame.
 *
 * Linker taper: bridge samples scale both radii down by radiusScale (1 at each
 * junction → seamless with the flanking wrap, dipping to linkerWidthScale
 * mid-span), so linkers read as slim delicate strands while the wraps stay
 * full — most visible on the long stretched linkers of an open region.
 */
export function writeThreadGeometry(
  geo: BufferGeometry,
  nodes: CoilNode[],
  opts: ThreadPathOpts,
): void {
  const n = nodes.length;
  const totalPoints = threadPointCount(n);
  const floats = totalPoints * 3;
  if (_threadPts.length !== floats) {
    _threadPts = new Float32Array(floats);
    _threadSides = new Float32Array(floats);
    _threadUps = new Float32Array(floats);
    _arc = new Float32Array(totalPoints);
    _psi = new Float32Array(totalPoints);
  }
  sampleThreadPath(nodes, opts, _threadPts, _threadSides, _threadUps);
  cumulativeArcLength(_threadPts, totalPoints, _arc);
  computeTwistPhase(n, _threadSides, _threadUps, _arc, opts.twistPitch, _psi);

  const position = geo.getAttribute('position') as BufferAttribute;
  const normal = geo.getAttribute('normal') as BufferAttribute;
  const shade = geo.getAttribute('aShade') as BufferAttribute;
  const pArr = position.array as Float32Array;
  const nArr = normal.array as Float32Array;
  const shArr = shade.array as Float32Array;

  const cyc = WRAP_SAMPLES + BRIDGE_SAMPLES;
  const strandVerts = totalPoints * STRAND_RADIAL;
  const helixR = opts.helixRadius;
  const strandR = opts.strandRadius;
  const linkerScale = opts.linkerWidthScale;
  let curAdj = 0;

  for (let i = 0; i < totalPoints; i++) {
    const k = i * 3;
    const px = _threadPts[k]!;
    const py = _threadPts[k + 1]!;
    const pz = _threadPts[k + 2]!;
    const sx = _threadSides[k]!;
    const sy = _threadSides[k + 1]!;
    const sz = _threadSides[k + 2]!;
    const ux = _threadUps[k]!;
    const uy = _threadUps[k + 1]!;
    const uz = _threadUps[k + 2]!;
    const psi = _psi[i]!;
    const c = Math.cos(psi);
    const s = Math.sin(psi);
    // Strand A offset direction (also its outward ring normal at ring 0) and
    // its in-plane ring partner. Strand B is the diametric mirror.
    const sAx = c * sx + s * ux;
    const sAy = c * sy + s * uy;
    const sAz = c * sz + s * uz;
    const uAx = -s * sx + c * ux;
    const uAy = -s * sy + c * uy;
    const uAz = -s * sz + c * uz;

    const cyclePos = i % cyc;
    let wallK: number;
    let axialK: number;
    let scale: number;
    if (cyclePos < WRAP_SAMPLES) {
      if (cyclePos === 0) {
        // Adjacent-turn crowding for this drum's wrap (in strand radii),
        // recomputed once per wrap. Below ~2.5 the turns shade each other.
        const node = nodes[(i / cyc) | 0]!;
        const zW = WRAP_Z_FRACTION * node.radius * opts.beadAspect;
        const turnPitch = (2 * zW) / Math.max(opts.wrapTurns, 1e-3);
        curAdj = 1 - smoothstep01(2.5, 4, turnPitch / Math.max(strandR, 1e-4));
      }
      wallK = 1;
      axialK = curAdj;
      scale = 1;
    } else {
      const sb = cyclePos - WRAP_SAMPLES;
      const capK = Math.max(0, 1 - sb / 2.5, 1 - (BRIDGE_SAMPLES - 1 - sb) / 2.5);
      wallK = capK;
      axialK = 0;
      scale = linkerScale + (1 - linkerScale) * capK;
    }
    const effHelix = helixR * scale;
    const effStrand = strandR * scale;

    // Baked occlusion, now keyed to ψ (strand A faces the wall at ψ≈π, strand
    // B at ψ≈0). Constant within each strand's own thin ring.
    const ash = 0.35 * Math.pow(Math.abs(s), 1.5);
    const shadeA = wallK * 0.45 * Math.pow(Math.max(0, -c), 1.5) + axialK * ash;
    const shadeB = wallK * 0.45 * Math.pow(Math.max(0, c), 1.5) + axialK * ash;

    const ax = px + effHelix * sAx;
    const ay = py + effHelix * sAy;
    const az = pz + effHelix * sAz;
    const bx = px - effHelix * sAx;
    const by = py - effHelix * sAy;
    const bz = pz - effHelix * sAz;

    // Strand A ring.
    let w = i * STRAND_RADIAL * 3;
    let vs = i * STRAND_RADIAL;
    for (let ring = 0; ring < STRAND_RADIAL; ring++) {
      const cc = STRAND_COS[ring]!;
      const ss = STRAND_SIN[ring]!;
      const nx = sAx * cc + uAx * ss;
      const ny = sAy * cc + uAy * ss;
      const nz = sAz * cc + uAz * ss;
      pArr[w] = ax + nx * effStrand;
      nArr[w] = nx;
      w++;
      pArr[w] = ay + ny * effStrand;
      nArr[w] = ny;
      w++;
      pArr[w] = az + nz * effStrand;
      nArr[w] = nz;
      w++;
      shArr[vs++] = shadeA;
    }
    // Strand B ring (basis −sA, −uA → normals negate A's; same winding sense).
    w = (strandVerts + i * STRAND_RADIAL) * 3;
    vs = strandVerts + i * STRAND_RADIAL;
    for (let ring = 0; ring < STRAND_RADIAL; ring++) {
      const cc = STRAND_COS[ring]!;
      const ss = STRAND_SIN[ring]!;
      const nx = -(sAx * cc + uAx * ss);
      const ny = -(sAy * cc + uAy * ss);
      const nz = -(sAz * cc + uAz * ss);
      pArr[w] = bx + nx * effStrand;
      nArr[w] = nx;
      w++;
      pArr[w] = by + ny * effStrand;
      nArr[w] = ny;
      w++;
      pArr[w] = bz + nz * effStrand;
      nArr[w] = nz;
      w++;
      shArr[vs++] = shadeB;
    }
  }

  // Sparse rungs: a short bar between the two strand centers at each anchor,
  // its axis along (cos ψ·side + sin ψ·up), cross-section in the plane of the
  // path tangent (T = side × up).
  const ud = geo.userData as { rungPointIdx?: Int32Array; rungCount?: number };
  const rungPointIdx = ud.rungPointIdx;
  const rungCount = ud.rungCount ?? 0;
  const rungBase = 2 * strandVerts;
  const rho = opts.rungRadius;
  for (let r = 0; r < rungCount && rungPointIdx; r++) {
    const p = rungPointIdx[r]!;
    const k = p * 3;
    const px = _threadPts[k]!;
    const py = _threadPts[k + 1]!;
    const pz = _threadPts[k + 2]!;
    const sx = _threadSides[k]!;
    const sy = _threadSides[k + 1]!;
    const sz = _threadSides[k + 2]!;
    const ux = _threadUps[k]!;
    const uy = _threadUps[k + 1]!;
    const uz = _threadUps[k + 2]!;
    const psi = _psi[p]!;
    const c = Math.cos(psi);
    const s = Math.sin(psi);
    const sAx = c * sx + s * ux;
    const sAy = c * sy + s * uy;
    const sAz = c * sz + s * uz;
    // Path tangent T = side × up, and the third cross-section axis sA × T.
    const tx = sy * uz - sz * uy;
    const ty = sz * ux - sx * uz;
    const tz = sx * uy - sy * ux;
    const w2x = sAy * tz - sAz * ty;
    const w2y = sAz * tx - sAx * tz;
    const w2z = sAx * ty - sAy * tx;
    const cyclePos = p % cyc;
    let scale = 1;
    if (cyclePos >= WRAP_SAMPLES) {
      const sb = cyclePos - WRAP_SAMPLES;
      const capK = Math.max(0, 1 - sb / 2.5, 1 - (BRIDGE_SAMPLES - 1 - sb) / 2.5);
      scale = linkerScale + (1 - linkerScale) * capK;
    }
    const effHelix = helixR * scale;
    let w = (rungBase + r * 2 * RUNG_RADIAL) * 3;
    let vs = rungBase + r * 2 * RUNG_RADIAL;
    for (let end = 0; end < 2; end++) {
      // end 0 = strand B center, end 1 = strand A center.
      const sign = end === 0 ? -1 : 1;
      const ex = px + sign * effHelix * sAx;
      const ey = py + sign * effHelix * sAy;
      const ez = pz + sign * effHelix * sAz;
      for (let ring = 0; ring < RUNG_RADIAL; ring++) {
        const cc = RUNG_COS[ring]!;
        const ss = RUNG_SIN[ring]!;
        const nx = tx * cc + w2x * ss;
        const ny = ty * cc + w2y * ss;
        const nz = tz * cc + w2z * ss;
        pArr[w] = ex + nx * rho;
        nArr[w] = nx;
        w++;
        pArr[w] = ey + ny * rho;
        nArr[w] = ny;
        w++;
        pArr[w] = ez + nz * rho;
        nArr[w] = nz;
        w++;
        shArr[vs++] = 0.4;
      }
    }
  }

  position.needsUpdate = true;
  normal.needsUpdate = true;
  shade.needsUpdate = true;
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
