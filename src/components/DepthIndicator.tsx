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
    <nav
      aria-label="Scale depth"
      style={{
        position: 'fixed',
        top: '50%',
        right: 'clamp(12px, 2vw, 28px)',
        transform: 'translateY(-50%)',
        zIndex: 'var(--z-nav)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingLeft: 2,
        }}
      >
        {/* Track */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 6,
            bottom: 6,
            left: '50%',
            width: 1,
            transform: 'translateX(-50%)',
            background: 'var(--hairline)',
          }}
        />
        {/* Fill */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 6,
            left: '50%',
            width: 1,
            height: `calc(${fillPct}% - 12px * ${fillPct / 100})`,
            transform: 'translateX(-50%)',
            background: 'var(--accent-line)',
            transition: 'height var(--dur-base) var(--ease-out)',
          }}
        />

        {SCALE_INFO.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => handleJump(s.id)}
              aria-current={active ? 'true' : undefined}
              title={s.name}
              style={{
                position: 'relative',
                appearance: 'none',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                padding: '10px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                aria-hidden="true"
                data-scale={active ? s.id : undefined}
                style={{
                  width: active ? 9 : 5,
                  height: active ? 9 : 5,
                  borderRadius: '50%',
                  background: active ? 'var(--accent)' : 'var(--text-faint)',
                  boxShadow: active ? 'var(--glow-accent)' : 'none',
                  transition: 'all var(--dur-base) var(--ease-out)',
                }}
              />
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    right: 'calc(100% + 4px)',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-2xs)',
                    letterSpacing: 'var(--tracking-caps)',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
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
