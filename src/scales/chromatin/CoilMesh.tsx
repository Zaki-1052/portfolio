// src/scales/chromatin/CoilMesh.tsx
// Assembles the coil's two draw calls — the instanced oblate-bead cluster and
// the additive linker-thread sweep — and owns the Approach-B unwind engine:
// focusing a publication region tweens the focus store's unwindBlend, and
// every tick of that tween RE-RUNS the pure generator at the new openT and
// pushes the result through the geometry writers (instance matrices + linker
// rewrite-in-place). Intermediate states are genuine re-coiled conformations;
// idle frames skip the CPU path entirely via the write guard. Per-frame
// uniform writes follow ArborMesh's pattern (depth/fog/time read
// imperatively, no re-renders); growth-param edits from the dev override
// channel rebuild the template/linker buffers.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { invalidate, useFrame, type ThreeEvent } from '@react-three/fiber';
import { AdditiveBlending, DynamicDrawUsage, type InstancedMesh } from 'three';
import { gsap } from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getSceneFog } from '@/engine/scene-fog';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import {
  shouldReleaseCoilFocus,
  useCoilFocusStore,
  type CoilRegionIndex,
} from '@/stores/coil-focus';
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
import {
  buildBeadTemplate,
  buildLinkerGeometry,
  writeBeadInstances,
  writeLinkerGeometry,
} from './coil-geometry';
import { CoilBeadMaterial, CoilLinkerMaterial } from './coil-materials';

// The bead mass materializes AFTER its lights: the linker threads glimmer
// through the haze from the band's start, the cluster resolves behind them.
// The threads get their own authored envelope (they'd otherwise be visible
// from the scene mount at 0.37, deep inside the previous band).
const LIGHTS_REVEAL_START = 0.435;
const LIGHTS_REVEAL_END = 0.455;
const BODY_REVEAL_START = 0.44;
const BODY_REVEAL_END = 0.48;

