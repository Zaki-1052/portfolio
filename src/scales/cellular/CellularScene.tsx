// src/scales/cellular/CellularScene.tsx
// The second scale's 3D scene: the arbor — a branching tree whose three major
// limbs index the three project groups. Solid sculpted limbs dissolve into an
// emissive strand periphery (the band's rose register); the scene resolves
// out of the interior haze after the plunge and stays as a dimmed backdrop
// behind the HTML content. Scene fog/clear color live in SceneAtmosphere.
import { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { acquireAmbientRendering } from '@/engine/render-loop';
import { ArborMesh } from './ArborMesh';
import { ArborDrift, ArborNeighbors } from './arbor-atmosphere';

export function CellularScene() {
  const reduced = useReducedMotion();

  // Idle breathing (canopy sway, signal pulses) only under full motion —
  // refcounted, since the shell scene overlaps this one across the handoff.
  useEffect(() => {
    if (reduced) return undefined;
    return acquireAmbientRendering();
  }, [reduced]);

  return (
    <group>
      <ArborMesh />
      {/* Distant network presences: static geometry, kept under reduced
          motion (their uTime freezes); the drifting motes are full-motion
          only, per the decorative-particles convention. */}
      <ArborNeighbors />
      {!reduced && <ArborDrift />}
    </group>
  );
}
