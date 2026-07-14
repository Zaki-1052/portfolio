// src/scales/expression/signal-lines-geometry.ts
// The five signal lines as ONE merged tube sweep (one draw call), the
// coil-ribbon build/write split: topology and per-vertex identity are built
// once (index buffer and attribute sizes never change), positions/normals
// are rewritten in place every frame from the LIVE resolved origin — the
// origin adopts the surviving cursor and eases onto the authored anchor, so
// the whole fan rides the custody handoff for free. Each line is a
// quadratic Bézier with a gentle per-channel bow (a dead-straight radial
// fan reads machined — the organic rule) and a radius taper toward the
// terminus. sampleSignalCurve is exported so the packet points ride the
// SAME curve as the tubes.
import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage } from 'three';
import type { Vec3 } from '@/engine/camera-keyframes';
import {
  SIGNAL_CHANNEL_DIRECTIONS,
  SIGNAL_CHANNEL_IDS,
  SIGNAL_LINE_LENGTH,
  signalChannelTerminus,
  type SignalChannelId,
} from './signal-geometry';

export const LINE_SAMPLES = 24;
export const LINE_RADIAL = 4;
export const FACES_PER_LINE = (LINE_SAMPLES - 1) * LINE_RADIAL * 2;
/** Radius multiplier at the terminus — the line thins as it recedes. */
const TIP_TAPER = 0.45;

/** Per-channel terminus accents (§5.1: subtle secondary tints at the far
 *  end — accents only, never dominant; the base register stays green). */
export const CHANNEL_TINTS: Readonly<Record<SignalChannelId, string>> = Object.freeze({
  email: '#e5c07b', // amber — the line the visitor's message leaves on
  github: '#7ee787', // contribution green
  linkedin: '#61afef', // profile blue
  bluesky: '#56b6c2', // sky cyan
  resume: '#d7dae0', // paper white
});

