// src/scales/chromatin/CoilMesh.tsx
// Assembles the coil's draw calls — the instanced drum cluster, the wound
// amber thread sweep, the instanced cinch knobs, and the focus-gated loop
// ribbons — and owns the Approach-B unwind engine: focusing a publication
// region tweens the focus store's unwindBlend, and every tick of that tween
// RE-RUNS the pure generator at the new openT and pushes the result through
// the geometry writers (bead + knob instance matrices, thread + ribbon
// rewrite-in-place). Intermediate states are genuine re-coiled
// conformations; idle frames skip the CPU path entirely via the write
// guard. Per-frame uniform writes follow ArborMesh's pattern (depth/fog/
// time read imperatively, no re-renders); growth-param edits from the dev
// override channel rebuild the template/tube buffers.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { invalidate, useFrame, type ThreeEvent } from '@react-three/fiber';
import { AdditiveBlending, DynamicDrawUsage, type InstancedMesh, type Mesh } from 'three';
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
  applyCoilKnobLook,
  applyCoilRibbonLook,
  applyCoilThreadLook,
  type CoilParams,
} from './coil-params';
import { getCoilParamsOverride, subscribeCoilParams } from './coil-live-params';
import { COIL_CURRENT_DEFAULTS, currentDir } from './coil-current';
import { COIL_WATER_DEFAULTS, getCoilWaterOverride } from './coil-water-params';
import {
  buildBeadTemplate,
  buildKnobGeometry,
  buildRibbonGeometry,
  buildThreadGeometry,
  writeBeadInstances,
  writeKnobInstances,
  writeRibbonGeometry,
  writeThreadGeometry,
} from './coil-geometry';
import type { ThreadPathOpts } from './coil-thread-path';
import {
  CoilBeadMaterial,
  CoilKnobMaterial,
  CoilRibbonMaterial,
  CoilThreadMaterial,
} from './coil-materials';

// The bead mass materializes AFTER its lights: the cord's glow glimmers
// out of the hub-dive's fill beat first, the cluster resolves behind it.
// 5.6 retime: both envelopes start AFTER the hub-shell crossing (≈ 0.458)
// so the coil never ghosts into a frame the tree still owns — the two
// scenes are never simultaneous subjects. (The threads' own envelope also
// keeps them hidden from the scene mount at 0.37, deep inside the previous
// band.)
const LIGHTS_REVEAL_START = 0.462;
const LIGHTS_REVEAL_END = 0.48;
const BODY_REVEAL_START = 0.468;
const BODY_REVEAL_END = 0.5;

// Unwind pacing per the design spec; the switch-release is quicker so
// re-targeting a different region doesn't feel like two full animations.
const UNWIND_MS = 500;
const SWITCH_RELEASE_MS = 250;

interface CoilMeshProps {
  /** World placement of the cluster group; the preview overrides it. */
  origin?: readonly [number, number, number];
}

/** The slice of params the thread/knob path math consumes — derived once per
 *  params change (memoized in `built`), never on the tween path. */
