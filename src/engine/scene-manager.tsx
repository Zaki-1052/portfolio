// src/engine/scene-manager.tsx
// Mounts the scale scenes that scalesToMount() says are live at the current
// depth (SPEC §4: ≤2 at once). The scale→component table lives here (not in the
// node-tested scene-registry.ts) so that pure module never imports three. Adding
// a scale in Phase 4/5 is a one-line SCENE_REGISTRY entry — this component and
// the mount math never change. useShallow re-renders only when the mounted set
// changes, not every scroll tick.
import { type ComponentType } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDepthStore } from '@/stores/depth';
import { type ScaleName } from '@/engine/scale-manager';
import { scalesToMount } from '@/engine/scene-registry';
import { TissueScene } from '@/scales/tissue/TissueScene';
import { CellularVoidStub } from '@/scales/cellular/CellularVoidStub';

const SCENE_REGISTRY: Partial<Record<ScaleName, ComponentType>> = {
  tissue: TissueScene,
  cellular: CellularVoidStub,
};

export function SceneManager() {
  const mounted = useDepthStore(useShallow((s) => scalesToMount(s.depth)));
  return (
    <>
      {mounted.map((scale) => {
        const Scene = SCENE_REGISTRY[scale];
        return Scene ? <Scene key={scale} /> : null;
      })}
    </>
  );
}
