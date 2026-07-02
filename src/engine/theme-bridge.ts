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

  const applyDepth = (depth: number): void => {
    const zone = blendZoneFor(depth);
    if (zone.from === zone.to) {
      const theme = cache[zone.to];
      for (const c of CHANNELS) root.style.setProperty(c, theme[c]);
      return;
    }
    const from = cache[zone.from];
    const to = cache[zone.to];
    const t = isReducedMotion() ? Math.round(zone.t) : zone.t;
    for (const c of CHANNELS) {
      // Stateless per-tick interpolation (scroll-scrubbed, not time-tweened).
      const value: string = gsap.utils.interpolate(from[c], to[c], t);
      root.style.setProperty(c, value);
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
