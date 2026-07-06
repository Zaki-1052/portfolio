// src/scales/tissue/flag-flight-mesh.tsx
// The hero flag-flight flourish: a small flag card that, on arriving at the
// hero, flies in from the screen's bottom-right, arcs across, and dives into/
// behind the form with real depth — then re-arms for the next arrival. A
// one-shot on its own elapsed-time clock (NOT scroll-scrubbed), so it never
// freezes mid-air; it self-sustains the demand frameloop while flying (the
// LoadingSequence/camera-controller idiom). All the trigger/path/envelope math
// is the pure, node-tested flag-flight.ts; this component owns the three-side
// work: rasterizing the SVG, unprojecting the screen-anchored entry into a
// world path at launch, and the billboard+bank each frame.
//
// Mounted only under full motion (gated in TissueScene, like BreakthroughParticles).
import { useEffect, useMemo, useRef } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import {
  type Camera,
  CanvasTexture,
  DoubleSide,
  type Mesh,
  NoColorSpace,
  Quaternion,
  Vector3,
} from 'three';
import { useDepthStore } from '@/stores/depth';
import { useIntroStore } from '@/stores/intro';
import { getSceneFog } from '@/engine/scene-fog';
import { clamp } from '@/utils/math';
import {
  FLAG_FLIGHT_DEFAULT,
  type FlagFlightConfig,
  type Vec3,
  crossedLaunch,
  flightEase,
  flightOpacity,
  leftRearmZone,
  sampleFlightPath,
} from './flag-flight';
import { FlagFlightMaterial } from './flag-flight-material';
import { consumeFlagReplay, getFlagFlightOverride } from './flag-flight-live-params';

// Geometry aspect = the flag artwork's aspect; the mesh is scaled by cfg.size.
const FLAG_ASPECT = 36 / 26;

// The card's local normal / in-plane roll axis (a billboarded PlaneGeometry
// faces +z), used for the velocity bank.
const UNIT_Z = new Vector3(0, 0, 1);

