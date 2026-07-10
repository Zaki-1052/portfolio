// src/scales/chromatin/coil-current.ts
// The band's shared water current — ONE traveling plane wave that every
// medium layer samples (silt, bokeh motes, bubbles, veils, plus a subtle
// term on the coil body itself), so the whole band sways as one body of
// water instead of independently jittering layers. Pure math, no three
// imports; the GLSL twin of `currentOffset` lives in each consuming vertex
// stage (uniforms uCurrentDir / uCurrentAmp / uCurrentFreq / uCurrentK).
//
// Shape: a horizontal xz sway along a fixed compass direction, whose phase
// travels across space (spatial frequency k) — wavelength 2π/k ≈ 105 world
// units at the default k, so nearby points move together and the far side
// of the scene lags, the way a slow current reads. Layers evaluate it in
// their own local frames; a constant per-layer phase offset just translates
// the wave, and the bead/thread/knob stages share coordinates exactly, so
// the wound cord never detaches from a swaying drum.

export interface CoilCurrentParams {
  /** Compass direction of the sway in the xz plane (degrees). */
  dirDeg: number;
  /** Sway amplitude in world units. */
  amp: number;
  /** Temporal frequency (rad/s) — one full sway cycle every 2π/freq s. */
  freq: number;
  /** Spatial frequency (rad/world-unit) — phase travel across the scene. */
  k: number;
}

export const COIL_CURRENT_DEFAULTS: CoilCurrentParams = {
  dirDeg: 40,
  amp: 0.35,
  freq: 0.22,
  k: 0.06,
};

/** Unit xz direction for a compass angle in degrees. */
export function currentDir(dirDeg: number): [number, number] {
  const rad = (dirDeg * Math.PI) / 180;
  return [Math.cos(rad), Math.sin(rad)];
}

/**
 * The wave itself: horizontal offset [x, 0, z] for a point at `pos` and
 * time `time`. Mirrors the GLSL term exactly:
 *   phase = time·freq + dot(pos.xz, dir)·k;  offset = dir · amp·sin(phase)
 */
export function currentOffset(
  pos: readonly [number, number, number],
  time: number,
  cfg: CoilCurrentParams,
): [number, number, number] {
  const [dx, dz] = currentDir(cfg.dirDeg);
  const phase = time * cfg.freq + (pos[0] * dx + pos[2] * dz) * cfg.k;
  const s = cfg.amp * Math.sin(phase);
  return [dx * s, 0, dz * s];
}
