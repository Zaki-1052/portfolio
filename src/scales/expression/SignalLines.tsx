// src/scales/expression/SignalLines.tsx
// The signal fan: one merged tube mesh (5 lines) + one Points draw of
// traveling packets, both re-derived every frame from the LIVE resolved
// origin (resolveSignalOrigin — the custody handoff rides through here for
// free). Uniform wiring follows the two-clock rule: growth and wind-down
// and warmth are pure functions of depth; ambient pulses/packets ride
// uTime; the submit spark and final pulse are wall-clock event stamps from
// the signal-focus store, folded into ONE uEventPulse pair (they cannot
// overlap in practice — max is safe). The pointer handlers are PREVIEW
// PARITY only: the live canvas is pointer-events:none, and the projected
// HTML annotations are the real tap surface (CoilMesh precedent).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  type Group,
  type Points,
} from 'three';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { useSignalFocusStore } from '@/stores/signal-focus';
import { getSceneFog } from '@/engine/scene-fog';
import { smoothstep } from '@/utils/math';
import {
  EXPRESSION_BEAT_DEFAULTS,
  annotationsEnvelope,
  liveExpressionBeatParams,
  warmBookendT,
  windDownT,
} from './expression-beats';
import {
  ORIGIN_EASE_END,
  ORIGIN_EASE_START,
  SIGNAL_CHANNEL_IDS,
  channelIndexOf,
  resolveSignalOrigin,
} from './signal-geometry';
import {
  FACES_PER_LINE,
  buildSignalLineGeometry,
  sampleSignalCurve,
  writeSignalLineGeometry,
} from './signal-lines-geometry';
import { SignalLineMaterial, SignalPacketMaterial } from './signal-materials';
import { SIGNAL_LOOK_DEFAULTS, applySignalLineLook } from './signal-params';
import { eventPulseProgress } from './signal-pulse';
import { getExpressionLookOverride, subscribeExpressionParams } from './expression-live-params';

/** Deterministic per-packet phase/speed scatter (LCG — screenshot-stable,
 *  the code-environment convention; never Math.random in scene code). */
