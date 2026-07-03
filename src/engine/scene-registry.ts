// src/engine/scene-registry.ts
// Pure lazy-mount window math (SPEC §4: a scene mounts when depth is within a
// margin of its band and unmounts otherwise, so at most 2 scenes are live at
// once during a transition). Kept free of any component/three import so the
// node test suite can exercise it; the actual scale→component table lives in
// scene-manager.tsx.
import { SCALES, SCALE_BOUNDARIES, type ScaleName } from './scale-manager';

// Margin around each canonical band within which its scene stays mounted.
// Bands are all ≥0.16 wide, so any margin ≤0.08 keeps the live set at ≤2
// (two adjacent boundaries can never both fall within the margin). 0.06 gives
// a comfortable pre-mount lead without ever reaching a third scene.
export const MOUNT_MARGIN = 0.06;

/**
 * The scales whose scenes should be mounted at this depth: any band whose
 * [start - margin, end + margin] window contains depth. Ordered by descent.
 */
export function scalesToMount(depth: number, margin: number = MOUNT_MARGIN): ScaleName[] {
  const mounted: ScaleName[] = [];
  for (let i = 0; i < SCALES.length; i++) {
    const start = SCALE_BOUNDARIES[i]!;
    const end = SCALE_BOUNDARIES[i + 1]!;
    if (depth >= start - margin && depth <= end + margin) {
      mounted.push(SCALES[i]!);
    }
  }
  return mounted;
}
