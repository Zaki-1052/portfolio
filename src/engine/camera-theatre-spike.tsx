// src/engine/camera-theatre-spike.tsx
// DEV-ONLY, env-gated (VITE_THEATRE_ENABLED) Theatre.js camera-authoring spike.
// Deliberately uses ONLY @theatre/core + @theatre/studio (which peer as *) and
// drives the camera by reading a Sheet object's values in a useFrame — it does
// NOT use @theatre/r3f's `editable` binding, which hard peer-requires R3F v8 and
// is the part likely broken on v9. Runs at useFrame priority 1 so it overrides
// CameraController (priority 0) while enabled. All setup is try/caught and it's
// wrapped in an error boundary by app.tsx, so failure is free — nothing here can
// take down the Canvas. Production never bundles it (dead-code-eliminated).
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { getProject } from '@theatre/core';
import studio from '@theatre/studio';

interface CameraSheetValue {
  posX: number;
  posY: number;
  posZ: number;
  fov: number;
}

let studioStarted = false;

export function CameraTheatreSpike(): null {
  const objRef = useRef<{ value: CameraSheetValue } | null>(null);

  useEffect(() => {
    try {
      if (!studioStarted) {
        studio.initialize();
        studioStarted = true;
      }
      const sheet = getProject('Portfolio · Camera').sheet('Surface');
      objRef.current = sheet.object('camera', { posX: 0, posY: 0, posZ: 26, fov: 50 });
    } catch (err) {
      console.warn('Theatre spike failed to initialize (expected under R3F v9):', err);
    }
  }, []);

  useFrame(({ camera }) => {
    const obj = objRef.current;
    if (!obj) return;
    const v = obj.value;
    camera.position.set(v.posX, v.posY, v.posZ);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = v.fov;
      camera.updateProjectionMatrix();
    }
  }, 1);

  return null;
}
