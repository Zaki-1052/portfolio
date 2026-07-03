// src/engine/scene-fog.ts
// Module-level mirror of the live scene fog, written by SceneAtmosphere every
// frame. Materials that hand-roll their fog (a custom ShaderMaterial gets no
// automatic scene fog — the shell) read this so their manual exp2 matches the
// scene exactly. Kept out of scene-atmosphere.tsx so that file exports only a
// component (react-refresh) and consumers never import a component for data.
import { Color } from 'three';

const sceneFog = { color: new Color('#34302b'), density: 0.014 };

export function getSceneFog(): { color: Color; density: number } {
  return sceneFog;
}

export function setSceneFog(color: Color, density: number): void {
  sceneFog.color.copy(color);
  sceneFog.density = density;
}
