// src/scales/chromatin/coil-thread-path.ts
// Pure path math for the wound thread — the duplex AXIS that the two backbone
// strands twist around (the sweep in coil-geometry offsets each strand off
// this centerline by ±helixRadius at the twist phase). Per drum, a helical
// WRAP of exactly `wrapTurns` revolutions around the drum's side wall, then a
// free BRIDGE curve to the next drum's wrap entry. Fill-style API — callers
// own the output arrays, so the per-tick rewrite allocates nothing. Also owns
// two continuity-critical helpers the sweep needs: cumulativeArcLength and
// computeTwistPhase (the strand twist, with its frame-rebase argument). No
// three imports; foundation layer like coil-generator, and node-tested the
// same way.
//
// Continuity contract (the reason this module looks the way it does): the
// unwind engine re-runs the generator per animation tick and re-samples this
// path from the live nodes, so every quantity here must be a CONTINUOUS pure
// function of the node state — any branch that quantizes (rounding a turn
// count, unwrapping an angle against history) pops the thread mid-tween.
// Design that guarantees it:
//   - Only the wrap ENTRY azimuth is pinned (facing the previous drum); the
//     wrap then winds a FIXED wrapTurns revolutions. Entry azimuths come
//     from atan2, whose ±π branch cut shifts φ_in by 2π — which maps every
//     wrap sample onto IDENTICAL positions (cos/sin are 2π-periodic), so
//     the cut is invisible and no unwrapping state is needed.
//   - The bridge is a free tangent-launched Bézier: it leaves the wrap exit
//     along the exit tangent (wherever the fixed winding put it — the cord
//     swooshes off circumferentially, the way a real wound spool pays out)
//     and docks at the next drum's entry, which faces it. No requirement
//     that the exit azimuth aim anywhere ⇒ no quantized correction term.
import type { CoilNode, Vec3 } from '@/utils/coil-generator';

/** Length samples per wrap helix (covers wrapTurns revolutions) — raised
 *  with the 5.6 winding retune (2.6 turns need ~17 samples/turn to stay
 *  round). */
export const WRAP_SAMPLES = 44;
/** Length samples per bridge — it curves up to ~a quarter turn around the
 *  drum before docking, so it needs more than the old straight sag tube. */
export const BRIDGE_SAMPLES = 10;
/** Fraction of the drum's half-thickness the wrap spans along the axis —
 *  keeps the winding on the side wall, inside the rim bevels. Widened in
 *  the 5.6 retune so the extra turns spread across the whole wall as a
 *  visible wound band (must stay under (h − bevel)/h ≈ 0.68 at the
 *  shipping bevel). */
export const WRAP_Z_FRACTION = 0.62;
/** Bridge control-point reach as a fraction of the bridge chord. */
export const BRIDGE_TENSION = 0.35;
/** Fraction of the cord radius sunk into the drum wall. A grazing tangent
 *  contact z-fights (dashed shimmer where cord and wall coincide — seen in
 *  preview); a shallow embed intersects cleanly and reads as the cord
 *  pressing into the material. */
export const WRAP_SINK = 0.18;

export interface ThreadPathOpts {
  /** Each backbone strand's own tube radius (geometry-consumed). The two
   *  strands twist around the axis path this module samples. */
  strandRadius: number;
  /** Axis→strand offset — half the duplex width (geometry-consumed). The
   *  wound envelope sits at drum radius + (1 − WRAP_SINK)·(helixRadius +
   *  strandRadius), so the outer strand still presses shallowly into the
   *  wall exactly as the old single cord did. */
  helixRadius: number;
  /** World-space length per full duplex twist revolution (geometry-consumed).
   *  Consumed by the sweep in coil-geometry; carried here so one opts bag
   *  threads both modules. */
  twistPitch: number;
  /** Bridge-only width multiplier: linkers taper thinner than wraps
   *  (geometry-consumed by the sweep). */
  linkerWidthScale: number;
  /** Revolutions the duplex axis winds around each drum, exact (not
   *  quantized — see header). */
  wrapTurns: number;
  /** Drum half-thickness factor (mirrors the puck template bake). */
  beadAspect: number;
  /** Bridge sag, ramped in only on long spans (an unwound region's
   *  stretched cord droops; compact rim-to-rim hops stay taut). */
  linkerSag: number;
  /** Sparse rung-bar radius (geometry-consumed by the sweep). */
  rungRadius: number;
  /** Arc-length between sparse rung bars (geometry-consumed by the sweep). */
  rungSpacing: number;
}

