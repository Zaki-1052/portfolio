// src/engine/scene-atmosphere.tsx
// The single owner of scene-wide atmosphere: the renderer clear color and the
// one FogExp2. Both track the theme-bridge's per-tick blended colors so the 3D
// background matches the CSS warm→cool gradient exactly (one color source).
// During the breakthrough window the fog pushes toward the warm interior —
// the plunge lands INSIDE the form, where the first content scale lives.
// Mounted once inside the Canvas; nothing else may attach a scene fog.
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, type FogExp2 } from 'three';
import { getBlendedTheme } from './theme-bridge';
import { fogDensityFor } from './fog-density';
import { setSceneFog } from './scene-fog';
import { useDepthStore } from '@/stores/depth';
import { fogBlendT } from '@/scales/tissue/breakthrough';

// Deep warm-interior fog target the breakthrough drifts toward (dim amber-umber).
const INTERIOR_FOG = new Color('#31221a');

export function SceneAtmosphere() {
  const gl = useThree((s) => s.gl);
  const fogRef = useRef<FogExp2>(null);
  const clear = useRef(new Color('#282c34'));
  const fogColor = useRef(new Color('#34302b'));

  useFrame(() => {
    const depth = useDepthStore.getState().depth;
    const theme = getBlendedTheme();
    if (theme) {
      clear.current.set(theme.bg);
      gl.setClearColor(clear.current, 1);
      fogColor.current.set(theme.fogColor);
    }
    // Exterior→interior push as the aperture opens.
    const t = fogBlendT(depth);
    if (t > 0) fogColor.current.lerp(INTERIOR_FOG, t * 0.7);
    const density = fogDensityFor(depth);
    if (fogRef.current) {
      fogRef.current.color.copy(fogColor.current);
      fogRef.current.density = density;
    }
    setSceneFog(fogColor.current, density);
  });

  return <fogExp2 ref={fogRef} attach="fog" args={['#34302b', 0.014]} />;
}
