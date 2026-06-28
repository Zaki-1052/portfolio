// src/components/DepthIndicator.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { SCALES, type ScaleName } from '@/stores/depth';

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

export function DepthIndicator() {
  const [activeId, setActiveId] = useState<ScaleName>('tissue');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            setActiveId(entry.target.id as ScaleName);
          }
        }
      },
      { threshold: 0.3 },
    );

    for (const scale of SCALES) {
      const el = document.getElementById(scale);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  const handleJump = useCallback((id: ScaleName) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const activeIndex = Math.max(
    0,
    SCALE_INFO.findIndex((s) => s.id === activeId),
  );
  const fillPct = SCALE_INFO.length > 1 ? (activeIndex / (SCALE_INFO.length - 1)) * 100 : 0;

  return (
    <nav className="depth-indicator" aria-label="Scale depth">
      <div className="depth-indicator__inner">
        <span className="depth-indicator__track" aria-hidden="true" />
        <span
          className="depth-indicator__fill"
          aria-hidden="true"
          style={{
            height: `calc(${fillPct}% - var(--space-2) * 2 * ${fillPct / 100})`,
          }}
        />

        {SCALE_INFO.map((s) => {
          const active = s.id === activeId;
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
                <span className="depth-indicator__label">
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
