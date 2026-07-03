// src/engine/gpu-detect.ts
// GPU capability tiering. Reads WEBGL_debug_renderer_info's unmasked renderer
// string and classifies the device into 'full' (mount the Canvas) or
// 'fallback' (skip WebGL, keep the HTML/CSS atmosphere). Classification is a
// heuristic denylist that FAILS OPEN: unknown or privacy-masked strings get
// 'full', because a wrongly-denied capable device has no escape hatch, whereas
// a wrongly-allowed weak device is still caught by the WebGL error boundary.

export type GpuTier = 'full' | 'fallback';

// Software rasterizers: never run the full 3D on these.
const SOFTWARE_PATTERNS: readonly RegExp[] = [
  /swiftshader/i,
  /llvmpipe/i,
  /softpipe/i,
  /software rasterizer/i,
  /microsoft basic render/i,
];

// Clearly pre-target mobile/integrated GPUs. Deliberately conservative — only
// parts unambiguously below SPEC §9's bar (Apple A14+, Adreno 640+). Anything
// ambiguous (incl. all Adreno 6xx+, Mali-G, Apple, desktop discrete) passes.
const WEAK_PATTERNS: readonly RegExp[] = [
  /adreno\D*[345]\d\d(\b|[^0-9])/i, // Adreno 3xx/4xx/5xx (pre-6xx)
  /mali\D*(4\d\d|t[0-9])/i, // Mali-4xx / Midgard T-series (Mali-G passes)
  /powervr\D*(sgx|series[0-5])/i, // old PowerVR SGX / Series ≤5
  /intel\D*(gma|hd graphics [23]0{2,3})/i, // Intel GMA / first-gen HD 2000/3000
];

/**
 * Pure classification of an unmasked renderer string. Empty/whitespace →
 * 'full' (masked or unavailable; fail open). Exported for unit testing.
 */
export function classifyRenderer(renderer: string): GpuTier {
  const r = renderer.trim();
  if (!r) return 'full';
  if (SOFTWARE_PATTERNS.some((re) => re.test(r))) return 'fallback';
  if (WEAK_PATTERNS.some((re) => re.test(r))) return 'fallback';
  return 'full';
}

/**
 * Classify a live WebGL context. No context → 'fallback' (no WebGL at all).
 * No debug-renderer extension (privacy hardening) → 'full' (fail open). Pure
 * w.r.t. the passed gl object, so it's unit-testable with a mock.
 */
export function detectGpuTier(gl: WebGLRenderingContext | WebGL2RenderingContext | null): GpuTier {
  if (!gl) return 'fallback';
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  if (!dbg) return 'full';
  const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '');
  return classifyRenderer(renderer);
}

/**
 * Boot-time entry point: create a throwaway WebGL2 context, classify it, and
 * release it immediately (contexts are a scarce browser resource). No WebGL2 →
 * 'fallback'. Runs once before the real Canvas ever mounts.
 */
export function detectGpuTierStandalone(): GpuTier {
  if (typeof document === 'undefined') return 'fallback';
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return 'fallback';
  const tier = detectGpuTier(gl);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return tier;
}
