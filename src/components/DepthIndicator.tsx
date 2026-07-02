// src/components/DepthIndicator.tsx
import { useEffect, useRef, useCallback } from 'react';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { useCurrentScale } from '@/hooks/useCurrentScale';
import { SCALES, scaleFromDepth, scaleProgressFor, type ScaleName } from '@/engine/scale-manager';
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
          const scale = scaleFromDepth(depth);
          const frac = Math.max(
            0,
            Math.min(
              1,
              (SCALES.indexOf(scale) + scaleProgressFor(depth, scale)) / (SCALES.length - 1),
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

  return (
    <nav className="depth-indicator" aria-label="Scale depth">
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
