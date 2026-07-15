// src/scales/protein/ProteinScene.tsx
// The fourth band's 3D scene root. Holds the ribbon mesh; the membrane, the
// ligand, and the drift motes join it as the band fills out.
// Ambient rendering is acquired here rather than in the mesh: the structure
// breathes when the scroll pauses, which only happens if the loop keeps
// ticking. Under reduced motion nothing moves, so nothing needs to tick.
import { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { acquireAmbientRendering } from '@/engine/render-loop';
import { ProteinMesh } from './ProteinMesh';

export function ProteinScene() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return undefined;
    return acquireAmbientRendering();
  }, [reduced]);

  return (
    <group>
      <ProteinMesh />
    </group>
  );
}
