// src/scales/tissue/reaction-diffusion.ts
// Gray-Scott reaction-diffusion that grows the shell's surface-detail texture on
// the GPU, then FREEZES. Built on three's GPUComputationRenderer (ping-pong
// render targets). It warms to a pattern over a bounded, frame-spread step
// budget (invisible inside the arrival fade), then stops computing — the RT
// texture is already GPU-resident, so "freeze" is just "stop stepping". The sim
// is cached at module scope so scrolling away and back never re-forms it. Not
// unit-tested (needs a real renderer); visual-verify only.
import { useEffect, useState } from 'react';
import { invalidate, useFrame, useThree } from '@react-three/fiber';
import { DataTexture, HalfFloatType, type Texture, type WebGLRenderer } from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import rdStep from '@/shaders/reaction-diffusion.glsl?raw';

export interface RDParams {
  feed: number;
  kill: number;
  diffuseA: number;
  diffuseB: number;
  dt: number;
}

export const RD_SIZE = 256;
// Labyrinth/coral regime — reads as organic brain-like mottling.
export const RD_PARAMS: RDParams = {
  feed: 0.055,
  kill: 0.062,
  diffuseA: 1.0,
  diffuseB: 0.5,
  dt: 1.0,
};
const RD_STEPS_FULL = 600;
const RD_STEPS_REDUCED = 150;
const RD_STEPS_PER_FRAME = 16;

export interface ReactionDiffusionSim {
  texture: () => Texture;
  step: (n: number) => void;
  dispose: () => void;
}

// Seed: chemical A=1 everywhere, B=1 in scattered blobs that nucleate the pattern.
function seedGrayScott(tex: DataTexture, size: number): void {
  // createTexture() backs the image with a Float32Array at runtime; the static
  // image.data type is a narrower typed-array union, so cast through unknown.
  const data = tex.image.data as unknown as Float32Array;
  for (let i = 0; i < size * size; i++) {
    data[i * 4 + 0] = 1;
    data[i * 4 + 1] = 0;
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 1;
  }
  const blobs = 28;
  for (let s = 0; s < blobs; s++) {
    const cx = Math.floor(Math.random() * size);
    const cy = Math.floor(Math.random() * size);
    const r = 3 + Math.floor(Math.random() * 6);
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r) continue;
        const px = (((cx + x) % size) + size) % size;
        const py = (((cy + y) % size) + size) % size;
        data[(py * size + px) * 4 + 1] = 1;
      }
    }
  }
  tex.needsUpdate = true;
}

export function createReactionDiffusion(
  gl: WebGLRenderer,
  size: number,
  params: RDParams,
): ReactionDiffusionSim {
  const gpu = new GPUComputationRenderer(size, size, gl);
  gpu.setDataType(HalfFloatType); // half-float RTs render on far more devices than full-float (iOS)
  const seed = gpu.createTexture();
  seedGrayScott(seed, size);
  const variable = gpu.addVariable('textureGrayScott', rdStep, seed);
  gpu.setVariableDependencies(variable, [variable]);
  const u = variable.material.uniforms;
  u.uFeed = { value: params.feed };
  u.uKill = { value: params.kill };
  u.uDiffuseA = { value: params.diffuseA };
  u.uDiffuseB = { value: params.diffuseB };
  u.uDt = { value: params.dt };
  const error = gpu.init();
  if (error) console.error('reaction-diffusion: GPUComputationRenderer init failed:', error);

  return {
    texture: () => gpu.getCurrentRenderTarget(variable).texture,
    step: (n: number): void => {
      for (let i = 0; i < n; i++) gpu.compute();
    },
    dispose: () => gpu.dispose(),
  };
}

// Session-scoped cache: one renderer means the GPU-resident texture stays valid
// across scene remounts, so the pattern warms exactly once.
let cachedSim: ReactionDiffusionSim | null = null;
let cachedStepsLeft = 0;

/**
 * Returns the RD texture, warming it to steady state on first mount over a
 * frame-spread budget (smaller under reduced motion), then holding it frozen.
 */
export function useReactionDiffusionWarmup(reduced: boolean): Texture | null {
  const gl = useThree((s) => s.gl);
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    if (!cachedSim) {
      cachedSim = createReactionDiffusion(gl, RD_SIZE, RD_PARAMS);
      cachedStepsLeft = reduced ? RD_STEPS_REDUCED : RD_STEPS_FULL;
    }
    setTexture(cachedSim.texture());
    invalidate();
    // Deliberately never disposed on unmount — cached for the session.
  }, [gl, reduced]);

  useFrame(() => {
    if (!cachedSim || cachedStepsLeft <= 0) return;
    const n = Math.min(RD_STEPS_PER_FRAME, cachedStepsLeft);
    cachedSim.step(n);
    cachedStepsLeft -= n;
    setTexture(cachedSim.texture());
    invalidate(); // pump frames until warmed, then rest
  });

  return texture;
}
