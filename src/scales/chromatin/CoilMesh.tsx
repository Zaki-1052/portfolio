// src/scales/chromatin/CoilMesh.tsx
// Assembles the coil's two draw calls — the merged oblate-bead cluster and
// the additive linker-thread sweep — from the pure generator, and owns their
// per-frame uniform writes (ArborMesh's pattern: depth/fog/time read
// imperatively, no re-renders). Subscribes to the dev override channel:
// growth-param edits rebuild the geometry (CPU-built, ~1ms), look edits
// re-apply uniforms. The unwind morph plumbing (uUnwindBlend/uFocusRegion)
// is built into the geometry and shaders now but stays parked at 0/-1 until
// the focus-interaction stage wires the coil focus store through this seam.
import { useEffect, useMemo, useState } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getSceneFog } from '@/engine/scene-fog';
import { useDepthStore } from '@/stores/depth';
import { generateCoil } from '@/utils/coil-generator';
import { smoothstep } from '@/utils/math';
import {
  COIL_DEFAULTS,
  COIL_ORIGIN,
  applyCoilBeadLook,
  applyCoilLinkerLook,
  type CoilParams,
} from './coil-params';
import { getCoilParamsOverride, subscribeCoilParams } from './coil-live-params';
import { buildBeadGeometry, buildLinkerGeometry } from './coil-geometry';
import { CoilBeadMaterial, CoilLinkerMaterial } from './coil-materials';

// The bead mass materializes AFTER its lights: the linker threads glimmer
// through the haze from the band's start, the cluster resolves behind them.
const BODY_REVEAL_START = 0.44;
const BODY_REVEAL_END = 0.48;

interface CoilMeshProps {
  /** World placement of the cluster group; the preview overrides it. */
  origin?: readonly [number, number, number];
}

export function CoilMesh({ origin = COIL_ORIGIN }: CoilMeshProps) {
  const reduced = useReducedMotion();

  // Dev override channel: null in production (one check at mount + a dead
  // subscription); every panel write lands here as a state change.
  const [params, setParams] = useState<CoilParams>(() => getCoilParamsOverride() ?? COIL_DEFAULTS);
  useEffect(
    () => subscribeCoilParams(() => setParams(getCoilParamsOverride() ?? COIL_DEFAULTS)),
    [],
  );

  // Rebuilt whenever params change — a look-only drag rebuilds too, but the
  // whole build is ~1ms for ~100 beads and only dev panels ever trigger it.
  const geometries = useMemo(() => {
    const nodes = generateCoil(params);
    return {
      beads: buildBeadGeometry(nodes, params.beadAspect),
      linkers: buildLinkerGeometry(nodes, params.linkerSag, params.linkerWidth),
    };
  }, [params]);
  useEffect(
    () => () => {
      geometries.beads.dispose();
      geometries.linkers.dispose();
    },
    [geometries],
  );

  const beadMaterial = useMemo(() => new CoilBeadMaterial(), []);
  const linkerMaterial = useMemo(() => {
    const m = new CoilLinkerMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending;
    return m;
  }, []);
  useEffect(
    () => () => {
      beadMaterial.dispose();
      linkerMaterial.dispose();
    },
    [beadMaterial, linkerMaterial],
  );

  // Look params are uniform-only.
  useEffect(() => {
    applyCoilBeadLook(beadMaterial, params);
    applyCoilLinkerLook(linkerMaterial, params);
    invalidate();
  }, [params, beadMaterial, linkerMaterial]);

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    const time = reduced ? 0 : state.clock.elapsedTime;
    beadMaterial.uTime = time;
    linkerMaterial.uTime = time;
    // Micro-motion freezes fully under reduced motion: drift amplitude to 0
    // (beads sit exactly on their generated positions) and the thread wave
    // stilled — a static suspended structure, not a paused animation.
    beadMaterial.uDriftAmp = reduced ? 0 : params.driftAmp;
    linkerMaterial.uWaveAmp = reduced ? 0 : params.linkerWaveAmp;

    // Lights-first reveal: the bead mass materializes after the threads are
    // already glimmering through the mist. (The preview parks depth
    // mid-band, so it always renders fully revealed.)
    beadMaterial.uOpacity = smoothstep(BODY_REVEAL_START, BODY_REVEAL_END, depth);

    // Match the hand-rolled fog to the live scene fog — SceneAtmosphere's
    // useFrame runs first (mounted earlier in the Canvas).
    const fog = getSceneFog();
    beadMaterial.uFogColor = fog.color;
    beadMaterial.uFogDensity = fog.density;
    linkerMaterial.uFogDensity = fog.density;
  });

  return (
    <group position={[origin[0], origin[1], origin[2]]}>
      <mesh geometry={geometries.beads} material={beadMaterial} />
      <mesh geometry={geometries.linkers} material={linkerMaterial} />
    </group>
  );
}
