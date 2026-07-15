// src/scales/protein/protein-geometry.ts
// Sweeps a secondary-structure-dependent cross-section along guide points into
// one merged BufferGeometry — the ribbon. Hand-built typed arrays like
// coil-geometry / arbor-geometry: no merge utils, no three curve classes, and
// the whole chain of fragments lands in ONE draw call.
//
// Consumes only (position, tangent, up) triples, never atoms. That is the
// boundary that lets the animated structures come through protein-guide while
// the static companion feeds its pre-baked guides straight in — same sweep,
// no adapter.
//
// Fixed topology is the load-bearing invariant. Ring vertex counts, strand
// runs, the arrow schedule, and every static attribute are decided at build
// time from a secondary-structure string that is frozen at frame 0; the
// per-tick write only ever moves positions and normals. That is what makes the
// animation a buffer rewrite rather than a rebuild, and why the cross-section
// is a superellipse whose morph is a lerp of three scalars (see RibbonProfile).
import { BufferAttribute, BufferGeometry, DynamicDrawUsage } from 'three';
import { lerp } from '@/utils/math';
import {
  COIL_PROFILE,
  HELIX_PROFILE,
  GUIDE_POINTS_PER_RESIDUE,
  PROFILE_FLOOR,
  RIBBON_RADIAL_SEGMENTS as RADIAL,
  RMSF_FLOOR,
  SHEET_PROFILE_BODY,
  SHEET_PROFILE_PEAK,
  SHEET_PROFILE_TIP,
  SS_TRANSITION_GUIDE_POINTS,
  type RibbonProfile,
} from './protein-params';
import {
  detectStrandRuns,
  guideCountFor,
  sideFrom,
  type GuideArrays,
  type GuideFragment,
} from './protein-guide';

/** aSSType encoding — the fragment shader varies specular by structure. */
export const SS_HELIX = 0;
export const SS_SHEET = 1;
export const SS_COIL = 2;

/** Ring angles are fixed, so their sin/cos are too. */
const COS = new Float32Array(RADIAL);
const SIN = new Float32Array(RADIAL);
for (let k = 0; k < RADIAL; k++) {
  const th = (k / RADIAL) * Math.PI * 2;
  COS[k] = Math.cos(th);
  SIN[k] = Math.sin(th);
}

/** Superellipse offset at ring k, in the (side, up) plane. Multiplies by a/b,
 *  so a literal 0 is safe and gives the arrow tip its point. */
function profileOffset(p: RibbonProfile, k: number, out: Float32Array): void {
  const e = 2 / p.n;
  const c = COS[k]!;
  const s = SIN[k]!;
  out[0] = p.a * Math.sign(c) * Math.abs(c) ** e;
  out[1] = p.b * Math.sign(s) * Math.abs(s) ** e;
}

/** Superellipse outward normal at ring k, in the (side, up) plane.
 *  The 1/a and 1/b terms are the only place Infinity/NaN can enter: at the
 *  arrow tip a = 0 gives 1/0 = Infinity, and Infinity · 0^(n-1) = NaN wherever
 *  cos or sin is exactly 0. Hence the floor — applied HERE only, never to the
 *  position, whose zero width is the intended geometry. */
function profileNormal(p: RibbonProfile, k: number, out: Float32Array): void {
  const aEff = Math.max(p.a, PROFILE_FLOOR);
  const bEff = Math.max(p.b, PROFILE_FLOOR);
  const e = p.n - 1;
  const c = COS[k]!;
  const s = SIN[k]!;
  const nx = (Math.sign(c) * Math.abs(c) ** e) / aEff;
  const ny = (Math.sign(s) * Math.abs(s) ** e) / bEff;
  const len = Math.hypot(nx, ny) || 1;
  out[0] = nx / len;
  out[1] = ny / len;
}

function lerpProfile(a: RibbonProfile, b: RibbonProfile, t: number, out: RibbonProfile): void {
  out.a = lerp(a.a, b.a, t);
  out.b = lerp(a.b, b.b, t);
  out.n = lerp(a.n, b.n, t);
}

