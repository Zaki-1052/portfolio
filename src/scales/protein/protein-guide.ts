// src/scales/protein/protein-guide.ts
// Pure guide math for the ribbon sweep — per-residue Cα + carbonyl-O atoms in,
// a per-guide-point (position, tangent, up) frame out. Fill-style API: callers
// own the output arrays, so the per-tick rewrite allocates nothing. No three
// imports; foundation layer like coil-thread-path, and node-tested the same way.
//
// The guide contract is 3 parallel arrays of vec3 — position, tangent, up —
// deliberately the same triple the offline pipeline bakes into mpro-static.json
// (9 floats per point: pos, tangent, normal). That is what lets the static
// companion structure skip this module entirely and feed the sweep directly:
// protein-geometry only ever reads (position, tangent, up), never atoms.
//
// FRAME CONVENTION — the load-bearing decision in this module.
// The pipeline ships one flip-corrected unit vector per residue, derived from
// the Cα→O direction. It is consumed as the ribbon's WIDTH axis, not its
// surface normal:
//
//     side = normalize(Craw − tan · dot(tan, Craw))   // width axis
//     up   = normalize(cross(tan, side))              // surface normal
//
// Why: in an ideal helix the Cα trace's tangent is mostly tangential (θ̂) while
// the carbonyls point roughly ALONG the coil's own axis (ẑ) — that is the i→i+4
// hydrogen-bond direction. So side ≈ ẑ and up = tan × side ≈ θ̂ × ẑ = r̂, i.e.
// radial, pointing out of the coil. That is the correct tape: broad face seen
// from the side, ~1.2 Å wide along the axis, 0.2 Å thick radially. Read the
// shipped vector as the surface normal instead and the tape lies in the plane
// perpendicular to the axis, like a stack of washers — visibly wrong.
//
// DO NOT "fix" this. The design doc's glossary calls the shipped vector
// "perpendicular to the ribbon surface", contradicting its own construction
// ("derived from the Cα→O direction"), and a plausible-but-false premise — that
// Cα→O points radially outward — reaches these same formulas through broken
// logic and invites someone to swap them. Carbonyls point axially. The
// ideal-coil test in protein-guide.test.ts pins this in node: it asserts `up`
// is radial, which is an independent fact about the target shape rather than a
// restatement of the algebra above.
import { GUIDE_POINTS_PER_RESIDUE, MIN_STRAND_RUN } from './protein-params';

/** A contiguous run of residues swept as one polyline. Breaks between
 *  fragments are hard: the spline never crosses one (the backbone gap spans
 *  ~15 Å against a ~3.8 Å peptide step, so bridging it would draw a strut
 *  through the middle of the structure). Mirrors the loader's shape. */
export interface GuideFragment {
  startResidue: number;
  count: number;
}

/** Parallel vec3 arrays, one entry per guide point. Sized by guideCountFor. */
export interface GuideArrays {
  positions: Float32Array;
  tangents: Float32Array;
  ups: Float32Array;
}

/** Guide points per fragment = count × 4, so the total matches the pipeline's
 *  `totalGuidePoints` (1064 = 185×4 + 81×4 for the Gq receptor) and the static
 *  companion's per-chain arrays. */
export function guideCountFor(fragments: readonly GuideFragment[]): number {
  let total = 0;
  for (const f of fragments) total += f.count * GUIDE_POINTS_PER_RESIDUE;
  return total;
}

export function allocateGuides(fragments: readonly GuideFragment[]): GuideArrays {
  const n = guideCountFor(fragments) * 3;
  return {
    positions: new Float32Array(n),
    tangents: new Float32Array(n),
    ups: new Float32Array(n),
  };
}

// ---- Small vector helpers (scalar, index-addressed — no allocation) ----

function normalizeInto(out: Float32Array, i: number): void {
  const x = out[i]!;
  const y = out[i + 1]!;
  const z = out[i + 2]!;
  const len = Math.hypot(x, y, z) || 1;
  out[i] = x / len;
  out[i + 1] = y / len;
  out[i + 2] = z / len;
}

