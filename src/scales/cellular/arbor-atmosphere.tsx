// src/scales/cellular/arbor-atmosphere.tsx
// The band's connective atmosphere — the arbor must read as one structure in
// a signaling NETWORK, not a lone specimen:
//   · ArborDrift — a tight rose drift field floating between the canopy's
//     reaches (the shared DriftField pattern; 1 draw call);
//   · ArborNeighbors — two faint glow-only structures (strands + tips grown
//     from other seeds) far in the haze, carrying the same signal pulses so
//     distant firing glimmers through the mist (2 draw calls each).
// All envelope-faded by depth; fog extinction does the rest of the veiling.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide } from 'three';
import { DriftField, type DriftConfig } from '@/scales/tissue/atmosphere-motes';
import { getSceneFog } from '@/engine/scene-fog';
import { useDepthStore } from '@/stores/depth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { smoothstep } from '@/utils/math';
import { generateArbor } from '@/utils/arbor-generator';
import { ARBOR_DEFAULTS, ARBOR_ORIGIN, applyArborGlowLook } from './arbor-params';
import { buildStrandGeometry, buildTipGeometry } from './arbor-geometry';
import { ArborStrandMaterial, ArborTipMaterial } from './arbor-glow-material';

// Signal motes drifting between the reaches — slow rise, tight to the canopy.
// Wider than the canopy so the frame's flanks stay inhabited (user note:
// the sides felt bare) — still sparse, most drift sits out in the dark.
const CANOPY_DRIFT: DriftConfig = {
  count: 210,
  rInner: 3,
  rOuter: 24,
  color: '#ffca8a', // warm scattered field dots against the navy (reference)
  size: [0.22, 0.38],
  wobble: 0.9,
  rise: 0.12,
  riseRange: 6,
  fadeNear: [1.2, 3],
  fadeFar: [30, 55],
  opacityAt: (depth) => 0.55 * smoothstep(0.315, 0.35, depth) * (1 - smoothstep(0.43, 0.47, depth)),
};

export function ArborDrift() {
  return (
    // Centered on the canopy, not the root.
    <group position={[ARBOR_ORIGIN[0], ARBOR_ORIGIN[1] + 20, ARBOR_ORIGIN[2]]}>
      <DriftField config={CANOPY_DRIFT} />
    </group>
  );
}

interface NeighborSpec {
  seed: number;
  position: readonly [number, number, number];
  scale: number;
  rotY: number;
  /** Glow multiplier — neighbors are presences, not subjects. */
  dim: number;
}

const NEIGHBORS: readonly NeighborSpec[] = [
  { seed: 23, position: [-42, -12, -60], scale: 1.15, rotY: 1.9, dim: 0.16 },
  { seed: 41, position: [27, -6, -66], scale: 0.8, rotY: 4.2, dim: 0.22 },
];

function neighborEnvelope(depth: number): number {
  return smoothstep(0.315, 0.355, depth) * (1 - smoothstep(0.44, 0.48, depth));
}

function NeighborStructure({ spec }: { spec: NeighborSpec }) {
  const reduced = useReducedMotion();

  const geometries = useMemo(() => {
    const nodes = generateArbor({ ...ARBOR_DEFAULTS, seed: spec.seed });
    return { strands: buildStrandGeometry(nodes), tips: buildTipGeometry(nodes) };
  }, [spec]);
  useEffect(
    () => () => {
      geometries.strands.dispose();
      geometries.tips.dispose();
    },
    [geometries],
  );

  const materials = useMemo(() => {
    const strands = new ArborStrandMaterial();
    strands.transparent = true;
    strands.depthWrite = false;
    strands.blending = AdditiveBlending;
    strands.side = DoubleSide;
    applyArborGlowLook(strands, ARBOR_DEFAULTS);
    const tips = new ArborTipMaterial();
    tips.transparent = true;
    tips.depthWrite = false;
    tips.blending = AdditiveBlending;
    applyArborGlowLook(tips, ARBOR_DEFAULTS);
    tips.uTipSize = ARBOR_DEFAULTS.tipSize;
    return { strands, tips };
  }, []);
  useEffect(
    () => () => {
      materials.strands.dispose();
      materials.tips.dispose();
    },
    [materials],
  );

  useFrame((state) => {
    const depth = useDepthStore.getState().depth;
    const time = reduced ? 0 : state.clock.elapsedTime;
    const fade = neighborEnvelope(depth) * spec.dim;
    const fog = getSceneFog();
    for (const m of [materials.strands, materials.tips]) {
      m.uTime = time;
      m.uOpacity = fade;
      m.uFogDensity = fog.density;
      m.uPulseGain = reduced ? 0 : ARBOR_DEFAULTS.pulseGain;
    }
    materials.tips.uPixelScale = state.gl.domElement.height * 0.5;
  });

  return (
    <group
      position={[spec.position[0], spec.position[1], spec.position[2]]}
      rotation={[0, spec.rotY, 0]}
      scale={spec.scale}
    >
      <mesh geometry={geometries.strands} material={materials.strands} />
      <points geometry={geometries.tips} material={materials.tips} />
    </group>
  );
}

export function ArborNeighbors() {
  return (
    <>
      {NEIGHBORS.map((spec) => (
        <NeighborStructure key={spec.seed} spec={spec} />
      ))}
    </>
  );
}
