// src/scales/chromatin/coil-anchors.ts
// World-space anchor per publication region, in BOTH conformations: the
// compact anchor (the locus marker on the packed cluster) and the open anchor
// (the centroid of the fully unwound arc, where the card pins while focused).
// Single source of truth for the floating publication cards and the region
// focus camera poses, so the HTML overlay and the 3D scene can never disagree
// about where a region lives. Derived from the FROZEN growth defaults: if
// COIL_GROWTH_DEFAULTS or COIL_ORIGIN are re-tuned after the interaction
// lands, re-check these against the rendered cluster. Pure (generator +
// constants), node-tested.
import {
  COIL_GROWTH_DEFAULTS,
  generateCoil,
  regionBeadIndices,
  type Vec3,
} from '@/utils/coil-generator';
import type { CoilRegionIndex } from '@/stores/coil-focus';
import { COIL_ORIGIN } from './coil-params';

export interface RegionAnchors {
  /** Locus markers on the packed cluster — one per publication region.
   *  The region's CENTER BEAD, not its centroid: a compact region wraps
   *  ~0.86 turns, so its centroid collapses toward the cluster axis (inside
   *  the mass, useless as a visible marker) while the center bead sits on
   *  the rim among the glowing loci. */
  compact: [Vec3, Vec3];
  /** Centroids of the fully open (openT = 1) arcs — the card anchors and
   *  focus look-targets (center of the unwound mass). */
  open: [Vec3, Vec3];
}

export function computeRegionAnchors(): RegionAnchors {
  const nodes = generateCoil(COIL_GROWTH_DEFAULTS);
  const compactFor = (region: CoilRegionIndex): Vec3 => {
    const indices = regionBeadIndices(nodes, region);
    const mid = nodes[indices[Math.floor(indices.length / 2)]!]!.position;
    return [mid[0] + COIL_ORIGIN[0], mid[1] + COIL_ORIGIN[1], mid[2] + COIL_ORIGIN[2]];
  };
  const openFor = (region: CoilRegionIndex): Vec3 => {
    const indices = regionBeadIndices(nodes, region);
    const sum: Vec3 = [0, 0, 0];
    for (const i of indices) {
      const p = nodes[i]!.unwoundPosition;
      sum[0] += p[0];
      sum[1] += p[1];
      sum[2] += p[2];
    }
    const n = indices.length || 1;
    return [sum[0] / n + COIL_ORIGIN[0], sum[1] / n + COIL_ORIGIN[1], sum[2] / n + COIL_ORIGIN[2]];
  };
  return {
    compact: [compactFor(0), compactFor(1)],
    open: [openFor(0), openFor(1)],
  };
}

let cached: RegionAnchors | null = null;

/**
 * The region anchors, computed once on first use and memoized. Lazy (not a
 * module-load `const`) so the generator run stays off the initial synchronous
 * module-eval / FCP path: it runs when the coil band first needs an anchor
 * (a focus pose or a visible annotation), and never at all in a session that
 * stops above the band or falls back to the no-WebGL layer.
 */
export function getRegionAnchors(): RegionAnchors {
  return (cached ??= computeRegionAnchors());
}
