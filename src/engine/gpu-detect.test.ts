// src/engine/gpu-detect.test.ts
import { describe, it, expect } from 'vitest';
import { classifyRenderer, detectGpuTier } from './gpu-detect';

describe('classifyRenderer', () => {
  it('passes modern desktop and mobile GPUs as full', () => {
    const full = [
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)',
      'Apple GPU',
      'ANGLE (Qualcomm, Adreno (TM) 660, OpenGL ES 3.2)',
      'Mali-G78',
      'AMD Radeon Pro 5500M OpenGL Engine',
      'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    ];
    for (const r of full) expect(classifyRenderer(r)).toBe('full');
  });

  it('denies software rasterizers and pre-target mobile GPUs', () => {
    const fallback = [
      'Google SwiftShader',
      'llvmpipe (LLVM 12.0.0, 256 bits)',
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device), SwiftShader driver)',
      'Adreno (TM) 505',
      'Adreno (TM) 430',
      'Mali-400 MP',
      'Mali-T760',
      'PowerVR SGX 543',
    ];
    for (const r of fallback) expect(classifyRenderer(r)).toBe('fallback');
  });

  it('fails open to full on masked/empty strings', () => {
    expect(classifyRenderer('')).toBe('full');
    expect(classifyRenderer('   ')).toBe('full');
    expect(classifyRenderer('WebGL')).toBe('full');
  });
});

describe('detectGpuTier', () => {
  const mockGl = (renderer: string | null): WebGLRenderingContext =>
    ({
      getExtension: (name: string) =>
        name === 'WEBGL_debug_renderer_info' && renderer !== null
          ? { UNMASKED_RENDERER_WEBGL: 0x9246 }
          : null,
      getParameter: () => renderer,
    }) as unknown as WebGLRenderingContext;

  it('returns fallback with no context', () => {
    expect(detectGpuTier(null)).toBe('fallback');
  });
  it('fails open to full when the debug extension is unavailable', () => {
    expect(detectGpuTier(mockGl(null))).toBe('full');
  });
  it('classifies the unmasked renderer string', () => {
    expect(detectGpuTier(mockGl('Google SwiftShader'))).toBe('fallback');
    expect(detectGpuTier(mockGl('Apple M2'))).toBe('full');
  });
});
