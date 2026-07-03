// src/scales/cellular/CellularVoidStub.tsx
// The minimal "other side" of the shell breakthrough — a deliberately near-empty
// void so the transition lands somewhere in Phase 3. SceneAtmosphere supplies the
// magenta-leaning fog + clear color. Phase 4 replaces this with the real second-scale
// branch scene by swapping its SCENE_REGISTRY entry in scene-manager.tsx.
export function CellularVoidStub() {
  return (
    <group>
      <ambientLight intensity={0.15} color="#d57aa5" />
    </group>
  );
}