function packetSeed(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const scratch: [number, number, number] = [0, 0, 0];

export function SignalLines() {
  const groupRef = useRef<Group>(null);
  const pointsRef = useRef<Points>(null);
  const prevDepth = useRef(-1);
  const [look, setLook] = useState(() => getExpressionLookOverride() ?? SIGNAL_LOOK_DEFAULTS);
  useEffect(
    () =>
      subscribeExpressionParams(() => setLook(getExpressionLookOverride() ?? SIGNAL_LOOK_DEFAULTS)),
    [],
  );

  const lineMaterial = useMemo(() => {
    const m = new SignalLineMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending;
    return m;
  }, []);
  const packetMaterial = useMemo(() => {
    const m = new SignalPacketMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending;
    return m;
  }, []);

  // Geometry is built once per bow/width change (topology is static; the
  // per-frame path only rewrites positions from the live origin).
  const lineGeometry = useMemo(
    () =>
      buildSignalLineGeometry(
        resolveSignalOrigin(useDepthStore.getState().depth),
        look.bowAmount,
        look.lineWidth,
      ),
    [look.bowAmount, look.lineWidth],
  );

  // Packet pool: 5 channels × density, positions + life fraction rewritten
  // per frame (the breakthrough-particles shape). Density rides the LOOK
  // channel because a change rebuilds this pool.
  const packetCount = SIGNAL_CHANNEL_IDS.length * Math.max(1, Math.round(look.packetDensity));
  const packetGeometry = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new BufferAttribute(new Float32Array(packetCount * 3), 3);
    const life = new BufferAttribute(new Float32Array(packetCount), 1);
    positions.setUsage(DynamicDrawUsage);
    life.setUsage(DynamicDrawUsage);
    geo.setAttribute('position', positions);
    geo.setAttribute('aPacketT', life);
    return geo;
  }, [packetCount]);

  useEffect(() => {
    return () => {
      lineGeometry.dispose();
    };
  }, [lineGeometry]);
  useEffect(() => {
    return () => {
      packetGeometry.dispose();
    };
  }, [packetGeometry]);
  useEffect(
    () => () => {
      lineMaterial.dispose();
      packetMaterial.dispose();
    },
    [lineMaterial, packetMaterial],
  );

  useEffect(() => {
    applySignalLineLook(lineMaterial, look);
    packetMaterial.uColor.set(look.lineColor);
    packetMaterial.uWarmColor.set(look.warmColor);
    packetMaterial.uSize = look.packetSize;
  }, [look, lineMaterial, packetMaterial]);

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    const group = groupRef.current;
    if (!group) return;

    // The fan exists only inside the band (the scene itself is mounted from
    // 0.80 for the handoff overlap) — skip all work outside it.
    if (depth < ORIGIN_EASE_START - 1e-6) {
      group.visible = false;
      return;
    }
    group.visible = true;

    const p = import.meta.env.DEV ? liveExpressionBeatParams : EXPRESSION_BEAT_DEFAULTS;
    const reduced = useMotionStore.getState().reduced;
    const focus = useSignalFocusStore.getState();
    const origin = resolveSignalOrigin(depth);

    // The closing movement's threshold watcher (event clock): the one final
    // pulse fires on the forward crossing — idempotent, so dwelling past it
    // never re-fires — and rewinding beneath the threshold clears the stamp
    // (the bootExecutedAtMs null-on-rewind mold), so a fresh descent gets a
    // fresh pulse.
    if (prevDepth.current < p.lastPulseAt && depth >= p.lastPulseAt) {
      focus.fireFinalPulse();
    } else if (depth < p.lastPulseAt && focus.finalPulseFiredAtMs !== null) {
      focus.clearFinalPulse();
    }
    prevDepth.current = depth;

    // Rewrite the tubes from the live origin — unconditional, cheap at
    // 5 × 24 ring samples (the always-recompute convention).
    writeSignalLineGeometry(lineGeometry, origin, look.bowAmount, look.lineWidth);

    // --- Scroll clock: growth, reveal, wind-down, warmth. ---
    // Lines extend once the origin ease has settled, fully out by the
    // annotations' arrival; +0.06 headroom clears the tip's soft edge.
    const grow = smoothstep(ORIGIN_EASE_END, p.annotationsReveal, depth) * 1.06;
    const wind = windDownT(depth, p);
    const warm = warmBookendT(depth, p);
    lineMaterial.uGrowT = grow;
    lineMaterial.uOpacity = 1;
    lineMaterial.uWarmT = warm;
    // Wind-down dims the ambient pulses toward embers; reduced motion is a
    // static suspended structure — no pulses at all.
    lineMaterial.uPulseGain = reduced ? 0 : 1 - wind * 0.85;
    lineMaterial.uFlowSpeed = p.pulseSpeed;

    // --- uTime clock: ambient motion (held by acquireAmbientRendering). ---
    lineMaterial.uTime = state.clock.elapsedTime;

    // --- Focus / hover (the store's blend IS the camera pivot blend). ---
    lineMaterial.uFocusChannel =
      focus.focusedChannel === null ? -1 : channelIndexOf(focus.focusedChannel);
    lineMaterial.uFocusDim = focus.focusBlend;
    lineMaterial.uHoverChannel =
      focus.hoveredChannel === null ? -1 : channelIndexOf(focus.hoveredChannel);

    // --- Event clock: the submit spark and the final pulse share one
    // uniform pair; -1 disables (unfired, or already landed). ---
    const now = Date.now();
    const durationMs = reduced ? 0 : p.eventPulseDurationMs;
    const spark = eventPulseProgress(focus.signalBurstFiredAtMs, now, durationMs);
    const finale = eventPulseProgress(focus.finalPulseFiredAtMs, now, durationMs);
    const pulse = Math.max(spark, finale);
    const pulseLive = pulse > 0 && pulse < 1;
    lineMaterial.uEventPulseChannel = pulseLive ? channelIndexOf('email') : -1;
    lineMaterial.uEventPulseT = pulseLive ? pulse : -1;

    // --- Packets: born at the origin, dying at the terminus, on slow
    // desynced timers; density fades in with the fan and out with the
    // wind-down. Hidden entirely under reduced motion (no pulses). ---
    const reveal = annotationsEnvelope(depth, p);
    const packetsVisible = !reduced && reveal > 0;
    if (pointsRef.current) pointsRef.current.visible = packetsVisible;
    if (packetsVisible) {
      const posAttr = packetGeometry.getAttribute('position') as BufferAttribute;
      const lifeAttr = packetGeometry.getAttribute('aPacketT') as BufferAttribute;
      const pArr = posAttr.array as Float32Array;
      const lArr = lifeAttr.array as Float32Array;
      const perChannel = packetCount / SIGNAL_CHANNEL_IDS.length;
      for (let i = 0; i < packetCount; i++) {
        const channel = SIGNAL_CHANNEL_IDS[Math.floor(i / perChannel)]!;
        const seed = packetSeed(i);
        const speed = (0.035 + seed * 0.05) * (1 - wind * 0.6);
        const t = (state.clock.elapsedTime * speed + seed * 7.13) % 1;
        sampleSignalCurve(origin, channel, look.bowAmount, t, scratch);
        pArr[i * 3 + 0] = scratch[0];
        pArr[i * 3 + 1] = scratch[1];
        pArr[i * 3 + 2] = scratch[2];
        lArr[i] = t;
      }
      posAttr.needsUpdate = true;
      lifeAttr.needsUpdate = true;
      packetMaterial.uOpacity = look.packetOpacity * reveal * (1 - wind * 0.8);
      packetMaterial.uWarmT = warm;
    }

    // Hand-rolled fog matches the live scene fog exactly.
    const fog = getSceneFog();
    lineMaterial.uFogDensity = fog.density;
    packetMaterial.uFogDensity = fog.density;
  });

  // Preview-only parity: the live canvas is pointer-events:none, so these
  // never fire on the site — but the isolated preview's canvas is
  // interactive, and tapping a line there must match tapping its
  // annotation (the CoilMesh handleClick convention, face-index → channel).
  const channelFromFace = (e: ThreeEvent<MouseEvent> | ThreeEvent<PointerEvent>) => {
    const face = e.faceIndex;
    if (face === undefined || face === null) return null;
    return SIGNAL_CHANNEL_IDS[Math.floor(face / FACES_PER_LINE)] ?? null;
  };
  const handleClick = (e: ThreeEvent<MouseEvent>): void => {
    const channel = channelFromFace(e);
    if (channel === null) return;
    e.stopPropagation();
    const store = useSignalFocusStore.getState();
    const depth = useDepthStore.getState().depth;
    store.setFocusedChannel(store.focusedChannel === channel ? null : channel, depth);
  };
  const handlePointerMove = (e: ThreeEvent<PointerEvent>): void => {
    useSignalFocusStore.getState().setHoveredChannel(channelFromFace(e));
  };
  const handlePointerOut = (): void => {
    useSignalFocusStore.getState().setHoveredChannel(null);
  };

  return (
    <group ref={groupRef} visible={false}>
      <mesh
        geometry={lineGeometry}
        material={lineMaterial}
        frustumCulled={false}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      />
      <points
        ref={pointsRef}
        geometry={packetGeometry}
        material={packetMaterial}
        frustumCulled={false}
      />
    </group>
  );
}
