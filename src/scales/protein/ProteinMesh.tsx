// src/scales/protein/ProteinMesh.tsx
// Assembles the band's ribbon draw calls from the offline pipeline's binary and
// owns their per-frame uniform writes (the ArborMesh/CoilMesh pattern: depth,
// fog and time read imperatively in useFrame, no re-renders).
//
// TWO draw calls, not one per chain. The subject's two fragments only ever need
// one opacity, and the supporting chains only ever fade together — the only
// split that has to exist is subject vs. supporting, for the crossfade a later
// stage adds. So each side merges into one geometry, exactly as arbor-geometry
// merges its spines.
//
// PLACEMENT. The pipeline emits raw simulation-box coordinates in Ångström: the
// complex spans ~123 Å and its centroid sits ~(53, 64, 56). The scene wants it
// upright, centred, and about 4 world units tall. All three corrections are
// group transforms at the mount, never baked into the geometry — the sweep
// works in the same units the pipeline validated against its reference renders,
// and coil-geometry likewise never imports COIL_ORIGIN.
//
//   · scale     — PROTEIN_WORLD_SCALE, uniform, Å → world units.
//   · rotation  — −90° about X, mapping object +Z to world +Y. The bilayer
//                 normal IS +Z in this data despite `midplaneY`'s name (see
//                 protein-loader), so without this the structure lies on its
//                 side and the membrane stands up like a wall.
//   · position  — the outer group sits at the band's origin; the inner group
//                 subtracts the centre, which is derived from frame 0 rather
//                 than hardcoded (the two systems have different midplanes and
//                 must still land in the same place).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useDepthStore } from '@/stores/depth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getSceneFog } from '@/engine/scene-fog';
import { smoothstep } from '@/utils/math';
import { loadProteinData, frameSlice, type ProteinData } from '@/utils/protein-loader';
import {
  PROTEIN_FADE_END,
  PROTEIN_FADE_START,
  PROTEIN_ORIGIN,
  PROTEIN_REVEAL_END,
  PROTEIN_REVEAL_START,
  PROTEIN_LOOK_DEFAULTS,
  PROTEIN_WORLD_SCALE,
  applyProteinRibbonLook,
  type ProteinLookParams,
} from './protein-params';
import { getProteinLookOverride, subscribeProteinLook } from './protein-live-params';
import { ProteinRibbonMaterial } from './protein-materials';
import {
  allocateGuides,
  deriveReferenceNormals,
  receptorCenter,
  writeGuides,
  type GuideFragment,
} from './protein-guide';
import { buildRibbonGeometry } from './protein-geometry';

/** Chain index — drives brightness in the shader, and the focus register. */
const CHAIN_RECEPTOR = 0;
const CHAIN_GPROTEIN = 1;

/** This stage renders the primary system only; the second is added later. */
const SYSTEM = 'gq' as const;

/** This stage is a static render off the trajectory's first frame — the
 *  scroll-driven playback that makes the frame index move lands next. */
const STATIC_FRAME = 0;

interface ProteinMeshProps {
  origin?: readonly [number, number, number];
}

