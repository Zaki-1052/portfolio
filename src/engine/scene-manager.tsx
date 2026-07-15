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
import { SurfaceScene } from '@/scales/tissue/TissueScene';
import { CellularScene } from '@/scales/cellular/CellularScene';
import { ChromatinScene } from '@/scales/chromatin/ChromatinScene';
import { CodeScene } from '@/scales/code/CodeScene';
import { ProteinScene } from '@/scales/protein/ProteinScene';
import { ExpressionScene } from '@/scales/expression/ExpressionScene';

// The shell spans TWO bands on purpose: the whole approach journey outside it,
// then — after the plunge — its interior walls linger behind the first content
// scale's hero and recede into the fog. SceneManager dedupes by component with
// a STABLE per-component key, so crossing from one of its bands to the other
// never remounts it (a remount would re-run the RD warmup and visibly pop).
const SCENE_REGISTRY: Partial<Record<ScaleName, ComponentType>> = {
  approach: SurfaceScene,
  tissue: SurfaceScene,
  cellular: CellularScene,
  chromatin: ChromatinScene,
  protein: ProteinScene,
  code: CodeScene,
  expression: ExpressionScene,
};

const SCENE_KEYS = new Map<ComponentType, string>([
  [SurfaceScene, 'shell'],
  [CellularScene, 'arbor'],
  [ChromatinScene, 'coil'],
  [ProteinScene, 'receptor'],
  [CodeScene, 'code-window'],
  [ExpressionScene, 'signal-origin'],
]);

export function SceneManager() {
  const mounted = useDepthStore(useShallow((s) => scalesToMount(s.depth)));
  const scenes = [
    ...new Set(mounted.map((scale) => SCENE_REGISTRY[scale]).filter((c) => c !== undefined)),
  ];
  return (
    <>
      {scenes.map((Scene) => (
        <Scene key={SCENE_KEYS.get(Scene) ?? 'unkeyed'} />
      ))}
    </>
  );
}
