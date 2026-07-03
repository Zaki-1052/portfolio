// src/engine/camera-dev-tools.tsx
// DEV-ONLY leva panel for tuning the camera keyframes live. Writes straight into
// liveCameraKeyframes (which CameraController reads) and invalidate()s so edits
// render immediately under frameloop="demand". The "bake" button copies the
// tuned table as JSON to paste back into CAMERA_KEYFRAMES. Lazy-loaded behind
// import.meta.env.DEV in app.tsx, so it's dead-code-eliminated from production.
import { useMemo } from 'react';
import { invalidate } from '@react-three/fiber';
import { button, folder, useControls } from 'leva';
import { CAMERA_KEYFRAMES, liveCameraKeyframes } from './camera-keyframes';

export function CameraDevTools(): null {
  const schema = useMemo(() => {
    // leva's own schema-parameter type — its folder/button generics don't unify
    // in a hand-typed Record, but this has the index signature + variance leva wants.
    const s: Parameters<typeof folder>[0] = {};
    CAMERA_KEYFRAMES.forEach((kf, i) => {
      s[`depth ${kf.depth}`] = folder({
        position: {
          value: { x: kf.position[0], y: kf.position[1], z: kf.position[2] },
          step: 0.5,
          onChange: (v: { x: number; y: number; z: number }) => {
            const target = liveCameraKeyframes[i];
            if (target) {
              target.position = [v.x, v.y, v.z] as [number, number, number];
              invalidate();
            }
          },
        },
        fov: {
          value: kf.fov,
          min: 20,
          max: 100,
          step: 1,
          onChange: (v: number) => {
            const target = liveCameraKeyframes[i];
            if (target) {
              target.fov = v;
              invalidate();
            }
          },
        },
      });
    });
    s['bake → clipboard'] = button(() => {
      const json = JSON.stringify(liveCameraKeyframes, null, 2);
      void navigator.clipboard?.writeText(json);
      console.log('[camera keyframes]\n' + json);
    });
    return s;
  }, []);

  useControls('camera', schema);
  return null;
}