function threadOptsFor(p: CoilParams): ThreadPathOpts {
  return {
    threadRadius: p.threadRadius,
    wrapTurns: p.wrapTurns,
    beadAspect: p.beadAspect,
    linkerSag: p.linkerSag,
  };
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
    const threadOpts = threadOptsFor(params);
    return {
      baseNodes,
      threadOpts,
      template: buildBeadTemplate(baseNodes, params.beadAspect, params.beadBevel, params.beadDome),
      threads: buildThreadGeometry(baseNodes, threadOpts),
      knobs: buildKnobGeometry(baseNodes),
      ribbons: buildRibbonGeometry(baseNodes, params.ribbonWidth),
    };
  }, [params]);
  useEffect(
    () => () => {
      built.template.dispose();
      built.threads.dispose();
      built.knobs.dispose();
      built.ribbons.dispose();
    },
    [built],
  );

  const beadMaterial = useMemo(() => new CoilBeadMaterial(), []);
  // Thread and knobs are opaque lit layers — no blending flags.
  const threadMaterial = useMemo(() => new CoilThreadMaterial(), []);
  const knobMaterial = useMemo(() => new CoilKnobMaterial(), []);
  const ribbonMaterial = useMemo(() => {
    const m = new CoilRibbonMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending;
    return m;
  }, []);
  useEffect(
    () => () => {
      beadMaterial.dispose();
      threadMaterial.dispose();
      knobMaterial.dispose();
      ribbonMaterial.dispose();
    },
    [beadMaterial, threadMaterial, knobMaterial, ribbonMaterial],
  );

  // Look params are uniform-only.
  useEffect(() => {
    applyCoilBeadLook(beadMaterial, params);
    applyCoilThreadLook(threadMaterial, params);
    applyCoilKnobLook(knobMaterial, params);
    applyCoilRibbonLook(ribbonMaterial, params);
    invalidate();
  }, [params, beadMaterial, threadMaterial, knobMaterial, ribbonMaterial]);

  // --- Unwind engine state ---
  // Both meshes render with culling disabled: instance matrices (and the
  // linker buffer) move per tick during the unwind, so any build-time
  // bounding sphere would go stale; the band's mount window already gates
  // visibility and the cluster fills the frame whenever mounted.
  const meshRef = useRef<InstancedMesh>(null);
  const knobRef = useRef<InstancedMesh>(null);
  const ribbonRef = useRef<Mesh>(null);
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
    writeThreadGeometry(built.threads, nodes, built.threadOpts);
    if (knobRef.current) {
      writeKnobInstances(knobRef.current, nodes, built.threadOpts, params.knobSize);
    }
    writeRibbonGeometry(built.ribbons, nodes, params.ribbonWidth);
    writeState.current = { region: regionKey, blend: blendKey };
  };

  // Initial (and post-rebuild) instance write — layout effect so the first
  // painted frame already has real matrices, never the constructor identity.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    knobRef.current?.instanceMatrix.setUsage(DynamicDrawUsage);
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
    // Mirrors the annotation labels' hover writes — the store's hover state
    // freezes the floating label's side while the pointer is on its region.
    const store = useCoilFocusStore.getState();
    const hover = region === -1 ? null : (region as CoilRegionIndex);
    if (store.hoveredRegion !== hover) store.setHoveredRegion(hover);
  };
  const handlePointerOut = (): void => {
    document.body.style.cursor = '';
    const store = useCoilFocusStore.getState();
    if (store.hoveredRegion !== null) store.setHoveredRegion(null);
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
    threadMaterial.uTime = time;
    knobMaterial.uTime = time;
    // Micro-motion freezes fully under reduced motion: drift amplitude to 0
    // everywhere (the thread and knobs carry the drums' drift formula, so
    // all three layers freeze as one) — a static suspended structure, not a
    // paused animation.
    const driftAmp = reduced ? 0 : params.driftAmp;
    beadMaterial.uDriftAmp = driftAmp;
    threadMaterial.uDriftAmp = driftAmp;
    knobMaterial.uDriftAmp = driftAmp;

    // The band's shared current, at the body's own (far smaller) amplitude —
    // drums, cord, and knobs carry the identical wave so nothing detaches.
    // Frozen with the drift under reduced motion.
    const water = getCoilWaterOverride() ?? COIL_WATER_DEFAULTS;
    const dir = currentDir(water.currentDirDeg);
    const bodyAmp = reduced ? 0 : water.beadCurrentAmp;
    for (const m of [beadMaterial, threadMaterial, knobMaterial]) {
      m.uCurrentDir = dir;
      m.uCurrentAmp = bodyAmp;
      m.uCurrentFreq = water.currentFreq;
      m.uCurrentK = COIL_CURRENT_DEFAULTS.k;
    }

    // Focus dim rides the unwind blend, on the displayed region (which
    // outlives focusedRegion through the release tween).
    const blend = useCoilFocusStore.getState().unwindBlend;
    const dimRegion = blend > 1e-4 && displayRegion.current !== null ? displayRegion.current : -1;
    beadMaterial.uFocusRegion = dimRegion;
    beadMaterial.uFocusDim = blend;
    threadMaterial.uFocusRegion = dimRegion;
    threadMaterial.uFocusDim = blend;
    knobMaterial.uFocusRegion = dimRegion;
    knobMaterial.uFocusDim = blend;
    // Ribbons: the connection streams of the displayed region, blooming as
    // it opens. The mesh is hidden entirely while compact — cheaper than
    // shading a full-screen additive pass to zero.
    ribbonMaterial.uFocusRegion = dimRegion;
    ribbonMaterial.uUnwind = blend;
    ribbonMaterial.uTime = time;
    if (ribbonRef.current) ribbonRef.current.visible = dimRegion !== -1;

    // Lights-first reveal: the drum mass materializes after its winding —
    // the amber cord and its knobs glimmer through the mist first. (The
    // preview parks depth mid-band, so it always renders fully revealed.)
    const lightsReveal = smoothstep(LIGHTS_REVEAL_START, LIGHTS_REVEAL_END, depth);
    threadMaterial.uOpacity = lightsReveal;
    knobMaterial.uOpacity = lightsReveal;
    ribbonMaterial.uOpacity = lightsReveal;
    beadMaterial.uOpacity = smoothstep(BODY_REVEAL_START, BODY_REVEAL_END, depth);

    // Match the hand-rolled fog to the live scene fog — SceneAtmosphere's
    // useFrame runs first (mounted earlier in the Canvas).
    const fog = getSceneFog();
    beadMaterial.uFogColor = fog.color;
    beadMaterial.uFogDensity = fog.density;
    threadMaterial.uFogColor = fog.color;
    threadMaterial.uFogDensity = fog.density;
    knobMaterial.uFogColor = fog.color;
    knobMaterial.uFogDensity = fog.density;
    ribbonMaterial.uFogDensity = fog.density;
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
      <mesh geometry={built.threads} material={threadMaterial} frustumCulled={false} />
      <instancedMesh
        ref={knobRef}
        args={[built.knobs, knobMaterial, built.baseNodes.length * 2]}
        frustumCulled={false}
      />
      <mesh
        ref={ribbonRef}
        geometry={built.ribbons}
        material={ribbonMaterial}
        frustumCulled={false}
        visible={false}
      />
    </group>
  );
}