function norm3(x: number, y: number, z: number): Vec3 {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/**
 * Per-channel bow direction: the screen-plane perpendicular of the bearing
 * (the fan spreads mostly in X/Y, camera looks down -Z), alternating side by
 * channel ordinal so neighboring lines curl apart, with a small downward
 * droop blended in — gravity, not geometry.
 */
function bowDirFor(channel: SignalChannelId): Vec3 {
  const dir = SIGNAL_CHANNEL_DIRECTIONS[channel];
  const side = channelSign(channel);
  // cross(dir, +Z) = (dir.y, -dir.x, 0) — the near-screen-plane
  // perpendicular; the -0.35 blends in the downward droop.
  return norm3(dir[1] * side, -dir[0] * side - 0.35, 0);
}

function channelSign(channel: SignalChannelId): number {
  return SIGNAL_CHANNEL_IDS.indexOf(channel) % 2 === 0 ? 1 : -1;
}

/**
 * Point at fraction `t` along a channel's bowed curve from `origin`. Writes
 * into `out` (no allocation on the per-frame path).
 */
export function sampleSignalCurve(
  origin: Vec3,
  channel: SignalChannelId,
  bowAmount: number,
  t: number,
  out: [number, number, number],
): void {
  const b = signalChannelTerminus(origin, channel);
  const bow = bowDirFor(channel);
  const lift = SIGNAL_LINE_LENGTH * bowAmount;
  const cx = (origin[0] + b[0]) / 2 + bow[0] * lift;
  const cy = (origin[1] + b[1]) / 2 + bow[1] * lift;
  const cz = (origin[2] + b[2]) / 2 + bow[2] * lift;
  const u = 1 - t;
  out[0] = u * u * origin[0] + 2 * u * t * cx + t * t * b[0];
  out[1] = u * u * origin[1] + 2 * u * t * cy + t * t * b[1];
  out[2] = u * u * origin[2] + 2 * u * t * cz + t * t * b[2];
}

/**
 * Build the merged fan: static identity attributes (aChannel, aArcT, aTint)
 * and index topology once; dynamic position/normal buffers written by
 * writeSignalLineGeometry.
 */
export function buildSignalLineGeometry(
  origin: Vec3,
  bowAmount: number,
  width: number,
): BufferGeometry {
  const lines = SIGNAL_CHANNEL_IDS.length;
  const vertsPerLine = LINE_SAMPLES * LINE_RADIAL;
  const vertCount = lines * vertsPerLine;
  const aChannel = new Float32Array(vertCount);
  const aArcT = new Float32Array(vertCount);
  const aTint = new Float32Array(vertCount * 3);
  const indices: number[] = [];
  const tint = new Color();

  let v = 0;
  for (let line = 0; line < lines; line++) {
    const base = line * vertsPerLine;
    tint.set(CHANNEL_TINTS[SIGNAL_CHANNEL_IDS[line]!]);
    for (let s = 0; s < LINE_SAMPLES; s++) {
      const t = s / (LINE_SAMPLES - 1);
      for (let ring = 0; ring < LINE_RADIAL; ring++) {
        aChannel[v] = line;
        aArcT[v] = t;
        aTint[v * 3 + 0] = tint.r;
        aTint[v * 3 + 1] = tint.g;
        aTint[v * 3 + 2] = tint.b;
        v++;
      }
    }
    for (let s = 0; s < LINE_SAMPLES - 1; s++) {
      for (let ring = 0; ring < LINE_RADIAL; ring++) {
        const r1 = (ring + 1) % LINE_RADIAL;
        const p0 = base + s * LINE_RADIAL + ring;
        const p1 = base + s * LINE_RADIAL + r1;
        const p2 = p0 + LINE_RADIAL;
        const p3 = p1 + LINE_RADIAL;
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
  geo.setAttribute('aChannel', new BufferAttribute(aChannel, 1));
  geo.setAttribute('aArcT', new BufferAttribute(aArcT, 1));
  geo.setAttribute('aTint', new BufferAttribute(aTint, 3));
  geo.setIndex(indices);
  writeSignalLineGeometry(geo, origin, bowAmount, width);
  return geo;
}

const _p: [number, number, number] = [0, 0, 0];
const _ahead: [number, number, number] = [0, 0, 0];
const _behind: [number, number, number] = [0, 0, 0];

/**
 * Rewrite tube positions/normals in place from the live origin. Cheap at
 * this scale (5 × 24 ring samples) — the breakthrough-particles
 * "always recompute, no dirty check" convention, which is what makes the
 * origin ease and dev-tuned bow/width live for free.
 */
export function writeSignalLineGeometry(
  geo: BufferGeometry,
  origin: Vec3,
  bowAmount: number,
  width: number,
): void {
  const position = geo.getAttribute('position') as BufferAttribute;
  const normal = geo.getAttribute('normal') as BufferAttribute;
  const pArr = position.array as Float32Array;
  const nArr = normal.array as Float32Array;

  let w = 0;
  for (const channel of SIGNAL_CHANNEL_IDS) {
    for (let s = 0; s < LINE_SAMPLES; s++) {
      const t = s / (LINE_SAMPLES - 1);
      sampleSignalCurve(origin, channel, bowAmount, t, _p);
      sampleSignalCurve(origin, channel, bowAmount, Math.min(1, t + 0.03), _ahead);
      sampleSignalCurve(origin, channel, bowAmount, Math.max(0, t - 0.03), _behind);
      const tangent = norm3(_ahead[0] - _behind[0], _ahead[1] - _behind[1], _ahead[2] - _behind[2]);
      const ref: Vec3 = Math.abs(tangent[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
      const side = norm3(
        tangent[1] * ref[2] - tangent[2] * ref[1],
        tangent[2] * ref[0] - tangent[0] * ref[2],
        tangent[0] * ref[1] - tangent[1] * ref[0],
      );
      const up: Vec3 = [
        tangent[1] * side[2] - tangent[2] * side[1],
        tangent[2] * side[0] - tangent[0] * side[2],
        tangent[0] * side[1] - tangent[1] * side[0],
      ];
      const radius = width * (1 - (1 - TIP_TAPER) * t);
      for (let ring = 0; ring < LINE_RADIAL; ring++) {
        const ang = (ring / LINE_RADIAL) * Math.PI * 2;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        const nx = side[0] * cos + up[0] * sin;
        const ny = side[1] * cos + up[1] * sin;
        const nz = side[2] * cos + up[2] * sin;
        pArr[w] = _p[0] + nx * radius;
        pArr[w + 1] = _p[1] + ny * radius;
        pArr[w + 2] = _p[2] + nz * radius;
        nArr[w] = nx;
        nArr[w + 1] = ny;
        nArr[w + 2] = nz;
        w += 3;
      }
    }
  }
  position.needsUpdate = true;
  normal.needsUpdate = true;
}
