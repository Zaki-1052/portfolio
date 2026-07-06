// src/engine/theme-bridge.ts
// Scroll-driven root theming. Reads each scale's resolved channel colors once
// from its section (single source of truth = globals.css), then writes blended
// values onto <html> inline style as depth changes. Fixed chrome (depth
// indicator, motion toggle, html background) inherits these root channels;
// sections keep their own [data-scale] scopes untouched.
import { gsap } from 'gsap';
import { useDepthStore } from '@/stores/depth';
import { SCALES, blendZoneFor, type ScaleName } from './scale-manager';

const CHANNELS = ['--accent', '--accent-soft', '--accent-line', '--bg', '--fog-color'] as const;
type Theme = Record<(typeof CHANNELS)[number], string>;

let themeCache: Record<ScaleName, Theme> | null = null;

export interface BlendedTheme {
  bg: string; // resolved --bg at the current depth
  fogColor: string; // resolved --fog-color at the current depth
  accent: string; // resolved --accent at the current depth
}

// Latest blended root colors, refreshed every depth tick. The WebGL layer
// (SceneAtmosphere) reads this so the Canvas clear color + fog stay identical
// to the CSS gradient — globals.css remains the single source of color truth.
let blendedTheme: BlendedTheme | null = null;

/** The current blended root colors, or null before the bridge has started. */
export function getBlendedTheme(): BlendedTheme | null {
  return blendedTheme;
}

function readSectionTheme(scale: ScaleName): Theme {
  const el = document.getElementById(scale);
  if (!el) throw new Error(`theme-bridge: section #${scale} not in DOM`);
  const cs = getComputedStyle(el);
  const theme = {} as Theme;
  for (const c of CHANNELS) {
    const value = cs.getPropertyValue(c).trim();
    if (!value || value.startsWith('var(')) {
      // Load-bearing assumption failed: getComputedStyle must resolve nested
      // var() chains to a literal color for gsap.utils.interpolate to blend.
      console.error(
        `theme-bridge: channel ${c} on #${scale} resolved to "${value}" (expected a literal color). ` +
          `Boundary color blending needs a literal fallback table.`,
      );
    }
    theme[c] = value;
  }
  return theme;
}

/**
 * Subscribe root channel vars to scroll depth. `isReducedMotion` gates the
 * blend: when reduced, snap to the target theme instead of interpolating.
 * Returns an unsubscribe.
 */
export function startThemeBridge(isReducedMotion: () => boolean): () => void {
  themeCache ??= Object.fromEntries(SCALES.map((s) => [s, readSectionTheme(s)])) as Record<
    ScaleName,
    Theme
  >;
  const cache = themeCache;
  const root = document.documentElement;

  // Reused across ticks — this runs at scroll frequency, so `out` is a scratch
  // (never reallocated) and `applied` holds the last value written per channel.
  // Outside the 0.03-wide blend zones every channel is a constant cached string
  // tick-over-tick, so the diff below elides all 5 root style writes there;
  // theme-bridge is the sole writer of these root channels, so the cache is
  // authoritative. Only inside a blend zone do the values move and get written.
  const out = {} as Theme;
  const applied = {} as Partial<Theme>;

  const applyDepth = (depth: number): void => {
    const zone = blendZoneFor(depth);
    if (zone.from === zone.to) {
      const theme = cache[zone.to];
      for (const c of CHANNELS) out[c] = theme[c];
    } else {
      const from = cache[zone.from];
      const to = cache[zone.to];
      const t = isReducedMotion() ? Math.round(zone.t) : zone.t;
      // Stateless per-tick interpolation (scroll-scrubbed, not time-tweened).
      for (const c of CHANNELS) out[c] = gsap.utils.interpolate(from[c], to[c], t);
    }
    let changed = false;
    for (const c of CHANNELS) {
      if (applied[c] !== out[c]) {
        root.style.setProperty(c, out[c]);
        applied[c] = out[c];
        changed = true;
      }
    }
    // The WebGL layer (SceneAtmosphere) reads this each frame; only rebuild it
    // when a channel actually moved, so unchanged ticks allocate nothing.
    if (changed || blendedTheme === null) {
      blendedTheme = { bg: out['--bg'], fogColor: out['--fog-color'], accent: out['--accent'] };
    }
  };

  const unsubDepth = useDepthStore.subscribe((s) => s.depth, applyDepth, { fireImmediately: true });
  const unsubScale = useDepthStore.subscribe(
    (s) => s.currentScale,
    (scale) => {
      // Styling hook for fixed chrome. NOT data-scale — that would fire the
      // [data-scale]::before/::after atmospherics on <html>.
      root.dataset.currentScale = scale;
    },
    { fireImmediately: true },
  );

  return (): void => {
    unsubDepth();
    unsubScale();
  };
}