const TWO_PI = Math.PI * 2;

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function smoothstepLocal(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Total path points for a bead count (wrap points + bridge points). */
export function threadPointCount(beadCount: number): number {
  return beadCount * WRAP_SAMPLES + Math.max(0, beadCount - 1) * BRIDGE_SAMPLES;
}

/** Azimuth of a direction in the drum's (normal, binormal) plane; null when
 *  the direction is degenerate (parallel to the drum axis). */
function azimuthOf(dir: Vec3, node: CoilNode): number | null {
  const t = node.tangent;
  const along = dot(dir, t);
  const px = dir[0] - t[0] * along;
  const py = dir[1] - t[1] * along;
  const pz = dir[2] - t[2] * along;
  if (Math.hypot(px, py, pz) < 1e-4) return null;
  const p: Vec3 = [px, py, pz];
  return Math.atan2(dot(p, node.binormal), dot(p, node.normal));
}

/**
 * Wrap entry azimuth for drum i: faces the PREVIOUS drum, so the incoming
 * bridge docks aimed. The first drum has no arrival to aim, so its EXIT
 * (entry + wrapTurns revolutions) faces the next drum instead.
 */
export function wrapEntryAzimuth(nodes: CoilNode[], i: number, wrapTurns: number): number {
  const node = nodes[i]!;
  if (i > 0) {
    return azimuthOf(sub(nodes[i - 1]!.position, node.position), node) ?? 0;
  }
  const toNext = nodes.length > 1 ? azimuthOf(sub(nodes[1]!.position, node.position), node) : null;
  return (toNext ?? 0) - wrapTurns * TWO_PI;
}

// Scratch state for one wrap sample — reused across every call; this module
// runs on the unwind tween path where allocation is banned.
const _p: Vec3 = [0, 0, 0];
const _tan: Vec3 = [0, 0, 0];
const _side: Vec3 = [0, 0, 0];
const _up: Vec3 = [0, 0, 0];

/** Evaluate one wrap sample (position, unit tangent, unit radial side) into
 *  the module scratch vectors. u = 0 is the entry face (toward the previous
 *  drum), u = 1 the exit face. */
function wrapSample(
  node: CoilNode,
  phiIn: number,
  deltaPhi: number,
  zW: number,
  rWrap: number,
  u: number,
): void {
  const phi = phiIn + deltaPhi * u;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const N = node.normal;
  const B = node.binormal;
  const T = node.tangent;
  const z = -zW + 2 * zW * u;
  for (let c = 0; c < 3; c++) {
    const side = N[c]! * cos + B[c]! * sin;
    _side[c] = side;
    _p[c] = node.position[c]! + side * rWrap + T[c]! * z;
    // Unnormalized helix tangent: dP/du = Δφ·r·e_θ + 2z_w·T.
    _tan[c] = deltaPhi * rWrap * (-N[c]! * sin + B[c]! * cos) + 2 * zW * T[c]!;
  }
  const tLen = Math.hypot(_tan[0], _tan[1], _tan[2]) || 1;
  _tan[0] /= tLen;
  _tan[1] /= tLen;
  _tan[2] /= tLen;
  // side = e_r is exactly ⊥ tangent (e_r·e_θ = 0, e_r·T = 0), so the ring
  // basis needs no re-orthogonalization.
  _up[0] = _tan[1] * _side[2] - _tan[2] * _side[1];
  _up[1] = _tan[2] * _side[0] - _tan[0] * _side[2];
  _up[2] = _tan[0] * _side[1] - _tan[1] * _side[0];
}

/**
 * Sample the full wound path from a live node state into caller-owned flat
 * arrays (each 3·threadPointCount floats): ring center positions and the
 * ring frame (side, up — both unit, mutually orthogonal, ⊥ path tangent).
 * Point order: wrap 0, bridge 0→1, wrap 1, bridge 1→2, … wrap n-1 — a
 * single run along the thread, so a cumulative index is a valid arc
 * coordinate for shimmer.
 */
export function sampleThreadPath(
  nodes: CoilNode[],
  opts: ThreadPathOpts,
  outPoints: Float32Array,
  outSides: Float32Array,
  outUps: Float32Array,
): void {
  const n = nodes.length;
  const deltaPhi = opts.wrapTurns * TWO_PI;
  // Compound envelope: the axis path sits where the OUTER strand would ride,
  // so the old single-cord wall contact is preserved by the duplex.
  const W = opts.helixRadius + opts.strandRadius;
  let w = 0;

  // Bridge endpoint state carried between drums (positions/tangents/sides of
  // the wrap exit and the next wrap entry) — fixed scratch, no allocation.
  const exitP: Vec3 = [0, 0, 0];
  const exitT: Vec3 = [0, 0, 0];
  const exitS: Vec3 = [0, 0, 0];
  const entryP: Vec3 = [0, 0, 0];
  const entryT: Vec3 = [0, 0, 0];
  const c1: Vec3 = [0, 0, 0];
  const c2: Vec3 = [0, 0, 0];
  const side: Vec3 = [0, 0, 0];
  const pt: Vec3 = [0, 0, 0];

  for (let i = 0; i < n; i++) {
    const node = nodes[i]!;
    const phiIn = wrapEntryAzimuth(nodes, i, opts.wrapTurns);
    const rWrap = node.radius + W * (1 - WRAP_SINK);
    const zW = WRAP_Z_FRACTION * node.radius * opts.beadAspect;

    for (let s = 0; s < WRAP_SAMPLES; s++) {
      wrapSample(node, phiIn, deltaPhi, zW, rWrap, s / (WRAP_SAMPLES - 1));
      outPoints[w] = _p[0];
      outSides[w] = _side[0];
      outUps[w] = _up[0];
      outPoints[w + 1] = _p[1];
      outSides[w + 1] = _side[1];
      outUps[w + 1] = _up[1];
      outPoints[w + 2] = _p[2];
      outSides[w + 2] = _side[2];
      outUps[w + 2] = _up[2];
      w += 3;
    }

    if (i === n - 1) break;

    // Bridge: exit of drum i → entry of drum i+1.
    wrapSample(node, phiIn, deltaPhi, zW, rWrap, 1);
    exitP[0] = _p[0];
    exitP[1] = _p[1];
    exitP[2] = _p[2];
    exitT[0] = _tan[0];
    exitT[1] = _tan[1];
    exitT[2] = _tan[2];
    exitS[0] = _side[0];
    exitS[1] = _side[1];
    exitS[2] = _side[2];

    const next = nodes[i + 1]!;
    const nextPhiIn = wrapEntryAzimuth(nodes, i + 1, opts.wrapTurns);
    const nextZW = WRAP_Z_FRACTION * next.radius * opts.beadAspect;
    wrapSample(next, nextPhiIn, deltaPhi, nextZW, next.radius + W * (1 - WRAP_SINK), 0);
    entryP[0] = _p[0];
    entryP[1] = _p[1];
    entryP[2] = _p[2];
    entryT[0] = _tan[0];
    entryT[1] = _tan[1];
    entryT[2] = _tan[2];

    const span = Math.hypot(entryP[0] - exitP[0], entryP[1] - exitP[1], entryP[2] - exitP[2]);
    const reach = BRIDGE_TENSION * span;
    // Sag ramps in with span: compact rim-to-rim hops stay taut (which also
    // keeps the bridge's end tangents EXACTLY the wrap tangents — coincident
    // junction rings); an unwound region's long cord droops.
    const sag = opts.linkerSag * span * smoothstepLocal(1.2, 3.5, span);
    for (let c = 0; c < 3; c++) {
      c1[c] = exitP[c]! + exitT[c]! * reach;
      c2[c] = entryP[c]! - entryT[c]! * reach;
    }
    c1[1] -= sag;
    c2[1] -= sag;

    // Parallel-transported ring frames seeded from the wrap-exit side: the
    // first bridge ring coincides with the wrap's last ring (same center,
    // same tangent when taut), so the tube surface is continuous through
    // the junction without shared vertices.
    side[0] = exitS[0];
    side[1] = exitS[1];
    side[2] = exitS[2];

    for (let s = 0; s < BRIDGE_SAMPLES; s++) {
      const t = s / (BRIDGE_SAMPLES - 1);
      const u = 1 - t;
      const w0 = u * u * u;
      const w1 = 3 * u * u * t;
      const w2 = 3 * u * t * t;
      const w3 = t * t * t;
      pt[0] = w0 * exitP[0] + w1 * c1[0] + w2 * c2[0] + w3 * entryP[0];
      pt[1] = w0 * exitP[1] + w1 * c1[1] + w2 * c2[1] + w3 * entryP[1];
      pt[2] = w0 * exitP[2] + w1 * c1[2] + w2 * c2[2] + w3 * entryP[2];
      // Analytic Bézier derivative — exact end tangents, no finite-diff.
      const d0 = 3 * u * u;
      const d1 = 6 * u * t;
      const d2 = 3 * t * t;
      let tx = d0 * (c1[0] - exitP[0]) + d1 * (c2[0] - c1[0]) + d2 * (entryP[0] - c2[0]);
      let ty = d0 * (c1[1] - exitP[1]) + d1 * (c2[1] - c1[1]) + d2 * (entryP[1] - c2[1]);
      let tz = d0 * (c1[2] - exitP[2]) + d1 * (c2[2] - c1[2]) + d2 * (entryP[2] - c2[2]);
      const dLen = Math.hypot(tx, ty, tz) || 1;
      tx /= dLen;
      ty /= dLen;
      tz /= dLen;
      // Transport the side: project the previous side off the new tangent.
      const along = side[0] * tx + side[1] * ty + side[2] * tz;
      side[0] -= tx * along;
      side[1] -= ty * along;
      side[2] -= tz * along;
      const sLen = Math.hypot(side[0], side[1], side[2]) || 1;
      side[0] /= sLen;
      side[1] /= sLen;
      side[2] /= sLen;

      outPoints[w] = pt[0];
      outSides[w] = side[0];
      outPoints[w + 1] = pt[1];
      outSides[w + 1] = side[1];
      outPoints[w + 2] = pt[2];
      outSides[w + 2] = side[2];
      outUps[w] = ty * side[2] - tz * side[1];
      outUps[w + 1] = tz * side[0] - tx * side[2];
      outUps[w + 2] = tx * side[1] - ty * side[0];
      w += 3;
    }
  }
}

/**
 * Cinch-knob placements: 2 per drum, at the thread's entry and exit points
 * on the wall (entry first). Fills positions, outward radial directions, and
 * drum tangents — the geometry writer derives the full basis and applies the
 * knob's outward bulge itself (it owns knobSize).
 */
export function knobPlacements(
  nodes: CoilNode[],
  opts: ThreadPathOpts,
  outPos: Float32Array,
  outRadial: Float32Array,
  outTangent: Float32Array,
): void {
  const deltaPhi = opts.wrapTurns * TWO_PI;
  const W = opts.helixRadius + opts.strandRadius;
  let w = 0;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const phiIn = wrapEntryAzimuth(nodes, i, opts.wrapTurns);
    const rWrap = node.radius + W * (1 - WRAP_SINK);
    const zW = WRAP_Z_FRACTION * node.radius * opts.beadAspect;
    for (const u of [0, 1]) {
      wrapSample(node, phiIn, deltaPhi, zW, rWrap, u);
      outPos[w] = _p[0];
      outRadial[w] = _side[0];
      outTangent[w] = node.tangent[0];
      outPos[w + 1] = _p[1];
      outRadial[w + 1] = _side[1];
      outTangent[w + 1] = node.tangent[1];
      outPos[w + 2] = _p[2];
      outRadial[w + 2] = _side[2];
      outTangent[w + 2] = node.tangent[2];
      w += 3;
    }
  }
}

