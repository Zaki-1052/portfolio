// src/engine/camera-dev-tools.tsx
// DEV-ONLY leva panel for tuning the camera keyframes live. Rendered in the HTML
// layer (NOT the Canvas) and returns <Leva/> explicitly: leva 0.9.36's implicit
// auto-mount uses the removed ReactDOM.render and crashes on React 19, whereas an
// in-tree <Leva/> renders through normal React. useControls writes into
// liveCameraKeyframes (which CameraController reads) and invalidate()s so edits
// show under frameloop="demand"; "bake" copies the tuned table as JSON. Lazy +
// DEV-gated in app.tsx, so production never bundles leva.
//
// leva keys must be globally unique and contain no '.' (its path separator), so
// folders are integer-indexed (kf0…) and leaf keys carry the index.
import { useMemo } from 'react';
import { invalidate } from '@react-three/fiber';
import { Leva, button, folder, useControls } from 'leva';
import { CAMERA_KEYFRAMES, liveCameraKeyframes } from './camera-keyframes';

export function CameraDevTools() {
  const schema = useMemo(() => {
    const s: Parameters<typeof folder>[0] = {};
    CAMERA_KEYFRAMES.forEach((kf, i) => {
      s[`kf${i} · d${Math.round(kf.depth * 100)}`] = folder({
        [`pos${i}`]: {
          value: { x: kf.position[0], y: kf.position[1], z: kf.position[2] },
          step: 0.5,
          onChange: (v: { x: number; y: number; z: number }) => {
            const knot = liveCameraKeyframes[i];
            if (knot) {
              knot.position = [v.x, v.y, v.z] as [number, number, number];
              invalidate();
            }
          },
        },
        [`target${i}`]: {
          value: { x: kf.target[0], y: kf.target[1], z: kf.target[2] },
          step: 0.5,
          onChange: (v: { x: number; y: number; z: number }) => {
            const knot = liveCameraKeyframes[i];
            if (knot) {
              knot.target = [v.x, v.y, v.z] as [number, number, number];
              invalidate();
            }
          },
        },
        [`roll${i}`]: {
          value: (kf.roll * 180) / Math.PI, // degrees in the panel, radians in the table
          min: -30,
          max: 30,
          step: 0.5,
          onChange: (deg: number) => {
            const knot = liveCameraKeyframes[i];
            if (knot) {
              knot.roll = (deg * Math.PI) / 180;
              invalidate();
            }
          },
        },
        [`fov${i}`]: {
          value: kf.fov,
          min: 20,
          max: 100,
          step: 1,
          onChange: (v: number) => {
            const knot = liveCameraKeyframes[i];
            if (knot) {
              knot.fov = v;
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
  return <Leva collapsed />;
}
