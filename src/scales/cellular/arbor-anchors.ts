// src/scales/cellular/arbor-anchors.ts
// World-space anchor per major limb — the deepest tip of each spine's growth,
// offset by the tree's world origin. Single source of truth for the floating
// project cards, the hover markers, and the focus camera poses, so the HTML
// overlay and the 3D scene can never disagree about where a limb ends.
// Derived from the FROZEN growth defaults: if ARBOR_GROWTH_DEFAULTS or
// ARBOR_ORIGIN are re-tuned after the interaction lands, re-check these
// against the rendered tree. Pure (generator + constants), node-tested.
import {
  ARBOR_GROWTH_DEFAULTS,
  generateArbor,
  limbTipNode,
  type LimbIndex,
  type Vec3,
} from '@/utils/arbor-generator';
import { ARBOR_ORIGIN } from './arbor-params';

export function computeBranchAnchors(): Record<LimbIndex, Vec3> {
  const nodes = generateArbor(ARBOR_GROWTH_DEFAULTS);
  const anchor = (limb: LimbIndex): Vec3 => {
    const tip = limbTipNode(nodes, limb);
    return [
      tip.position[0] + ARBOR_ORIGIN[0],
      tip.position[1] + ARBOR_ORIGIN[1],
      tip.position[2] + ARBOR_ORIGIN[2],
    ];
  };
  return { 0: anchor(0), 1: anchor(1), 2: anchor(2) };
}

let cached: Record<LimbIndex, Vec3> | null = null;

/**
 * The limb anchors, computed once on first use and memoized. Lazy (not a
 * module-load `const`) so the ~600-node arbor generation stays off the initial
 * synchronous module-eval / FCP path: it runs when the cellular scene first
 * needs an anchor (a focus pose or a visible annotation), and never at all in a
 * session that stops above cellular or falls back to the no-WebGL layer.
 */
export function getBranchAnchors(): Record<LimbIndex, Vec3> {
  return (cached ??= computeBranchAnchors());
}
