// src/scales/protein/ProteinScene.tsx
// The fourth band's 3D scene: placeholder group proving mount/unmount wiring.
// Session 4 (Stage B.1) adds the ribbon mesh, membrane, and atmosphere.
import { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { acquireAmbientRendering } from '@/engine/render-loop';

export function ProteinScene() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return undefined;
    return acquireAmbientRendering();
  }, [reduced]);

  return <group />;
}