// Unwind pacing per the design spec; the switch-release is quicker so
// re-targeting a different region doesn't feel like two full animations.
const UNWIND_MS = 500;
const SWITCH_RELEASE_MS = 250;

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

  // Rebuilt whenever params change — CPU-built, ~1ms for ~100 beads, and only
  // dev panels ever trigger it. baseNodes is the compact conformation the
  // unwind engine falls back to at blend 0.
  const built = useMemo(() => {
    const baseNodes = generateCoil(params);
    return {
      baseNodes,
      template: buildBeadTemplate(baseNodes, params.beadAspect),
      linkers: buildLinkerGeometry(baseNodes, params.linkerSag, params.linkerWidth),
    };
  }, [params]);
  useEffect(
    () => () => {
      built.template.dispose();
      built.linkers.dispose();
    },
    [built],
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

  // --- Unwind engine state ---
  // Both meshes render with culling disabled: instance matrices (and the
  // linker buffer) move per tick during the unwind, so any build-time
  // bounding sphere would go stale; the band's mount window already gates
  // visibility and the cluster fills the frame whenever mounted.
  const meshRef = useRef<InstancedMesh>(null);
  // The region whose shape is currently DISPLAYED — holds through the release
  // tween after focusedRegion has already gone null, so the closing geometry
  // and dim ease out on the shape they opened on.
  const displayRegion = useRef<CoilRegionIndex | null>(useCoilFocusStore.getState().focusedRegion);
  // Last written (regionKey, blend) — the guard that keeps idle frames free
  // of CPU work. blend -1 forces the first write.
  const writeState = useRef({ region: -1, blend: -1 });
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  /** Re-generate the node state for the current focus and push it to the
   *  GPU — the Approach-B tick. No-ops when nothing changed. */
  const syncGeometry = (): void => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const f = useCoilFocusStore.getState();
    const region = displayRegion.current;
    const regionKey = f.unwindBlend > 1e-4 && region !== null ? region : -1;
    const blendKey = regionKey === -1 ? 0 : f.unwindBlend;
    if (writeState.current.region === regionKey && writeState.current.blend === blendKey) return;
    const nodes =
      regionKey === -1
        ? built.baseNodes
        : generateCoil(params, { region: regionKey as CoilRegionIndex, openT: f.unwindBlend });
    writeBeadInstances(mesh, nodes);
    writeLinkerGeometry(built.linkers, nodes, params.linkerSag, params.linkerWidth);
    writeState.current = { region: regionKey, blend: blendKey };
  };

  // Initial (and post-rebuild) instance write — layout effect so the first
  // painted frame already has real matrices, never the constructor identity.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    writeState.current = { region: -1, blend: -1 };
    syncGeometry();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild-driven
  }, [built]);

  // Tween owner: focusedRegion changes drive unwindBlend through GSAP
  // (store's blend is tween-owned, camera-controller precedent). Reduced
  // motion snaps instantly — read from the motion store INSIDE the callback,
  // not the hook closure, so this subscription mounts exactly once and a
  // focus change can never land on a stale-closure subscription mid
  // re-subscribe (that window killed the tween and froze the blend).
  // Switching regions while open closes the old shape first — swapping the
  // displayed region at full blend would pop.
  useEffect(() => {
    const store = useCoilFocusStore;
    const kill = (): void => {
      tweenRef.current?.kill();
      tweenRef.current = null;
    };
    const startTween = (target: number, ms: number, onComplete?: () => void): void => {
      const proxy = { t: store.getState().unwindBlend };
      tweenRef.current = gsap.to(proxy, {
        t: target,
        duration: ms / 1000,
        ease: 'power2.inOut',
        onUpdate: () => {
          store.getState().setUnwindBlend(proxy.t);
          invalidate();
        },
        onComplete: () => {
          tweenRef.current = null;
          onComplete?.();
        },
      });
    };
    const unsub = store.subscribe(
      (s) => s.focusedRegion,
      (region, prevRegion) => {
        kill();
        if (useMotionStore.getState().reduced) {
          if (region !== null) displayRegion.current = region;
          store.getState().setUnwindBlend(region !== null ? 1 : 0);
          invalidate();
          return;
        }
        const blend = store.getState().unwindBlend;
        if (region !== null && prevRegion !== null && blend > 1e-3) {
          startTween(0, SWITCH_RELEASE_MS, () => {
            displayRegion.current = region;
            startTween(1, UNWIND_MS);
          });
        } else if (region !== null) {
          displayRegion.current = region;
          startTween(1, UNWIND_MS);
        } else {
          startTween(0, UNWIND_MS);
        }
      },
    );
    return () => {
      unsub();
      kill();
    };
  }, []);

  // Region beads are the click targets (instance order == node index order).
  // The annotation layer becomes the primary trigger in a later stage; on the
  // live site the HTML content layer may cover the canvas, so this direct
  // path is mainly exercised in the isolated preview until then.
  const handleClick = (e: ThreeEvent<MouseEvent>): void => {
    const id = e.instanceId;
    if (id === undefined) return;
    const region = built.baseNodes[id]?.region ?? -1;
    if (region === -1) return;
    e.stopPropagation();
    const store = useCoilFocusStore.getState();
    const depth = useDepthStore.getState().depth;
    store.setFocusedRegion(store.focusedRegion === region ? null : region, depth);
  };
  const handlePointerMove = (e: ThreeEvent<PointerEvent>): void => {
    const id = e.instanceId;
    const region = id !== undefined ? (built.baseNodes[id]?.region ?? -1) : -1;
    document.body.style.cursor = region !== -1 ? 'pointer' : '';
  };
  const handlePointerOut = (): void => {
    document.body.style.cursor = '';
  };
  useEffect(
    () => () => {
      document.body.style.cursor = '';
    },
    [],
  );

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;

    // Scroll-away releases an active focus — click-focus never fights the
    // scrub. The subscription above starts the release tween synchronously.
    const focus = useCoilFocusStore.getState();
    if (focus.focusedRegion !== null && shouldReleaseCoilFocus(depth, focus.focusDepth)) {
      focus.setFocusedRegion(null, depth);
    }

    // Approach-B tick: rebuild geometry only when the unwind state moved.
    syncGeometry();

    const time = reduced ? 0 : state.clock.elapsedTime;
    beadMaterial.uTime = time;
    linkerMaterial.uTime = time;
    // Micro-motion freezes fully under reduced motion: drift amplitude to 0
    // (beads sit exactly on their generated positions) and the thread wave
    // stilled — a static suspended structure, not a paused animation.
    beadMaterial.uDriftAmp = reduced ? 0 : params.driftAmp;
    linkerMaterial.uWaveAmp = reduced ? 0 : params.linkerWaveAmp;

    // Focus dim rides the unwind blend, on the displayed region (which
    // outlives focusedRegion through the release tween).
    const blend = useCoilFocusStore.getState().unwindBlend;
    const dimRegion = blend > 1e-4 && displayRegion.current !== null ? displayRegion.current : -1;
    beadMaterial.uFocusRegion = dimRegion;
    beadMaterial.uFocusDim = blend;
    linkerMaterial.uFocusRegion = dimRegion;
    linkerMaterial.uFocusDim = blend;

    // Lights-first reveal: the bead mass materializes after the threads are
    // already glimmering through the mist. (The preview parks depth
    // mid-band, so it always renders fully revealed.)
    linkerMaterial.uOpacity = smoothstep(LIGHTS_REVEAL_START, LIGHTS_REVEAL_END, depth);
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
      <instancedMesh
        ref={meshRef}
        args={[built.template, beadMaterial, built.baseNodes.length]}
        frustumCulled={false}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      />
      <mesh geometry={built.linkers} material={linkerMaterial} frustumCulled={false} />
    </group>
  );
}