function ssProfileFor(code: number): RibbonProfile {
  if (code === SS_HELIX) return HELIX_PROFILE;
  if (code === SS_SHEET) return SHEET_PROFILE_BODY;
  return COIL_PROFILE;
}

/**
 * Per-guide-point profile schedule + SS code, built once from the frozen
 * secondary-structure string. This is where the arrow taper and the SS
 * transition morph are resolved; the sweep just reads the result.
 *
 * Effective SS first: runs of `E` shorter than the minimum are retyped to coil
 * (detectStrandRuns drops them), because the ramp is undefined for a 1–2
 * residue "strand" and DSSP emits plenty of those.
 */
function buildSchedule(
  ss: string,
  fragments: readonly GuideFragment[],
  residueCount: number,
): { profiles: RibbonProfile[]; ssCodes: Float32Array } {
  // Effective per-residue SS. Everything that isn't a helix starts as coil;
  // only strand runs that survive the minimum-length rule are promoted back to
  // sheet, so a stray 1–2 residue `E` never reaches the arrow schedule.
  const eff = new Uint8Array(residueCount);
  for (let r = 0; r < residueCount; r++) eff[r] = ss[r] === 'H' ? SS_HELIX : SS_COIL;

  // A strand's final residue carries the arrowhead.
  const arrowResidue = new Uint8Array(residueCount);
  for (const run of detectStrandRuns(ss, fragments)) {
    for (let r = run.start; r <= run.end; r++) eff[r] = SS_SHEET;
    arrowResidue[run.end] = 1;
  }

  const total = guideCountFor(fragments);
  const profiles: RibbonProfile[] = new Array(total);
  const ssCodes = new Float32Array(total);

  let g = 0;
  for (const frag of fragments) {
    for (let r = 0; r < frag.count; r++) {
      const residue = frag.startResidue + r;
      const code = eff[residue]!;
      const here = ssProfileFor(code);
      // The neighbour inside this fragment — a break is never blended across.
      const nextResidue = frag.startResidue + Math.min(frag.count - 1, r + 1);
      const nextCode = eff[nextResidue]!;

      for (let s = 0; s < GUIDE_POINTS_PER_RESIDUE; s++) {
        const p: RibbonProfile = { a: here.a, b: here.b, n: here.n };

        if (arrowResidue[residue] === 1) {
          // Arrowhead across this residue's own sub-samples: body at u=0 (a
          // seamless join with the strand behind), peak at u=0.5, tip at
          // u=0.75 — the last sub-sample. The zero-width tip is followed
          // directly by whatever comes next (the next residue's first sample,
          // or the end cap), so the ribbon points and then the loop begins,
          // which is the cartoon idiom. No extra guide point is invented.
          const u = s / GUIDE_POINTS_PER_RESIDUE;
          if (u <= 0.5) lerpProfile(SHEET_PROFILE_BODY, SHEET_PROFILE_PEAK, u / 0.5, p);
          else lerpProfile(SHEET_PROFILE_PEAK, SHEET_PROFILE_TIP, (u - 0.5) / 0.25, p);
        } else if (nextCode !== code) {
          // SS transition: morph into the neighbour's profile across the last
          // SS_TRANSITION_GUIDE_POINTS sub-samples of this residue.
          const from = GUIDE_POINTS_PER_RESIDUE - SS_TRANSITION_GUIDE_POINTS;
          if (s >= from) {
            const t = (s - from + 1) / SS_TRANSITION_GUIDE_POINTS;
            lerpProfile(here, ssProfileFor(nextCode), t, p);
          }
        }

        profiles[g] = p;
        ssCodes[g] = code;
        g++;
      }
    }
  }
  return { profiles, ssCodes };
}

/** Vertices = one ring per guide point, plus one apex per fragment end cap. */
export function ribbonVertexCount(fragments: readonly GuideFragment[]): number {
  return guideCountFor(fragments) * RADIAL + fragments.length * 2;
}

const _off = new Float32Array(2);
const _nrm = new Float32Array(2);
const _side = new Float32Array(3);