export function ProteinMesh({ origin = PROTEIN_ORIGIN }: ProteinMeshProps) {
  const reduced = useReducedMotion();
  const groupRef = useRef<Group>(null);

  // Dev override channel: null in production (one check at mount + a dead
  // subscription); every panel write lands here as a state change.
  const [look, setLook] = useState<ProteinLookParams>(
    () => getProteinLookOverride() ?? PROTEIN_LOOK_DEFAULTS,
  );
  useEffect(
    () => subscribeProteinLook(() => setLook(getProteinLookOverride() ?? PROTEIN_LOOK_DEFAULTS)),
    [],
  );

  // The band's assets are ~4 MB, so they load on scene mount rather than at
  // startup. SceneManager mounts this well before the band opens and the reveal
  // envelope holds everything invisible until later still, so there is real
  // runway; a late arrival simply pops in behind the fog. No Suspense — a
  // fallback inside the Canvas is a different problem, and the imperative
  // effect+state is the house idiom.
  const [data, setData] = useState<ProteinData | null>(null);
  useEffect(() => {
    let live = true;
    loadProteinData()
      .then((d) => {
        if (live) setData(d);
      })
      .catch((err: unknown) => {
        // Loud: a silent catch here would leave an empty band with no clue why.
        console.error('[protein] asset load failed — the band will not render', err);
      });
    return () => {
      live = false;
    };
  }, []);

  const receptorMaterial = useMemo(() => new ProteinRibbonMaterial(), []);
  const gproteinMaterial = useMemo(() => new ProteinRibbonMaterial(), []);

  useEffect(() => {
    applyProteinRibbonLook(receptorMaterial, look);
    applyProteinRibbonLook(gproteinMaterial, look);
  }, [look, receptorMaterial, gproteinMaterial]);

  /** Everything frame-invariant, resolved once the binary lands: fragment
   *  layout, reference normals, the centre, and the two geometries. The
   *  trajectory only ever moves positions after this. */
  const built = useMemo(() => {
    if (!data) return null;
    const meta = data.meta;
    const traj = data[SYSTEM];
    const slice = frameSlice(traj, STATIC_FRAME);

    const receptorMeta = meta.receptor[SYSTEM];
    const receptorFragments: GuideFragment[] = receptorMeta.fragments.map((f) => ({
      startResidue: f.startResidue,
      count: f.count,
    }));

    // The supporting chains arrive concatenated in one block, so their
    // fragment boundaries are the chain boundaries.
    const gproteinMeta = meta.gprotein[SYSTEM];
    const gproteinFragments: GuideFragment[] = [];
    let at = 0;
    for (const chain of gproteinMeta.chains) {
      gproteinFragments.push({ startResidue: at, count: chain.residueCount });
      at += chain.residueCount;
    }
    const gproteinSS = gproteinMeta.chains.map((c) => c.ss).join('');

    // The pipeline bakes reference normals for the subject only; derive the
    // supporting chains' from frame 0 so the sweep has one code path and the
    // flip check stays anchored to a fixed reference for every chain.
    const receptorRefs = Float32Array.from(receptorMeta.referenceNormals);
    const gproteinRefs = deriveReferenceNormals(
      slice.gprotein,
      gproteinFragments,
      gproteinMeta.totalResidues,
    );

    const receptorGuides = allocateGuides(receptorFragments);
    const gproteinGuides = allocateGuides(gproteinFragments);
    writeGuides(
      receptorGuides,
      slice.receptor,
      receptorFragments,
      receptorRefs,
      receptorMeta.residueCount,
    );
    writeGuides(
      gproteinGuides,
      slice.gprotein,
      gproteinFragments,
      gproteinRefs,
      gproteinMeta.totalResidues,
    );

    const receptorGeo = buildRibbonGeometry(
      receptorGuides,
      receptorMeta.ss,
      receptorFragments,
      Float32Array.from(receptorMeta.rmsf),
      receptorMeta.residueCount,
      CHAIN_RECEPTOR,
    );
    // The pipeline ships no flexibility data for the supporting chains, so
    // they carry zero: below any floor the panel can set, it normalises to 0
    // at every setting and the chains stay cool and matte. That is the honest
    // reading — no measurement, no dynamics layer — and it is also the
    // hierarchy the band wants. Anything derived from the live floor would
    // silently desync, since this build is keyed on the data alone.
    const gproteinGeo = buildRibbonGeometry(
      gproteinGuides,
      gproteinSS,
      gproteinFragments,
      new Float32Array(gproteinMeta.totalResidues),
      gproteinMeta.totalResidues,
      CHAIN_GPROTEIN,
    );

    // Lateral centre on the subject (the complex's own centroid is dragged
    // off-axis by the supporting chains); vertical centre on the bilayer, so
    // the membrane lands at world y = 0 with the transducer hanging below.
    const rc = receptorCenter(slice.receptor, receptorMeta.residueCount);
    const center: [number, number, number] = [rc[0], rc[1], meta.membrane[SYSTEM].midplaneY];

    return { receptorGeo, gproteinGeo, center };
  }, [data]);

  useFrame((state) => {
    if (!built) return;
    const depth = useDepthStore.getState().depth;

    const time = reduced ? 0 : state.clock.elapsedTime;
    receptorMaterial.uTime = time;
    gproteinMaterial.uTime = time;

    // Two-sided envelope: resolve out of the haze on the way in, dissolve back
    // into it on the way out.
    const exit = 1 - smoothstep(PROTEIN_FADE_START, PROTEIN_FADE_END, depth);
    const reveal = smoothstep(PROTEIN_REVEAL_START, PROTEIN_REVEAL_END, depth) * exit;
    receptorMaterial.uOpacity = reveal;
    gproteinMaterial.uOpacity = reveal;
    // Fully dissolved ⇒ drop the draws entirely (a faded ribbon still writes
    // fog-coloured depth over whatever is emerging behind it).
    if (groupRef.current) groupRef.current.visible = exit > 0.001;

    // Match the hand-rolled fog to the live scene fog — SceneAtmosphere's
    // useFrame runs first (mounted earlier in the Canvas).
    const fog = getSceneFog();
    receptorMaterial.uFogColor = fog.color;
    receptorMaterial.uFogDensity = fog.density;
    gproteinMaterial.uFogColor = fog.color;
    gproteinMaterial.uFogDensity = fog.density;
  });

  if (!built) return null;

  return (
    <group
      ref={groupRef}
      position={[origin[0], origin[1], origin[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={PROTEIN_WORLD_SCALE}
    >
      <group position={[-built.center[0], -built.center[1], -built.center[2]]}>
        <mesh geometry={built.receptorGeo} material={receptorMaterial} frustumCulled={false} />
        <mesh geometry={built.gproteinGeo} material={gproteinMaterial} frustumCulled={false} />
      </group>
    </group>
  );
}
