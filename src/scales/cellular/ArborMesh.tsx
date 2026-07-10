// src/scales/cellular/ArborMesh.tsx
// Assembles the arbor's three draw calls — solid limbs, ribbon strands, tip
// sprites — from the pure generator, and owns their per-frame uniform writes
// (SurfaceScene's pattern: depth/fog/time read imperatively, no re-renders).
// Subscribes to the dev override channel: growth-param edits rebuild the
// geometry (CPU-built, ~1ms), look edits re-apply uniforms. The reveal/dim
// curves and focus uniforms wire up in later stages; this component keeps a
// single seam for all of them.
import { useEffect, useMemo, useRef, useState } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, type Group } from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getSceneFog } from '@/engine/scene-fog';
import { useDepthStore } from '@/stores/depth';
import { useBranchFocusStore } from '@/stores/branch-focus';
import { limbIndexOf } from '@/content/branch-order';
import { generateArbor } from '@/utils/arbor-generator';
import { smoothstep } from '@/utils/math';
import {
  ARBOR_DEFAULTS,
  ARBOR_ORIGIN,
  PUNCTA_PALETTE,
  applyArborGlowLook,
  applyArborTrunkLook,
  type ArborParams,
} from './arbor-params';
import { getArborParamsOverride, subscribeArborParams } from './arbor-live-params';
import {
  buildPunctaGeometry,
  buildStrandGeometry,
  buildTipGeometry,
  buildTrunkGeometry,
} from './arbor-geometry';
import { ArborTrunkMaterial } from './arbor-trunk-material';
import { ArborPunctaMaterial, ArborStrandMaterial, ArborTipMaterial } from './arbor-glow-material';

// The solid body materializes AFTER its lights: the glow layers punch
// through the mist from the band's start, the mass resolves behind them.
const BODY_REVEAL_START = 0.315;
const BODY_REVEAL_END = 0.35;

// Exit (5.6 hub-dive retime): the whole tree dissolves into the swelling
// hub glow + fog spike, COMPLETE before the camera's near plane crosses the
// hub shell (≈ depth 0.458) — a fully faded trunk renders as fog color, so
// the clipped cross-section is fog-on-fog and the pass-through is
// invisible. Once the fade completes the group turns visible=false (no
// fog-colored occluders over the emerging coil, and the draw calls go too);
// the registry hard-unmount at 0.49 stays a no-op visually.
const BODY_FADE_START = 0.446;
const BODY_FADE_END = 0.458;

// The hub-dive glow swell: as the camera locks on and pushes in
// (0.435 → 0.452 in the keyframe table), the hub's inner glow brightens ×4
// and widens across its whole face (uHubFill) — the light the transition
// passes through. Held through the fade; disabled under reduced motion
// (the anchor track cuts past the dive entirely).
const HUB_SWELL_START = 0.435;
const HUB_SWELL_END = 0.452;
const HUB_SWELL_GAIN = 3;

interface ArborMeshProps {
  /** World placement of the tree group; the preview overrides it. */
  origin?: readonly [number, number, number];
}