/**
 * Cumulative Euclidean arc length along the merged path, filled into a
 * caller-owned array (length === totalPoints): s[0] = 0, s[k] = s[k-1] +
 * |P_k − P_{k-1}|. A continuous, monotonic function of the sampled points, so
 * any phase derived from it is continuous under the unwind. Each duplicated
 * wrap↔bridge junction contributes a ~0 chord, so it is invisible here too.
 */
export function cumulativeArcLength(
  points: Float32Array,
  totalPoints: number,
  outArc: Float32Array,
): void {
  outArc[0] = 0;
  for (let i = 1; i < totalPoints; i++) {
    const k = i * 3;
    const dx = points[k]! - points[k - 3]!;
    const dy = points[k + 1]! - points[k - 2]!;
    const dz = points[k + 2]! - points[k - 1]!;
    outArc[i] = outArc[i - 1]! + Math.hypot(dx, dy, dz);
  }
}

/**
 * Duplex twist phase ψ per axis sample, filled into a caller-owned array:
 * ψ_i = 2π·s_i/twistPitch + psiOffset. The strand sweep places each backbone
 * at `cos ψ·side + sin ψ·up` off the axis, so ψ must be a CONTINUOUS function
 * of node state or the offset strands pop mid-unwind.
 *
 * The load-bearing subtlety (the second continuity trick in this file): each
 * wrap's (side, up) ENTRY frame is computed independently (fresh
 * wrapEntryAzimuth + wrapSample) from the incoming bridge's TRANSPORTED frame
 * — two different orthonormal bases of the same tangent-plane. For the
 * rotationally-symmetric axis tube that mismatch is invisible (a circle has no
 * "angle 0"), but an OFFSET strand would jump by up to 2·helixRadius·sin(Δ/2)
 * at every bridge→wrap junction. Fix: at each such junction rebase the running
 * phase by
 *     Δ = atan2(S_end·U_entry, S_end·S_entry)
 * the signed angle from the entry frame to the end frame (U = T×S in both, so
 * rotating S by Δ rotates U by Δ). A world direction at angle φ in the end
 * frame reads as φ + Δ in the entry frame, so carrying `psiOffset += Δ` keeps
 * the strand's WORLD direction continuous across the junction. One atan2 per
 * drum transition. Continuous under the unwind: the atan2 branch cut only ever
 * feeds cos/sin downstream, so a 2π jump is invisible — the same argument that
 * makes wrapEntryAzimuth's own cut invisible.
 *
 * The wrap↔bridge junction WITHIN a drum needs no rebase: the bridge seeds its
 * frame directly from the wrap exit (Δ = 0 there by construction).
 */