/**
 * Build the ribbon for a set of fragments — one merged geometry, one draw
 * call. Fragments are swept as independent polylines whose rings are never
 * strip-connected to each other (a break is a break), exactly as
 * arbor-geometry merges its spines.
 *
 * `chainIndex` rides every vertex so the shader can dim one subunit against
 * another without a second draw call. `rmsf` is per-residue and normalised
 * here into aRmsf.
 */
export function buildRibbonGeometry(
  guides: GuideArrays,
  ss: string,
  fragments: readonly GuideFragment[],
  rmsf: Float32Array,
  residueCount: number,
  chainIndex: number,
): BufferGeometry {
  const { profiles, ssCodes } = buildSchedule(ss, fragments, residueCount);
  const totalVerts = ribbonVertexCount(fragments);

  const aResidueIndex = new Float32Array(totalVerts);
  const aSSType = new Float32Array(totalVerts);
  const aChainIndex = new Float32Array(totalVerts);
  const aRmsf = new Float32Array(totalVerts);
  const aShade = new Float32Array(totalVerts);
  const indices: number[] = [];

  let g = 0;
  let v = 0;
  for (const frag of fragments) {
    const points = frag.count * GUIDE_POINTS_PER_RESIDUE;
    const ringBase = v;

    for (let i = 0; i < points; i++) {
      const residue = frag.startResidue + Math.floor(i / GUIDE_POINTS_PER_RESIDUE);
      const p = profiles[g + i]!;
      // aShade: 1 on the thin rim, 0 across the broad face, and 0 everywhere
      // on a round tube (a == b) which has no rim. Static — it depends only on
      // the ring index and the profile, both frozen at build.
      const flatness = p.a > 1e-6 ? 1 - Math.min(1, p.b / p.a) : 0;
      // Raw Å, normalised in the shader against uRmsfFloor/uRmsfCeil. Keeping
      // the range a uniform rather than baking it here makes the dev panel's
      // flexibility slider a uniform write instead of a geometry rebuild.
      const rRaw = rmsf[residue] ?? RMSF_FLOOR;
      for (let k = 0; k < RADIAL; k++) {
        aResidueIndex[v] = residue;
        aSSType[v] = ssCodes[g + i]!;
        aChainIndex[v] = chainIndex;
        aRmsf[v] = rRaw;
        aShade[v] = Math.abs(COS[k]!) * flatness;
        v++;
      }
    }

    // Quad strips between consecutive rings — within this fragment only.
    for (let i = 0; i < points - 1; i++) {
      const a0 = ringBase + i * RADIAL;
      const b0 = a0 + RADIAL;
      for (let k = 0; k < RADIAL; k++) {
        const k1 = (k + 1) % RADIAL;
        indices.push(a0 + k, b0 + k, a0 + k1, a0 + k1, b0 + k, b0 + k1);
      }
    }

    // End caps, both ends. An uncapped ring reads as an open pipe mouth the
    // moment the camera sees down the axis — and a backbone break puts two of
    // those in the middle of the structure.
    const capApex = (ringIndex: number, sign: number): void => {
      const apex = v;
      const first = frag.startResidue + Math.floor(ringIndex / GUIDE_POINTS_PER_RESIDUE);
      aResidueIndex[apex] = first;
      aSSType[apex] = ssCodes[g + ringIndex]!;
      aChainIndex[apex] = chainIndex;
      aRmsf[apex] = rmsf[first] ?? RMSF_FLOOR;
      aShade[apex] = 1;
      v++;
      const ring = ringBase + ringIndex * RADIAL;
      for (let k = 0; k < RADIAL; k++) {
        const k1 = (k + 1) % RADIAL;
        if (sign > 0) indices.push(ring + k, apex, ring + k1);
        else indices.push(ring + k, ring + k1, apex);
      }
    };
    capApex(points - 1, 1);
    capApex(0, -1);

    g += points;
  }

  const geo = new BufferGeometry();
  const position = new BufferAttribute(new Float32Array(totalVerts * 3), 3);
  const normal = new BufferAttribute(new Float32Array(totalVerts * 3), 3);
  position.setUsage(DynamicDrawUsage);
  normal.setUsage(DynamicDrawUsage);
  geo.setAttribute('position', position);
  geo.setAttribute('normal', normal);
  geo.setAttribute('aResidueIndex', new BufferAttribute(aResidueIndex, 1));
  geo.setAttribute('aSSType', new BufferAttribute(aSSType, 1));
  geo.setAttribute('aChainIndex', new BufferAttribute(aChainIndex, 1));
  geo.setAttribute('aRmsf', new BufferAttribute(aRmsf, 1));
  geo.setAttribute('aShade', new BufferAttribute(aShade, 1));
  geo.setIndex(indices);
  // The profile schedule is frame-invariant, so the write path reads it back
  // rather than rebuilding it every tick.
  geo.userData.profiles = profiles;
  // No bounding sphere is maintained — the mesh renders with culling disabled.
  writeRibbonGeometry(geo, guides, fragments);
  return geo;
}

