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
import { getAtmosphereOverride } from './atmosphere-live-params';
import { SCALE_BOUNDARIES } from './scale-manager';
import { smoothstep } from '@/utils/math';
import { useDepthStore } from '@/stores/depth';
import { fogBlendT } from '@/scales/tissue/breakthrough';
import {
  ARBOR_FOG_TINT,
  arborFogColorBlendT,
  arborFogDensityDeltaFor,
} from '@/scales/cellular/arbor-fog';
import {
  COIL_FOG_TINT,
  coilFogColorBlendT,
  coilFogDensityDeltaFor,
} from '@/scales/chromatin/coil-fog';
import { CODE_FOG_TINT, codeFogColorBlendT, codeFogDensityDeltaFor } from '@/scales/code/code-fog';

// Deep warm-interior fog target the breakthrough drifts toward (dim amber-umber).
const INTERIOR_FOG = new Color('#31221a');
// How far the fog color pushes toward the interior target at full breakthrough.
const INTERIOR_PUSH = 0.7;

export function SceneAtmosphere() {
  const gl = useThree((s) => s.gl);
  const fogRef = useRef<FogExp2>(null);
  const clear = useRef(new Color('#282c34'));
  const fogColor = useRef(new Color('#34302b'));
  const warmOverride = useRef(new Color('#4a3f33'));
  const interiorFog = useRef(new Color('#31221a'));
  const arborTint = useRef(new Color(ARBOR_FOG_TINT));
  const coilTint = useRef(new Color(COIL_FOG_TINT));
  const codeTint = useRef(new Color(CODE_FOG_TINT));

  useFrame(() => {
    const depth = useDepthStore.getState().depth;
    const theme = getBlendedTheme();
    if (theme) {
      clear.current.set(theme.bg);
      gl.setClearColor(clear.current, 1);
      fogColor.current.set(theme.fogColor);
    }
    // Dev-only atmosphere override (atmosphere-dev-tools leva panel). Null in
    // production — one check per frame.
    const o = getAtmosphereOverride();
    if (o?.fogWarmOn) {
      // Warm-haze tuning override: applies across the approach/first-band
      // register only, easing out just inside the next band so deeper scales
      // keep their CSS-driven fog colors.
      warmOverride.current.set(o.fogWarm);
      const warmT = 1 - smoothstep(SCALE_BOUNDARIES[2], SCALE_BOUNDARIES[2] + 0.05, depth);
      fogColor.current.lerp(warmOverride.current, warmT);
    }
    // Exterior→interior push as the aperture opens.
    const t = fogBlendT(depth);
    if (t > 0) {
      if (o) interiorFog.current.set(o.fogInterior);
      fogColor.current.lerp(
        o ? interiorFog.current : INTERIOR_FOG,
        t * (o ? o.interiorPush : INTERIOR_PUSH),
      );
    }
    // Band-two handoff: the navy mist rises OVER the warm interior (lerp
    // order does the amber→navy crossfade), then fades before the next scale.
    const tint = arborFogColorBlendT(depth);
    if (tint > 0) fogColor.current.lerp(arborTint.current, tint);
    // Band-three handoff: the blue-slate haze takes over as the navy fades —
    // composing AFTER the arbor term does the navy→blue crossfade.
    const coilT = coilFogColorBlendT(depth);
    if (coilT > 0) fogColor.current.lerp(coilTint.current, coilT);
    // Band-five handoff: the terminal's green-leaned dark takes over as the
    // theme reaches the digital register — a whisper of tint over the very
    // light density, gone before the expression scale (the sparsest).
    const codeT = codeFogColorBlendT(depth);
    if (codeT > 0) fogColor.current.lerp(codeTint.current, codeT);
    const density =
      (o
        ? fogDensityFor(depth, o.densityEstablish, o.densityBase, o.densityInterior, o.densityVeil)
        : fogDensityFor(depth)) +
      arborFogDensityDeltaFor(depth) +
      coilFogDensityDeltaFor(depth) +
      codeFogDensityDeltaFor(depth);
    if (fogRef.current) {
      fogRef.current.color.copy(fogColor.current);
      fogRef.current.density = density;
    }
    setSceneFog(fogColor.current, density);
  });

  return <fogExp2 ref={fogRef} attach="fog" args={['#34302b', 0.014]} />;
}
