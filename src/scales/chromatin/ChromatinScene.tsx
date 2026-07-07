// src/scales/chromatin/ChromatinScene.tsx
// The third band's 3D scene: the coil — a dense solenoid cluster of oblate
// beads on a threaded fiber, the two publication regions marked as softly
// glowing loci. The cluster materializes out of the band's haze and holds as
// a suspended structure with Brownian micro-drift and thread shimmer. Scene
// fog/clear color live in SceneAtmosphere.
import { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { acquireAmbientRendering } from '@/engine/render-loop';
import { DriftField, type DriftConfig } from '@/scales/tissue/atmosphere-motes';
import { smoothstep } from '@/utils/math';
import { COIL_ORIGIN } from './coil-params';
import { CoilMesh } from './CoilMesh';

// Sparse blue-tinted motes suspended around the cluster — fainter and stiller
// than the arbor's warm field (this band is the neutral equilibrium point).
// One config, one draw call: no separate atmosphere module needed yet.
const COIL_DRIFT: DriftConfig = {
  count: 340,
  rInner: 2.5,
  rOuter: 20,
  color: '#7fb4e8',
  palette: ['#61afef', '#7fb4e8', '#8d94cf', '#6fc7d8'],
  size: [0.26, 0.42],
  wobble: 0.55,
  rise: 0.05,
  riseRange: 4,
  fadeNear: [1.2, 3],
  fadeFar: [26, 48],
  opacityAt: (depth) => 0.5 * smoothstep(0.435, 0.47, depth) * (1 - smoothstep(0.55, 0.585, depth)),
};

export function ChromatinScene() {
  const reduced = useReducedMotion();

  // Idle micro-motion (bead drift, thread shimmer) only under full motion —
  // refcounted, since the arbor scene overlaps this one across the handoff.
  useEffect(() => {
    if (reduced) return undefined;
    return acquireAmbientRendering();
  }, [reduced]);

  return (
    <group>
      <CoilMesh />
      {/* Drifting motes are full-motion only, per the decorative-particles
          convention. */}
      {!reduced && (
        <group position={[COIL_ORIGIN[0], COIL_ORIGIN[1], COIL_ORIGIN[2]]}>
          <DriftField config={COIL_DRIFT} />
        </group>
      )}
    </group>
  );
}
