// src/scales/tissue/breakthrough-particles.tsx
// The burst that fires as the aperture opens. Positions are a PURE function of
// breakthroughProgress (seeded per-particle direction × progress) — never an
// integrated velocity sim — so scrubbing the scroll backward rewinds it exactly.
// One draw call (THREE.Points). The parent mounts this only under full motion.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, type BufferAttribute, type Points, type PointsMaterial } from 'three';
import { useDepthStore } from '@/stores/depth';
import { breakthroughProgress } from './breakthrough';

const COUNT = 320;
const SPREAD = 16;

export function BreakthroughParticles() {
  const pointsRef = useRef<Points>(null);
  const matRef = useRef<PointsMaterial>(null);

  // Baked once: start positions on a small disc at the aperture, and an
  // outward+toward-camera direction per particle.
  const { positions, directions } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const directions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 2.2;
      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.sin(a) * r;
      positions[i * 3 + 2] = 7;
      const speed = 0.5 + Math.random();
      directions[i * 3 + 0] = Math.cos(a) * (0.3 + Math.random() * 0.7) * speed;
      directions[i * 3 + 1] = Math.sin(a) * (0.3 + Math.random() * 0.7) * speed;
      directions[i * 3 + 2] = (1.0 + Math.random()) * 1.4; // toward the camera (+z)
    }
    return { positions, directions };
  }, []);

  useFrame(() => {
    const p = breakthroughProgress(useDepthStore.getState().depth);
    const geo = pointsRef.current?.geometry;
    if (geo) {
      const attr = geo.getAttribute('position') as BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < COUNT; i++) {
        arr[i * 3 + 0] = positions[i * 3 + 0]! + directions[i * 3 + 0]! * p * SPREAD;
        arr[i * 3 + 1] = positions[i * 3 + 1]! + directions[i * 3 + 1]! * p * SPREAD;
        arr[i * 3 + 2] = positions[i * 3 + 2]! + directions[i * 3 + 2]! * p * SPREAD;
      }
      attr.needsUpdate = true;
    }
    // Burst envelope: rises and fades within the window (0 at both ends).
    if (matRef.current) matRef.current.opacity = Math.sin(p * Math.PI) * 0.9;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.35}
        color="#f2b06a"
        transparent
        opacity={0}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
