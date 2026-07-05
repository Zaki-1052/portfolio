// src/scales/tissue/stalk-mesh.tsx
// The stalk as a COMPANION PASS of the shell's own height field — best of
// both worlds. The main shell must never displace a stalk (a single surface
// cannot protrude a column outward without digging a matching pit into the
// interior wall — the source of a whole family of interior artifacts), so it
// runs with uStalkHeight = 0 and its interior stays a clean continuous sheet.
// This mesh is a SECOND copy of the same sphere, same shader, same params,
// but with the stalk term ON and uStalkSolo = 1: the vertex stage collapses
// everything outside the stalk footprint into the column's interior and the
// fragment stage discards it, so only the column renders — rising
// continuously out of the underside with the exact skirt/fiber look of the
// original single-surface design. From inside, the entire column sits outside
// the main sheet and is fully occluded. polygonOffset settles the thin
// coplanar skirt ring in the companion's favor (identical shading there, so
// the choice is invisible — it just prevents z-shimmer).
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, type Mesh } from 'three';
import { SurfaceShellMaterial } from './tissue-shell-material';
import { SHELL_DEFAULTS, applyShellParams } from './shell-params';
import { getShellParamsOverride } from './shell-live-params';

export function StalkMesh({
  shellMaterial,
}: {
  shellMaterial: InstanceType<typeof SurfaceShellMaterial>;
}) {
  const meshRef = useRef<Mesh>(null);

  const material = useMemo(() => {
    const m = new SurfaceShellMaterial();
    m.side = DoubleSide;
    m.uStalkSolo = 1;
    m.polygonOffset = true;
    m.polygonOffsetFactor = -1;
    m.polygonOffsetUnits = -1;
    applyShellParams(m, SHELL_DEFAULTS, true); // true → the stalk term is live here
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    // One material family, two passes: mirror the shell's per-frame drivers
    // so the column always matches the body (dimming, fog, look, dissolve,
    // breathing time, coil texture).
    material.uTime = shellMaterial.uTime;
    material.uOpacity = shellMaterial.uOpacity;
    material.uLook = shellMaterial.uLook;
    material.uFogColor = shellMaterial.uFogColor;
    material.uFogDensity = shellMaterial.uFogDensity;
    material.uDissolve = shellMaterial.uDissolve;
    material.uDissolveRadius = shellMaterial.uDissolveRadius;
    material.uApertureDir = shellMaterial.uApertureDir;
    material.uCoilTex = shellMaterial.uCoilTex;
    material.uRDBlend = shellMaterial.uRDBlend;

    const p = getShellParamsOverride();
    if (p) applyShellParams(material, p, true);
    const mesh = meshRef.current;
    if (mesh) mesh.visible = (p ?? SHELL_DEFAULTS).stalkHeight > 0.05;
  });

  // No transform: same object space as the shell — the height field places
  // the column on the surface exactly as the single-surface design did.
  return (
    <mesh ref={meshRef} material={material}>
      {/* Same detail as the shell so the footprint's displacement sampling
          matches; everything outside the footprint collapses + discards, so
          the fill cost is only the column itself. */}
      <icosahedronGeometry args={[12, 64]} />
    </mesh>
  );
}