/** Catmull-Rom on one axis, clamped-end indexing — the vector form from
 *  arbor-geometry's subdivideSpine, evaluated per axis so callers can drive it
 *  straight off an interleaved atom buffer. */
function catmull(p0: number, p1: number, p2: number, p3: number, u: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
  );
}

/** Cα of residue r within a fragment, on axis `ax`, index-clamped to the
 *  fragment. Clamping (rather than reaching into the neighbouring fragment)
 *  is what keeps the spline from crossing a backbone break. */
function ca(caO: Float32Array, start: number, count: number, r: number, ax: number): number {
  const i = start + Math.max(0, Math.min(count - 1, r));
  return caO[i * 6 + ax]!;
}

// ---- Reference normals ----

/** Per-residue raw carbonyl direction, normalize(O − Cα). */
function rawCarbonyl(caO: Float32Array, residue: number, out: Float32Array, o: number): void {
  const b = residue * 6;
  const x = caO[b + 3]! - caO[b]!;
  const y = caO[b + 4]! - caO[b + 1]!;
  const z = caO[b + 5]! - caO[b + 2]!;
  const len = Math.hypot(x, y, z) || 1;
  out[o] = x / len;
  out[o + 1] = y / len;
  out[o + 2] = z / len;
}

/**
 * Frame-0 flip-corrected reference normals for a chain the pipeline shipped
 * none for (it bakes them for the receptor only). Seeds from residue 0 and
 * walks forward, flipping any residue that disagrees with its predecessor —
 * the classic carbonyl-flip walk, run ONCE at load rather than per frame.
 *
 * Running the walk per frame instead would pop: it is sequential, so a residue
 * whose consecutive dot sits near zero can flip from thermal noise alone and
 * every residue after it inherits the flip — a cascading whole-tail 180° swing
 * rather than a local one — and nothing anchors the chain's overall sign
 * between frames. Freezing the result at frame 0 and comparing every later
 * frame against it makes each residue independent of its neighbours and of
 * time. Downstream, this output is indistinguishable from the pipeline's, so
 * writeGuides has one code path.
 */
export function deriveReferenceNormals(
  caO: Float32Array,
  fragments: readonly GuideFragment[],
  residueCount: number,
): Float32Array {
  const out = new Float32Array(residueCount * 3);
  for (const frag of fragments) {
    for (let r = 0; r < frag.count; r++) {
      const residue = frag.startResidue + r;
      const o = residue * 3;
      rawCarbonyl(caO, residue, out, o);
      if (r === 0) continue;
      const p = o - 3;
      const d = out[o]! * out[p]! + out[o + 1]! * out[p + 1]! + out[o + 2]! * out[p + 2]!;
      if (d < 0) {
        out[o] = -out[o]!;
        out[o + 1] = -out[o + 1]!;
        out[o + 2] = -out[o + 2]!;
      }
    }
  }
  return out;
}

// ---- Scratch (module-scope, resized only on residue-count change) ----

let _corrected = new Float32Array(0);

/** Per-residue carbonyl direction for THIS frame, sign-locked to the fixed
 *  frame-0 reference. One absolute comparison per residue — never against the
 *  previous residue, so there is no sequential cascade and no drift. */
function correctCarbonyls(
  caO: Float32Array,
  referenceNormals: Float32Array,
  residueCount: number,
): void {
  if (_corrected.length !== residueCount * 3) _corrected = new Float32Array(residueCount * 3);
  for (let residue = 0; residue < residueCount; residue++) {
    const o = residue * 3;
    rawCarbonyl(caO, residue, _corrected, o);
    const d =
      _corrected[o]! * referenceNormals[o]! +
      _corrected[o + 1]! * referenceNormals[o + 1]! +
      _corrected[o + 2]! * referenceNormals[o + 2]!;
    if (d < 0) {
      _corrected[o] = -_corrected[o]!;
      _corrected[o + 1] = -_corrected[o + 1]!;
      _corrected[o + 2] = -_corrected[o + 2]!;
    }
  }
}

