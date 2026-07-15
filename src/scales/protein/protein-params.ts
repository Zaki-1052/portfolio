// src/scales/protein/protein-params.ts
// Visual parameters for the protein ribbon renderer — world placement,
// cross-section profiles (consumed by the sweep geometry in Session 4),
// reveal envelope, RMSF normalization, and the uniform-writer stub.
// Pure data + mappers; no three imports beyond types.
import type { Color } from 'three';

// ---- World placement ----

export const PROTEIN_ORIGIN: readonly [number, number, number] = [-4, -28, -42];

// ---- Cross-section profiles (§6.2) ----

export interface RibbonProfile {
  width: number;
  height: number;
}

export const HELIX_PROFILE: RibbonProfile = { width: 1.2, height: 0.2 };
export const HELIX_RADIAL_SEGMENTS = 8;

export const SHEET_PROFILE_START: RibbonProfile = { width: 0.6, height: 0.15 };
export const SHEET_PROFILE_PEAK: RibbonProfile = { width: 1.8, height: 0.15 };
export const SHEET_PROFILE_END: RibbonProfile = { width: 0, height: 0 };
export const SHEET_RADIAL_SEGMENTS = 4;

export const COIL_TUBE_RADIUS = 0.15;
export const COIL_RADIAL_SEGMENTS = 6;

export const GUIDE_POINTS_PER_RESIDUE = 4;
export const SS_TRANSITION_GUIDE_POINTS = 2;

// ---- Reveal envelope ----

export const PROTEIN_REVEAL_START = 0.58;
export const PROTEIN_REVEAL_END = 0.62;
export const PROTEIN_FADE_START = 0.68;
export const PROTEIN_FADE_END = 0.71;

// ---- RMSF normalization ----

export const RMSF_FLOOR = 0.3;
export const RMSF_CEIL = 4.0;

// ---- Breathing amplitude (§6.3) ----

export const BREATHING_AMP = 0.05;
export const BREATHING_FREQ = 0.3;

// ---- Chain brightness ----

export const RECEPTOR_BRIGHTNESS = 1.0;
export const GPROTEIN_BRIGHTNESS = 0.6;

// ---- Uniform interface + writer ----

export interface ProteinRibbonUniforms {
  uTime: number;
  uDepth: number;
  uFogColor: Color;
  uFogDensity: number;
  uOpacity: number;
  uCyanKey: Color;
  uFocusRegion: number;
  uFocusDim: number;
  uActiveSystem: number;
  uToggleBlend: number;
  uRmsfFloor: number;
  uRmsfCeil: number;
  uBreathingAmp: number;
  uBreathingFreq: number;
}

export function applyProteinRibbonLook(m: ProteinRibbonUniforms): void {
  m.uRmsfFloor = RMSF_FLOOR;
  m.uRmsfCeil = RMSF_CEIL;
  m.uBreathingAmp = BREATHING_AMP;
  m.uBreathingFreq = BREATHING_FREQ;
  m.uFocusRegion = -1;
  m.uFocusDim = 0;
  m.uActiveSystem = 0;
  m.uToggleBlend = 0;
  m.uOpacity = 1;
}
