// src/engine/scene-atmosphere.tsx
// The single owner of scene-wide atmosphere: the renderer clear color and the
// one FogExp2. Both track the theme-bridge's per-tick blended colors so the 3D
// background matches the CSS warm→cool gradient exactly (one color source).
// During the breakthrough window the fog pushes toward the cellular magenta.
// Mounted once inside the Canvas; nothing else may attach a scene fog.
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, type FogExp2 } from 'three';
import { getBlendedTheme } from './theme-bridge';
import { useDepthStore } from '@/stores/depth';
import { fogBlendT } from '@/scales/tissue/breakthrough';

// Cellular-register fog target the breakthrough drifts toward (rose/magenta).
const MAGENTA_FOG = new Color('#3a2530');

export function SceneAtmosphere() {
  const gl = useThree((s) => s.gl);
  const fogRef = useRef<FogExp2>(null);
  const clear = useRef(new Color('#282c34'));
  const fogColor = useRef(new Color('#34302b'));

  useFrame(() => {
    const theme = getBlendedTheme();
    if (theme) {
      clear.current.set(theme.bg);
      gl.setClearColor(clear.current, 1);
      fogColor.current.set(theme.fogColor);
    }
    // Warm→magenta push as the aperture opens.
    const t = fogBlendT(useDepthStore.getState().depth);
    if (t > 0) fogColor.current.lerp(MAGENTA_FOG, t * 0.7);
    fogRef.current?.color.copy(fogColor.current);
  });

  return <fogExp2 ref={fogRef} attach="fog" args={['#34302b', 0.014]} />;
}