/** Spherical interpolation between two corrected carbonyl directions.
 *  Slerp rather than lerp+renormalize because a helix rotates ~100° per
 *  residue: across only 4 sub-samples, nlerp's non-constant angular speed
 *  reads as a stutter in the tape's twist. Falls back to lerp when the arc is
 *  small (the common coil/sheet case) or antiparallel, before sin(Ω) underflows
 *  toward 0/0. */
function slerpCarbonyl(a: number, b: number, u: number, out: Float32Array): void {
  const ax = _corrected[a]!;
  const ay = _corrected[a + 1]!;
  const az = _corrected[a + 2]!;
  const bx = _corrected[b]!;
  const by = _corrected[b + 1]!;
  const bz = _corrected[b + 2]!;
  const d = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
  const omega = Math.acos(d);
  const s = Math.sin(omega);
  let wa: number;
  let wb: number;
  if (s < 1e-4) {
    wa = 1 - u;
    wb = u;
  } else {
    wa = Math.sin((1 - u) * omega) / s;
    wb = Math.sin(u * omega) / s;
  }
  out[0] = ax * wa + bx * wb;
  out[1] = ay * wa + by * wb;
  out[2] = az * wa + bz * wb;
}

const _craw = new Float32Array(3);

/**
 * Fill a fragment's guide points from this frame's atoms. Sub-samples each
 * residue 4× via Catmull-Rom over clamped controls, derives the tangent by
 * finite difference along the resulting polyline, and builds the (side, up)
 * frame per the convention documented at the top of this file.
 *
 * `u = 0` reproduces Cα(i) exactly (the Catmull-Rom identity), which the tests
 * lean on. At the tail the clamp collapses the blend to P + 0.5(P−Q)·u(1−u)²
 * — a sub-0.1 Å forward overshoot that returns to P, not a duplicated point,
 * and the end cap covers it.
 */
export function writeGuides(
  out: GuideArrays,
  caO: Float32Array,
  fragments: readonly GuideFragment[],
  referenceNormals: Float32Array,
  residueCount: number,
): void {
  correctCarbonyls(caO, referenceNormals, residueCount);

  let g = 0; // guide point index
  for (const frag of fragments) {
    const first = g;
    const points = frag.count * GUIDE_POINTS_PER_RESIDUE;

    // Positions first — the tangent is a finite difference along the sampled
    // polyline, so it needs its neighbours to exist.
    for (let r = 0; r < frag.count; r++) {
      for (let s = 0; s < GUIDE_POINTS_PER_RESIDUE; s++) {
        const u = s / GUIDE_POINTS_PER_RESIDUE;
        const o = (first + r * GUIDE_POINTS_PER_RESIDUE + s) * 3;
        for (let ax = 0; ax < 3; ax++) {
          out.positions[o + ax] = catmull(
            ca(caO, frag.startResidue, frag.count, r - 1, ax),
            ca(caO, frag.startResidue, frag.count, r, ax),
            ca(caO, frag.startResidue, frag.count, r + 1, ax),
            ca(caO, frag.startResidue, frag.count, r + 2, ax),
            u,
          );
        }
      }
    }

    for (let i = 0; i < points; i++) {
      const o = (first + i) * 3;
      // Tangent: central difference inside, one-sided at the fragment's ends.
      const aI = i > 0 ? o - 3 : o;
      const bI = i < points - 1 ? o + 3 : o;
      out.tangents[o] = out.positions[bI]! - out.positions[aI]!;
      out.tangents[o + 1] = out.positions[bI + 1]! - out.positions[aI + 1]!;
      out.tangents[o + 2] = out.positions[bI + 2]! - out.positions[aI + 2]!;
      normalizeInto(out.tangents, o);

      // Carbonyl direction at this sub-sample, slerped between the bracketing
      // residues' sign-locked directions.
      const r = Math.floor(i / GUIDE_POINTS_PER_RESIDUE);
      const s = i % GUIDE_POINTS_PER_RESIDUE;
      const resA = frag.startResidue + r;
      const resB = frag.startResidue + Math.min(frag.count - 1, r + 1);
      slerpCarbonyl(resA * 3, resB * 3, s / GUIDE_POINTS_PER_RESIDUE, _craw);

      // side = Gram-Schmidt(carbonyl, tangent) — the WIDTH axis.
      const tx = out.tangents[o]!;
      const ty = out.tangents[o + 1]!;
      const tz = out.tangents[o + 2]!;
      const along = _craw[0]! * tx + _craw[1]! * ty + _craw[2]! * tz;
      let sx = _craw[0]! - tx * along;
      let sy = _craw[1]! - ty * along;
      let sz = _craw[2]! - tz * along;
      const sLen = Math.hypot(sx, sy, sz);
      if (sLen < 1e-6) {
        // Carbonyl parallel to the backbone — geometrically impossible for a
        // real residue, but a lerped/degenerate frame could reach it. Any
        // perpendicular keeps the frame finite and orthonormal.
        const ref = Math.abs(tx) < 0.9 ? 0 : 1;
        sx = ref === 0 ? 1 - tx * tx : -tx * ty;
        sy = ref === 0 ? -ty * tx : 1 - ty * ty;
        sz = ref === 0 ? -tz * tx : -tz * ty;
        const fLen = Math.hypot(sx, sy, sz) || 1;
        sx /= fLen;
        sy /= fLen;
        sz /= fLen;
      } else {
        sx /= sLen;
        sy /= sLen;
        sz /= sLen;
      }

      // up = tangent × side — the SURFACE normal. Both are unit and mutually
      // perpendicular by construction, so the cross needs no renormalization.
      out.ups[o] = ty * sz - tz * sy;
      out.ups[o + 1] = tz * sx - tx * sz;
      out.ups[o + 2] = tx * sy - ty * sx;
    }

    g += points;
  }
}