/**
 * Rewrite positions/normals in place from a guide state. Vertex count, index
 * buffer, and every static attribute are untouched — the trajectory moves the
 * surface, it never re-tessellates it.
 */
export function writeRibbonGeometry(
  geo: BufferGeometry,
  guides: GuideArrays,
  fragments: readonly GuideFragment[],
): void {
  const profiles = geo.userData.profiles as RibbonProfile[];
  const position = geo.getAttribute('position') as BufferAttribute;
  const normal = geo.getAttribute('normal') as BufferAttribute;
  const pArr = position.array as Float32Array;
  const nArr = normal.array as Float32Array;

  let g = 0;
  let v = 0;
  for (const frag of fragments) {
    const points = frag.count * GUIDE_POINTS_PER_RESIDUE;

    for (let i = 0; i < points; i++) {
      const o = (g + i) * 3;
      const p = profiles[g + i]!;
      sideFrom(guides.tangents, guides.ups, o, _side);
      const px = guides.positions[o]!;
      const py = guides.positions[o + 1]!;
      const pz = guides.positions[o + 2]!;
      const ux = guides.ups[o]!;
      const uy = guides.ups[o + 1]!;
      const uz = guides.ups[o + 2]!;

      for (let k = 0; k < RADIAL; k++) {
        profileOffset(p, k, _off);
        profileNormal(p, k, _nrm);
        const w = v * 3;
        pArr[w] = px + _side[0]! * _off[0]! + ux * _off[1]!;
        pArr[w + 1] = py + _side[1]! * _off[0]! + uy * _off[1]!;
        pArr[w + 2] = pz + _side[2]! * _off[0]! + uz * _off[1]!;
        // Analytic: the profile normal is unit in the (side, up) basis and
        // both are unit and orthogonal, so the lift is unit too — no
        // renormalization, and never computeVertexNormals.
        nArr[w] = _side[0]! * _nrm[0]! + ux * _nrm[1]!;
        nArr[w + 1] = _side[1]! * _nrm[0]! + uy * _nrm[1]!;
        nArr[w + 2] = _side[2]! * _nrm[0]! + uz * _nrm[1]!;
        v++;
      }
    }

    // Cap apexes: one guide-tangent-length past each end ring, normal along
    // the tangent, so the cap domes rather than creasing.
    const capAt = (ringIndex: number, sign: number): void => {
      const o = (g + ringIndex) * 3;
      const p = profiles[g + ringIndex]!;
      const reach = Math.max(p.b, PROFILE_FLOOR) * sign;
      const w = v * 3;
      pArr[w] = guides.positions[o]! + guides.tangents[o]! * reach;
      pArr[w + 1] = guides.positions[o + 1]! + guides.tangents[o + 1]! * reach;
      pArr[w + 2] = guides.positions[o + 2]! + guides.tangents[o + 2]! * reach;
      nArr[w] = guides.tangents[o]! * sign;
      nArr[w + 1] = guides.tangents[o + 1]! * sign;
      nArr[w + 2] = guides.tangents[o + 2]! * sign;
      v++;
    };
    capAt(points - 1, 1);
    capAt(0, -1);

    g += points;
  }

  position.needsUpdate = true;
  normal.needsUpdate = true;
}
