// src/scales/cellular/ArborMesh.tsx
// Assembles the arbor's three draw calls — solid limbs, ribbon strands, tip
// sprites — from the pure generator, and owns their per-frame uniform writes
// (SurfaceScene's pattern: depth/fog/time read imperatively, no re-renders).
// Subscribes to the dev override channel: growth-param edits rebuild the
// geometry (CPU-built, ~1ms), look edits re-apply uniforms. The reveal/dim
// curves and focus uniforms wire up in later stages; this component keeps a
// single seam for all of them.
import { useEffect, useMemo, useState } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide } from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getSceneFog } from '@/engine/scene-fog';
import { useBranchFocusStore } from '@/stores/branch-focus';
import { limbIndexOf } from '@/content/branch-order';
import { generateArbor } from '@/utils/arbor-generator';
import {
  ARBOR_DEFAULTS,
  ARBOR_ORIGIN,
  applyArborGlowLook,
  applyArborTrunkLook,
  type ArborParams,
} from './arbor-params';
import { getArborParamsOverride, subscribeArborParams } from './arbor-live-params';
import { buildStrandGeometry, buildTipGeometry, buildTrunkGeometry } from './arbor-geometry';
import { ArborTrunkMaterial } from './arbor-trunk-material';
import { ArborStrandMaterial, ArborTipMaterial } from './arbor-glow-material';

interface ArborMeshProps {
  /** World placement of the tree group; the preview overrides it. */
  origin?: readonly [number, number, number];
}

export function ArborMesh({ origin = ARBOR_ORIGIN }: ArborMeshProps) {
  const reduced = useReducedMotion();

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
      trunk: buildTrunkGeometry(nodes),
      strands: buildStrandGeometry(nodes),
      tips: buildTipGeometry(nodes),
    };
  }, [params]);
  useEffect(
    () => () => {
      geometries.trunk.dispose();
      geometries.strands.dispose();
      geometries.tips.dispose();
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
  useEffect(
    () => () => {
      trunkMaterial.dispose();
      strandMaterial.dispose();
      tipMaterial.dispose();
    },
    [trunkMaterial, strandMaterial, tipMaterial],
  );

  // Look params are uniform-only.
  useEffect(() => {
    applyArborTrunkLook(trunkMaterial, params);
    applyArborGlowLook(strandMaterial, params);
    applyArborGlowLook(tipMaterial, params);
    strandMaterial.uWidthScale = params.strandWidth;
    tipMaterial.uTipSize = params.tipSize;
    invalidate();
  }, [params, trunkMaterial, strandMaterial, tipMaterial]);

  useFrame((state) => {
    const time = reduced ? 0 : state.clock.elapsedTime;
    strandMaterial.uTime = time;
    tipMaterial.uTime = time;
    // Matches three's own point size attenuation scale (½ buffer height).
    tipMaterial.uPixelScale = state.gl.domElement.height * 0.5;

    // Match the hand-rolled fog to the live scene fog — SceneAtmosphere's
    // useFrame runs first (mounted earlier in the Canvas).
    const fog = getSceneFog();
    trunkMaterial.uFogColor = fog.color;
    trunkMaterial.uFogDensity = fog.density;
    strandMaterial.uFogDensity = fog.density;
    tipMaterial.uFogDensity = fog.density;

    // Focus/hover register: the focused limb holds full presence while the
    // others recede; hover lifts its limb as the click affordance.
    const focus = useBranchFocusStore.getState();
    const focusLimb = focus.focusedBranch !== null ? limbIndexOf(focus.focusedBranch) : -1;
    const hoverLimb = focus.hoveredBranch !== null ? limbIndexOf(focus.hoveredBranch) : -1;
    trunkMaterial.uFocusBranch = focusLimb;
    trunkMaterial.uFocusBlend = focus.focusBlend;
    trunkMaterial.uHoverBranch = hoverLimb;
    strandMaterial.uFocusBranch = focusLimb;
    strandMaterial.uFocusBlend = focus.focusBlend;
    strandMaterial.uHoverBranch = hoverLimb;
    tipMaterial.uFocusBranch = focusLimb;
    tipMaterial.uFocusBlend = focus.focusBlend;
    tipMaterial.uHoverBranch = hoverLimb;
  });

  return (
    <group position={[origin[0], origin[1], origin[2]]}>
      <mesh geometry={geometries.trunk} material={trunkMaterial} />
      {/* Ribbons inflate view-dependently in the vertex stage; their base
          positions bound them within a half-width — default culling is safe. */}
      <mesh geometry={geometries.strands} material={strandMaterial} />
      <points geometry={geometries.tips} material={tipMaterial} />
    </group>
  );
}
