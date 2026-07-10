// src/scales/chromatin/ChromatinScene.tsx
// The third band's 3D scene: the coil — a rising spiral of wound drums
// suspended in the band's water medium, the two publication regions marked
// as softly glowing loci. The cluster materializes out of the band's haze
// and holds as a suspended structure with Brownian micro-drift, the shared
// current sway, and the cord's traveling light. The medium itself (silt,
// bokeh, bubbles, veils) lives in CoilAtmosphere; scene fog/clear color
// live in SceneAtmosphere.
import { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { acquireAmbientRendering } from '@/engine/render-loop';
import { CoilAtmosphere } from './coil-atmosphere';
import { CoilMesh } from './CoilMesh';

export function ChromatinScene() {
  const reduced = useReducedMotion();

  // Idle micro-motion (bead drift, thread pulse, water sway) only under
  // full motion — refcounted, since the arbor scene overlaps this one
  // across the handoff.
  useEffect(() => {
    if (reduced) return undefined;
    return acquireAmbientRendering();
  }, [reduced]);

  return (
    <group>
      <CoilMesh />
      <CoilAtmosphere />
    </group>
  );
}