/** The sweep rebuilds `side` from the stored frame rather than the guide
 *  carrying it — keeps the guide contract at 9 floats and identical to the
 *  static companion's baked arrays. */
export function sideFrom(
  tangents: Float32Array,
  ups: Float32Array,
  o: number,
  out: Float32Array,
): void {
  out[0] = ups[o + 1]! * tangents[o + 2]! - ups[o + 2]! * tangents[o + 1]!;
  out[1] = ups[o + 2]! * tangents[o]! - ups[o]! * tangents[o + 2]!;
  out[2] = ups[o]! * tangents[o + 1]! - ups[o + 1]! * tangents[o]!;
}

// ---- Secondary-structure runs ----

export interface StrandRun {
  start: number;
  end: number;
}

/**
 * Maximal runs of consecutive `E` within a single fragment — never across a
 * break, since a run spanning a gap would ramp an arrowhead across a strut
 * that isn't there. Runs shorter than MIN_STRAND_RUN are dropped, so callers
 * render them as coil.
 */
export function detectStrandRuns(ss: string, fragments: readonly GuideFragment[]): StrandRun[] {
  const runs: StrandRun[] = [];
  for (const frag of fragments) {
    let runStart = -1;
    for (let r = 0; r <= frag.count; r++) {
      const isE = r < frag.count && ss[frag.startResidue + r] === 'E';
      if (isE && runStart === -1) runStart = frag.startResidue + r;
      if (!isE && runStart !== -1) {
        const end = frag.startResidue + r - 1;
        if (end - runStart + 1 >= MIN_STRAND_RUN) runs.push({ start: runStart, end });
        runStart = -1;
      }
    }
  }
  return runs;
}

// ---- Placement ----

/**
 * Mean Cα of the first `residueCount` residues, in the raw box frame the
 * pipeline emits. The mount centres the scene laterally on this (rather than
 * on the whole complex, whose centroid the transducer drags off-axis) and
 * vertically on the membrane midplane.
 */
export function receptorCenter(caO: Float32Array, residueCount: number): [number, number, number] {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let r = 0; r < residueCount; r++) {
    x += caO[r * 6]!;
    y += caO[r * 6 + 1]!;
    z += caO[r * 6 + 2]!;
  }
  return [x / residueCount, y / residueCount, z / residueCount];
}
