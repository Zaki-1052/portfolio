// scripts/verify/unwind-tick-cost.ts
// Measure the Approach-B unwind tick after the 5.5 pass: full generator
// re-run + bead matrices + thread rewrite + knob matrices + ribbon rewrite,
// per animation tick. Gate: < 2 ms (previous baseline 0.75 ms with the old
// linker layer). Run: npx vite-node scripts/verify/unwind-tick-cost.ts
import { InstancedMesh, Matrix4, MeshBasicMaterial } from 'three';
import { COIL_GROWTH_DEFAULTS, generateCoil } from '@/utils/coil-generator';
import {
  buildBeadTemplate,
  buildKnobGeometry,
  buildRibbonGeometry,
  buildThreadGeometry,
  writeBeadInstances,
  writeKnobInstances,
  writeRibbonGeometry,
  writeThreadGeometry,
} from '@/scales/chromatin/coil-geometry';
import { COIL_DEFAULTS } from '@/scales/chromatin/coil-params';
import type { ThreadPathOpts } from '@/scales/chromatin/coil-thread-path';

const p = COIL_DEFAULTS;
const threadOpts: ThreadPathOpts = {
  strandRadius: p.strandRadius,
  helixRadius: p.helixRadius,
  twistPitch: p.twistPitch,
  linkerWidthScale: p.linkerWidthScale,
  wrapTurns: p.wrapTurns,
  beadAspect: p.beadAspect,
  linkerSag: p.linkerSag,
  rungRadius: p.rungRadius,
  rungSpacing: p.rungSpacing,
};

const baseNodes = generateCoil(COIL_GROWTH_DEFAULTS);
const template = buildBeadTemplate(baseNodes, p.beadAspect, p.beadBevel);
const threads = buildThreadGeometry(baseNodes, threadOpts);
const knobGeo = buildKnobGeometry(baseNodes);
const ribbons = buildRibbonGeometry(baseNodes, p.ribbonWidth);
const material = new MeshBasicMaterial();
const beadMesh = new InstancedMesh(template, material, baseNodes.length);
const knobMesh = new InstancedMesh(knobGeo, material, baseNodes.length * 2);
// InstancedMesh allocates identity matrices; warm both like the real mount.
beadMesh.setMatrixAt(0, new Matrix4());
knobMesh.setMatrixAt(0, new Matrix4());

function tick(openT: number): void {
  const nodes = generateCoil(COIL_GROWTH_DEFAULTS, { region: 0, openT });
  writeBeadInstances(beadMesh, nodes);
  writeThreadGeometry(threads, nodes, threadOpts);
  writeKnobInstances(knobMesh, nodes, threadOpts, p.knobSize);
  writeRibbonGeometry(ribbons, nodes, p.ribbonWidth);
}

// Warmup (JIT) then measure.
for (let i = 0; i < 60; i++) tick(i / 60);
const N = 300;
const t0 = performance.now();
for (let i = 0; i < N; i++) tick((i % 100) / 100);
const t1 = performance.now();
console.log(
  `unwind tick (55 drums, full pipeline): ${((t1 - t0) / N).toFixed(3)} ms avg over ${N} ticks`,
);
console.log(`gate: < 2 ms → ${(t1 - t0) / N < 2 ? 'PASS' : 'FAIL'}`);
