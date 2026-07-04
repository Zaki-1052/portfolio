// src/scales/tissue/reaction-diffusion.ts
// Gray-Scott reaction-diffusion that grows the shell's COIL FIELD on the GPU —
// the labyrinth regime natively produces uniform-width worms that turn, loop,
// branch, and pack into each other, which is exactly the ridge pattern the
// shell displaces and shades (see shell-shape.glsl). The sim warms over a
// frame-spread step budget, then a one-shot bake pass (coil-bake.glsl) shapes
// it into a plain RGBA8 texture (filterable + mipped on every device; the
// half-float ping-pong targets are neither, portably) and the sim is disposed.
// The baked target is cached at module scope so the pattern forms exactly once
// per session. The random seed means the coil layout varies slightly per visit
// (accepted; deterministic seeding is a later option). Not unit-tested (needs
// a real renderer); visual-verify only.
import { useEffect, useState } from 'react';
import { invalidate, useFrame, useThree } from '@react-three/fiber';
import {
  DataTexture,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import rdStep from '@/shaders/reaction-diffusion.glsl?raw';
import coilBake from '@/shaders/coil-bake.glsl?raw';

export interface RDParams {
  feed: number;
  kill: number;
  diffuseA: number;
  diffuseB: number;
  dt: number;
}

// 512 doubles the coil count per UV over the old 256 (the pattern wavelength
// is fixed in TEXELS, so texture size authors tube density on the shell).
export const RD_SIZE = 512;
// Maze regime (Pearson stripes) — space-FILLING labyrinth of uniform-width
// worms. The old feed/kill (0.055/0.062, coral growth) only ever produced
// expanding rings/spots at any warmup budget the page can afford.
export const RD_PARAMS: RDParams = {
  feed: 0.029,
  kill: 0.057,
  diffuseA: 1.0,
  diffuseB: 0.5,
  dt: 1.0,
};
// Dense speckle seeding (~12-texel spacing): the fronts collide almost
// immediately, so the maze matures everywhere at once instead of growing
// outward in rings from a few far-apart blobs.
const RD_SEED_DENSITY = 1 / 150;
// The warmup budget is the same under reduced motion: the pattern is now the
// ridge source itself (not decoration), and the cost is one-time and invisible
// before arrival — an immature field would mean a half-sculpted form. A 512²
// compute pass is ~free, so the budget is spent at 96 steps/frame (~0.6 s).
const RD_STEPS = 3500;
const RD_STEPS_PER_FRAME = 96;

export interface ReactionDiffusionSim {
  texture: () => Texture;
  step: (n: number) => void;
  bake: () => WebGLRenderTarget;
  dispose: () => void;
}

// Seed: chemical A=1 everywhere, B=1 in a dense speckle of small dots that
// nucleate the maze everywhere at once (radius 1–2: single texels diffuse
// away before they can react).
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
  const dots = Math.round(size * size * RD_SEED_DENSITY);
  for (let s = 0; s < dots; s++) {
    const cx = Math.floor(Math.random() * size);
    const cy = Math.floor(Math.random() * size);
    const r = 1 + Math.floor(Math.random() * 2);
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
  // Toroidal sim: the laplacian's edge taps wrap, so the grown pattern tiles
  // seamlessly — required for the baked texture's RepeatWrapping (the shell's
  // interior-floor planar projection crosses the tile seam).
  variable.wrapS = RepeatWrapping;
  variable.wrapT = RepeatWrapping;
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
    // One-shot shaping pass into the RGBA8 coil texture (see coil-bake.glsl).
    // The renderer generates the target's mips after doRenderTarget, so the
    // shell gets distance anti-aliasing for free.
    bake: (): WebGLRenderTarget => {
      const rt = new WebGLRenderTarget(size, size, {
        format: RGBAFormat,
        type: UnsignedByteType,
        wrapS: RepeatWrapping,
        wrapT: RepeatWrapping,
        minFilter: LinearMipmapLinearFilter,
        magFilter: LinearFilter,
        generateMipmaps: true,
        depthBuffer: false,
        stencilBuffer: false,
      });
      const mat = gpu.createShaderMaterial(coilBake, {
        uSrc: { value: gpu.getCurrentRenderTarget(variable).texture },
      });
      gpu.doRenderTarget(mat, rt);
      mat.dispose();
      return rt;
    },
    dispose: () => gpu.dispose(),
  };
}

// Session-scoped cache: the baked target stays GPU-resident across scene
// remounts, so the pattern warms and bakes exactly once.
let cachedSim: ReactionDiffusionSim | null = null;
let cachedStepsLeft = 0;
let cachedBaked: WebGLRenderTarget | null = null;

/**
 * Returns the baked coil texture, warming the sim to steady state on first
 * mount over a frame-spread budget and baking once. Null until the bake lands
 * (the shell's placeholder renders the form smooth until then).
 */
export function useCoilTexture(): Texture | null {
  const gl = useThree((s) => s.gl);
  const [texture, setTexture] = useState<Texture | null>(() => cachedBaked?.texture ?? null);

  useEffect(() => {
    if (cachedBaked) {
      setTexture(cachedBaked.texture);
      return;
    }
    if (!cachedSim) {
      cachedSim = createReactionDiffusion(gl, RD_SIZE, RD_PARAMS);
      cachedStepsLeft = RD_STEPS;
    }
    invalidate();
    // Deliberately never disposed on unmount — cached for the session.
  }, [gl]);

  useFrame(() => {
    if (cachedBaked || !cachedSim) return;
    cachedSim.step(Math.min(RD_STEPS_PER_FRAME, cachedStepsLeft));
    cachedStepsLeft -= RD_STEPS_PER_FRAME;
    if (cachedStepsLeft <= 0) {
      cachedBaked = cachedSim.bake();
      cachedSim.dispose();
      cachedSim = null;
      setTexture(cachedBaked.texture);
    }
    invalidate(); // pump frames until baked, then rest
  });

  return texture;
}