export function computeTwistPhase(
  beadCount: number,
  sides: Float32Array,
  ups: Float32Array,
  arc: Float32Array,
  twistPitch: number,
  outPsi: Float32Array,
): void {
  const total = threadPointCount(beadCount);
  const cyc = WRAP_SAMPLES + BRIDGE_SAMPLES;
  const k = TWO_PI / Math.max(twistPitch, 1e-4);
  let psiOffset = 0;
  for (let i = 0; i < total; i++) {
    // A new wrap begins at every `cyc` boundary after the first — point i-1 is
    // the previous drum's bridge exit, a rotated basis of this wrap's entry.
    if (i > 0 && i % cyc === 0) {
      const e = (i - 1) * 3;
      const nn = i * 3;
      const seSx = sides[e]!;
      const seSy = sides[e + 1]!;
      const seSz = sides[e + 2]!;
      const enSx = sides[nn]!;
      const enSy = sides[nn + 1]!;
      const enSz = sides[nn + 2]!;
      const enUx = ups[nn]!;
      const enUy = ups[nn + 1]!;
      const enUz = ups[nn + 2]!;
      const dotSS = seSx * enSx + seSy * enSy + seSz * enSz;
      const dotSU = seSx * enUx + seSy * enUy + seSz * enUz;
      psiOffset += Math.atan2(dotSU, dotSS);
    }
    outPsi[i] = k * arc[i]! + psiOffset;
  }
}
