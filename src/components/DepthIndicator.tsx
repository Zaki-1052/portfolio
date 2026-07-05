// src/components/DepthIndicator.tsx
import { useEffect, useRef, useCallback } from 'react';
import { useDepthStore } from '@/stores/depth';
import { useIntroStore } from '@/stores/intro';
import { useMotionStore } from '@/stores/motion';
import { useCurrentScale } from '@/hooks/useCurrentScale';
import {
  CONTENT_SCALES,
  SCALES,
  scaleFromDepth,
  scaleProgressFor,
  type ScaleName,
} from '@/engine/scale-manager';
import { getLenis } from '@/engine/scroll-engine';

interface ScaleInfo {
  id: ScaleName;
  name: string;
  magnification?: string;
}

const SCALE_INFO: ScaleInfo[] = [
  { id: 'tissue', name: 'tissue', magnification: '1×' },
  { id: 'cellular', name: 'cellular', magnification: '100×' },
  { id: 'chromatin', name: 'chromatin', magnification: '10,000×' },
  { id: 'protein', name: 'protein', magnification: '1,000,000×' },
  { id: 'code', name: 'code' },
  { id: 'expression', name: 'expression' },
];

/** Smooth-scroll to a scale via Lenis (instant under reduced motion). */
function jumpToScale(id: ScaleName): void {
  // The overture owns the page until it lands — no scale jumps mid-intro
  // (keyboard would otherwise bypass the scroll lock).
  if (useIntroStore.getState().phase !== 'done') return;
  const lenis = getLenis();
  const immediate = useMotionStore.getState().reduced;
  if (lenis) {
    lenis.scrollTo(`#${id}`, { immediate });
  } else {
    document.getElementById(id)?.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
  }
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function DepthIndicator() {
  const currentScale = useCurrentScale();
  const fillRef = useRef<HTMLSpanElement>(null);

  // Continuous fill height (intra-scale progress) driven imperatively so the
  // bar tracks scroll without re-rendering React every tick.
  useEffect(
    () =>
      useDepthStore.subscribe(
        (s) => s.depth,
        (depth) => {
          // Fill maps the six CONTENT scales only — the 'approach' journey band
          // is pre-descent (indexOf -1 clamps the fill to 0 while inside it).
          const scale = scaleFromDepth(depth);
          const frac = Math.max(
            0,
            Math.min(
              1,
              (CONTENT_SCALES.indexOf(scale) + scaleProgressFor(depth, scale)) /
                (CONTENT_SCALES.length - 1),
            ),
          );
          fillRef.current?.style.setProperty(
            'height',
            `calc(${(frac * 100).toFixed(2)}% - var(--space-2) * 2 * ${frac.toFixed(4)})`,
          );
        },
        { fireImmediately: true },
      ),
    [],
  );

  // Keyboard scale navigation (SPEC §6). Arrow/Page keys jump between scales;
  // bail while typing in a form field. NOTE: hijacks bare Arrow keys from
  // fine-grained scroll by design — revisit in the Phase 7 a11y re-audit.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isTypingTarget(e.target)) return;
      const dir =
        e.key === 'ArrowDown' || e.key === 'PageDown'
          ? 1
          : e.key === 'ArrowUp' || e.key === 'PageUp'
            ? -1
            : 0;
      if (dir === 0) return;
      e.preventDefault();
      const idx = SCALES.indexOf(useDepthStore.getState().currentScale);
      const next = Math.max(0, Math.min(SCALES.length - 1, idx + dir));
      if (next !== idx) jumpToScale(SCALES[next]!);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleJump = useCallback((id: ScaleName) => {
    jumpToScale(id);
  }, []);

  // The indicator is a map of the content descent — it stays hidden through
  // the pre-descent journey band and fades in as you breach the surface.
  const inApproach = currentScale === 'approach';

  return (
    <nav
      className="depth-indicator"
      aria-label="Scale depth"
      aria-hidden={inApproach || undefined}
      style={{
        opacity: inApproach ? 0 : undefined,
        pointerEvents: inApproach ? 'none' : undefined,
        transition: 'opacity var(--dur-slow) var(--ease-in-out)',
      }}
    >
      <div className="depth-indicator__inner">
        <span className="depth-indicator__track" aria-hidden="true" />
        <span ref={fillRef} className="depth-indicator__fill" aria-hidden="true" />

        {SCALE_INFO.map((s) => {
          const active = s.id === currentScale;
          return (
            <button
              key={s.id}
              className="depth-indicator__btn"
              onClick={() => handleJump(s.id)}
              aria-current={active ? 'true' : undefined}
              title={s.name}
            >
              <span
                className="depth-indicator__dot"
                aria-hidden="true"
                data-scale={active ? s.id : undefined}
              />
              {active && (
                <span key={s.id} className="depth-indicator__label">
                  {s.name}
                  {s.magnification ? ` · ${s.magnification}` : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