// Rasterize /flag.svg into a cropped CanvasTexture (the artwork's transparent
// top/bottom margins are cropped out so the card IS the flag, rounded corners
// intact). Uploaded with NoColorSpace — the shader decodes sRGB→linear itself
// (see flag-flight-material.ts). The texture object is stable; the async image
// load fills it in and invalidates one frame.
function useFlagTexture(): CanvasTexture {
  const texture = useMemo(() => {
    const unit = 16; // px per SVG unit → 576×416, crisp and well under budget
    const canvas = document.createElement('canvas');
    canvas.width = 36 * unit;
    canvas.height = 26 * unit; // artwork spans y 5..31 of the 36-tall viewBox
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = NoColorSpace;

    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Shift the 36×36 viewBox up by 5 units so the flag's content row
      // (y 5..31) fills the cropped canvas exactly.
      ctx.drawImage(img, 0, -5 * unit, 36 * unit, 36 * unit);
      tex.needsUpdate = true;
      invalidate();
    };
    img.src = '/flag.svg';
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

type FlightPhase = 'idle' | 'flying' | 'done';

export function FlagFlight() {
  const meshRef = useRef<Mesh>(null);
  const texture = useFlagTexture();

  const material = useMemo(() => {
    const m = new FlagFlightMaterial();
    m.transparent = true;
    m.depthWrite = false; // a transparent card must not occlude; it is still depth-TESTED, so the shell occludes it
    m.side = DoubleSide;
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.uMap = texture;
  }, [material, texture]);

  // Persistent flight state (no store — a scene-local one-shot, like
  // BreakthroughParticles, but with its own clock).
  const state = useRef({
    phase: 'idle' as FlightPhase,
    armed: true,
    prevDepth: Number.POSITIVE_INFINITY, // no spurious crossing on the first frame
    launchElapsed: 0,
    path: [] as Vec3[],
  });

  // Reused scratch to avoid per-frame allocation.
  const tmp = useMemo(
    () => ({
      ray: new Vector3(),
      camPos: new Vector3(),
      tangent: new Vector3(),
      invCam: new Quaternion(),
      qBank: new Quaternion(),
    }),
    [],
  );

  // Build the frozen world-space flight path from the live camera at launch:
  // screen-anchored entry + arc waypoints (unprojected onto rays at their
  // dist), then the world-space exit. Frame-agnostic — works on whichever
  // launch frame the config points at.
  const buildPath = (camera: Camera, cfg: FlagFlightConfig): Vec3[] => {
    tmp.camPos.copy(camera.position);
    const fromScreen = (ndc: readonly [number, number], dist: number): Vec3 => {
      tmp.ray.set(ndc[0], ndc[1], 0.5).unproject(camera);
      tmp.ray.sub(tmp.camPos).normalize();
      return [
        tmp.camPos.x + tmp.ray.x * dist,
        tmp.camPos.y + tmp.ray.y * dist,
        tmp.camPos.z + tmp.ray.z * dist,
      ];
    };
    const points: Vec3[] = [fromScreen(cfg.entry.ndc, cfg.entry.dist)];
    for (const w of cfg.arc) points.push(fromScreen(w.ndc, w.dist));
    points.push([cfg.exit[0], cfg.exit[1], cfg.exit[2]]);
    return points;
  };

  useFrame(({ camera, clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const s = state.current;
    const depth = useDepthStore.getState().depth;
    const cfg = getFlagFlightOverride() ?? FLAG_FLIGHT_DEFAULT;
    const forceReplay = consumeFlagReplay(); // DEV-only; false in production

    // --- Trigger / re-arm (only while not already flying) ---
    if (s.phase !== 'flying') {
      if (leftRearmZone(depth, cfg)) s.armed = true;
      const introDone = useIntroStore.getState().phase === 'done';
      const shouldLaunch =
        forceReplay || (s.armed && introDone && crossedLaunch(s.prevDepth, depth, cfg.launchDepth));
      if (shouldLaunch) {
        s.path = buildPath(camera, cfg);
        s.launchElapsed = clock.elapsedTime;
        s.phase = 'flying';
        s.armed = false;
      }
    }

    // --- Flight ---
    if (s.phase === 'flying') {
      const t = clamp((clock.elapsedTime - s.launchElapsed) / cfg.duration, 0, 1);
      const eased = flightEase(t);
      const pos = sampleFlightPath(s.path, eased);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.scale.setScalar(cfg.size);

      // Billboard to the camera, then bank into the screen-horizontal velocity
      // (a roll about the view axis) so the card reads as flying, not sliding.
      mesh.quaternion.copy(camera.quaternion);
      const ahead = sampleFlightPath(s.path, flightEase(Math.min(t + 0.03, 1)));
      tmp.tangent.set(ahead[0] - pos[0], ahead[1] - pos[1], ahead[2] - pos[2]);
      let bank = 0;
      if (tmp.tangent.lengthSq() > 1e-8) {
        tmp.tangent.normalize();
        tmp.invCam.copy(camera.quaternion).invert();
        tmp.tangent.applyQuaternion(tmp.invCam); // into camera space; x = screen-right
        bank = -clamp(tmp.tangent.x, -1, 1) * cfg.bank;
      }
      tmp.qBank.setFromAxisAngle(UNIT_Z, bank);
      mesh.quaternion.multiply(tmp.qBank);

      material.uOpacity = flightOpacity(t, cfg.fadeInEnd, cfg.fadeOutStart) * cfg.peakOpacity;
      material.uTime = clock.elapsedTime;
      material.uWaveAmp = cfg.waveAmp;
      material.uWaveFreq = cfg.waveFreq;
      const fog = getSceneFog();
      material.uFogColor = fog.color;
      material.uFogDensity = fog.density;
      mesh.visible = true;

      if (t >= 1) {
        s.phase = 'done';
        material.uOpacity = 0;
        mesh.visible = false;
      } else {
        invalidate(); // keep the demand loop alive for the whole flight
      }
    } else if (mesh.visible) {
      mesh.visible = false;
    }

    s.prevDepth = depth;
  });

  return (
    <mesh ref={meshRef} material={material} visible={false} frustumCulled={false}>
      <planeGeometry args={[FLAG_ASPECT, 1, 24, 16]} />
    </mesh>
  );
}