export function ArborMesh({ origin = ARBOR_ORIGIN }: ArborMeshProps) {
  const reduced = useReducedMotion();
  const groupRef = useRef<Group>(null);

  // Dev override channel: null in production (one check at mount + a dead
  // subscription); every panel write lands here as a state change.
  const [params, setParams] = useState<ArborParams>(
    () => getArborParamsOverride() ?? ARBOR_DEFAULTS,
  );
  useEffect(
    () => subscribeArborParams(() => setParams(getArborParamsOverride() ?? ARBOR_DEFAULTS)),
    [],
  );

  // Rebuilt whenever params change — a look-only drag rebuilds too, but the
  // whole build is ~1ms for ~600 nodes and only dev panels ever trigger it.
  const geometries = useMemo(() => {
    const nodes = generateArbor(params);
    return {
      trunk: buildTrunkGeometry(nodes, params.hubScale),
      strands: buildStrandGeometry(nodes),
      tips: buildTipGeometry(nodes),
      puncta: buildPunctaGeometry(nodes, params.punctaSpacing, PUNCTA_PALETTE),
    };
  }, [params]);
  useEffect(
    () => () => {
      geometries.trunk.dispose();
      geometries.strands.dispose();
      geometries.tips.dispose();
      geometries.puncta.dispose();
    },
    [geometries],
  );

  const trunkMaterial = useMemo(() => new ArborTrunkMaterial(), []);
  const strandMaterial = useMemo(() => {
    const m = new ArborStrandMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending;
    m.side = DoubleSide;
    return m;
  }, []);
  const tipMaterial = useMemo(() => {
    const m = new ArborTipMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending;
    return m;
  }, []);
  const punctaMaterial = useMemo(() => {
    const m = new ArborPunctaMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.blending = AdditiveBlending;
    return m;
  }, []);
  useEffect(
    () => () => {
      trunkMaterial.dispose();
      strandMaterial.dispose();
      tipMaterial.dispose();
      punctaMaterial.dispose();
    },
    [trunkMaterial, strandMaterial, tipMaterial, punctaMaterial],
  );

  // Look params are uniform-only.
  useEffect(() => {
    applyArborTrunkLook(trunkMaterial, params);
    applyArborGlowLook(strandMaterial, params);
    applyArborGlowLook(tipMaterial, params);
    strandMaterial.uWidthScale = params.strandWidth;
    tipMaterial.uTipSize = params.tipSize;
    punctaMaterial.uGlowOpacity = params.strandOpacity;
    punctaMaterial.uPunctaSize = params.punctaSize;
    punctaMaterial.uSway = params.swayAmp;
    punctaMaterial.uPulseSpeed = params.pulseSpeed;
    invalidate();
  }, [params, trunkMaterial, strandMaterial, tipMaterial, punctaMaterial]);

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    const time = reduced ? 0 : state.clock.elapsedTime;
    strandMaterial.uTime = time;
    tipMaterial.uTime = time;
    punctaMaterial.uTime = time;
    // Signal pulses freeze fully under reduced motion (a static bright band
    // would read as a defect, not a paused signal).
    const pulseGain = reduced ? 0 : params.pulseGain;
    strandMaterial.uPulseGain = pulseGain;
    tipMaterial.uPulseGain = pulseGain;
    punctaMaterial.uPulseGain = pulseGain;
    // Matches three's own point size attenuation scale (½ buffer height).
    const pixelScale = state.gl.domElement.height * 0.5;
    tipMaterial.uPixelScale = pixelScale;
    punctaMaterial.uPixelScale = pixelScale;

    // Lights-first reveal: the solid body materializes after the glow
    // layers are already glimmering through the mist. (The preview parks
    // depth mid-band, so it always renders fully revealed.) The exit
    // envelope fades EVERYTHING — into the hub-dive's glow-fill beat.
    const exit = 1 - smoothstep(BODY_FADE_START, BODY_FADE_END, depth);
    trunkMaterial.uOpacity = smoothstep(BODY_REVEAL_START, BODY_REVEAL_END, depth) * exit;
    strandMaterial.uOpacity = exit;
    tipMaterial.uOpacity = exit;
    punctaMaterial.uOpacity = exit;
    // Fully dissolved ⇒ drop the draws entirely (a faded trunk still writes
    // fog-colored depth over the emerging coil).
    if (groupRef.current) groupRef.current.visible = exit > 0.001;

    // The hub-dive glow swell — a pure function of depth, held through the
    // fade so the glow is what the frame dissolves into.
    const fillT = reduced ? 0 : smoothstep(HUB_SWELL_START, HUB_SWELL_END, depth);
    trunkMaterial.uHubFill = fillT;
    trunkMaterial.uHubGlowStrength = params.hubGlowStrength * (1 + HUB_SWELL_GAIN * fillT);

    // Match the hand-rolled fog to the live scene fog — SceneAtmosphere's
    // useFrame runs first (mounted earlier in the Canvas).
    const fog = getSceneFog();
    trunkMaterial.uFogColor = fog.color;
    trunkMaterial.uFogDensity = fog.density;
    strandMaterial.uFogDensity = fog.density;
    tipMaterial.uFogDensity = fog.density;
    punctaMaterial.uFogDensity = fog.density;

    // Focus/hover register: the focused limb holds full presence while the
    // others recede; hover lifts its limb as the click affordance.
    const focus = useBranchFocusStore.getState();
    const focusLimb = focus.focusedBranch !== null ? limbIndexOf(focus.focusedBranch) : -1;
    const hoverLimb = focus.hoveredBranch !== null ? limbIndexOf(focus.hoveredBranch) : -1;
    for (const m of [trunkMaterial, strandMaterial, tipMaterial, punctaMaterial]) {
      m.uFocusBranch = focusLimb;
      m.uFocusBlend = focus.focusBlend;
      m.uHoverBranch = hoverLimb;
    }
  });

  return (
    <group ref={groupRef} position={[origin[0], origin[1], origin[2]]}>
      <mesh geometry={geometries.trunk} material={trunkMaterial} />
      {/* Ribbons inflate view-dependently in the vertex stage; their base
          positions bound them within a half-width — default culling is safe. */}
      <mesh geometry={geometries.strands} material={strandMaterial} />
      <points geometry={geometries.tips} material={tipMaterial} />
      <points geometry={geometries.puncta} material={punctaMaterial} />
    </group>
  );
}
