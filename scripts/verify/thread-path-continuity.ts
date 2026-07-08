// scripts/verify/thread-path-continuity.ts
// Diagnostic for the openT-continuity bound in coil-thread-path: find WHERE
// the max per-point move happens, then shrink the step around it — genuine
// motion scales linearly with step size; a quantization pop stays constant.
// Run: npx vite-node scripts/verify/thread-path-continuity.ts
import { COIL_GROWTH_DEFAULTS, generateCoil } from '@/utils/coil-generator';
import {
  BRIDGE_SAMPLES,
  WRAP_SAMPLES,
  sampleThreadPath,
  threadPointCount,
  type ThreadPathOpts,
} from '@/scales/chromatin/coil-thread-path';

const OPTS: ThreadPathOpts = {
  threadRadius: 0.08,
  wrapTurns: 1.75,
  beadAspect: COIL_GROWTH_DEFAULTS.beadAspect,
  linkerSag: COIL_GROWTH_DEFAULTS.linkerSag,
};

function sampleAt(region: 0 | 1, openT: number): Float32Array {
  const nodes = generateCoil(COIL_GROWTH_DEFAULTS, { region, openT });
  const out = new Float32Array(threadPointCount(nodes.length) * 3);
  const sides = new Float32Array(out.length);
  const ups = new Float32Array(out.length);
  sampleThreadPath(nodes, OPTS, out, sides, ups);
  return out;
}

function maxMove(a: Float32Array, b: Float32Array): { move: number; point: number } {
  let best = 0;
  let bestIdx = 0;
  for (let k = 0; k < a.length; k += 3) {
    const m = Math.hypot(b[k]! - a[k]!, b[k + 1]! - a[k + 1]!, b[k + 2]! - a[k + 2]!);
    if (m > best) {
      best = m;
      bestIdx = k / 3;
    }
  }
  return { move: best, point: bestIdx };
}

function locate(point: number): string {
  const perDrum = WRAP_SAMPLES + BRIDGE_SAMPLES;
  const drum = Math.floor(point / perDrum);
  const within = point - drum * perDrum;
  return within < WRAP_SAMPLES
    ? `drum ${drum} wrap sample ${within}`
    : `bridge ${drum} sample ${within - WRAP_SAMPLES}`;
}

for (const region of [0, 1] as const) {
  console.log(`\n=== region ${region}: coarse sweep (step 0.05) ===`);
  let prev = sampleAt(region, 0);
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const cur = sampleAt(region, t);
    const { move, point } = maxMove(prev, cur);
    if (move > 0.5) {
      console.log(
        `openT ${(t - 0.05).toFixed(2)} → ${t.toFixed(2)}: max ${move.toFixed(3)} at ${locate(point)}`,
      );
    }
    prev = cur;
  }
}

// Zoom: find the hottest coarse window for region 0, then halve the step
// repeatedly. Linear scaling → continuous; constant → pop.
console.log('\n=== step-scaling probe ===');
for (const region of [0, 1] as const) {
  let hotT = 0;
  let hotMove = 0;
  let prev = sampleAt(region, 0);
  for (let t = 0.01; t <= 1.0001; t += 0.01) {
    const cur = sampleAt(region, t);
    const { move } = maxMove(prev, cur);
    if (move > hotMove) {
      hotMove = move;
      hotT = t;
    }
    prev = cur;
  }
  console.log(
    `region ${region}: hottest window ends at openT=${hotT.toFixed(3)} (move ${hotMove.toFixed(3)})`,
  );
  for (const step of [0.01, 0.005, 0.0025, 0.00125, 0.000625]) {
    const a = sampleAt(region, hotT - step);
    const b = sampleAt(region, hotT);
    const { move, point } = maxMove(a, b);
    console.log(`  step ${step}: move ${move.toFixed(4)} at ${locate(point)}`);
  }
}
