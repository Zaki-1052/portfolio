// src/components/ScaleSection.tsx
import type { ReactNode, CSSProperties } from 'react';
import type { ScaleName } from '@/stores/depth';

interface ScaleSectionProps {
  scale: ScaleName;
  magnification?: string;
  title?: string;
  kicker?: string;
  children: ReactNode;
  full?: boolean;
  align?: 'left' | 'center';
  className?: string;
  id?: string;
  style?: CSSProperties;
}

export function ScaleSection({
  scale,
  magnification,
  title,
  kicker,
  children,
  full = false,
  align = 'left',
  className,
  id,
  style,
}: ScaleSectionProps) {
  return (
    <section
      id={id ?? scale}
      data-scale={scale}
      className={className}
      style={{
        position: 'relative',
        background: 'var(--bg)',
        color: 'var(--text-body)',
        minHeight: full ? '100vh' : 'auto',
        padding: 'var(--section-pad-y) var(--gutter)',
        transition: 'background var(--dur-slow) var(--ease-in-out)',
        ...style,
      }}
    >
      <div
        style={{
          maxWidth: 'min(1080px, 100%)',
          margin: align === 'center' ? '0 auto' : '0',
          textAlign: align,
        }}
      >
        {(scale || magnification) && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-2xs)',
              letterSpacing: 'var(--tracking-caps)',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent)',
                boxShadow: 'var(--glow-accent)',
              }}
            />
            <span>
              {scale}
              {magnification ? ` · ${magnification}` : ''}
            </span>
          </div>
        )}

        {kicker && (
          <p
            style={{
              margin: '0 0 var(--space-2)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              letterSpacing: '0.02em',
            }}
          >
            {kicker}
          </p>
        )}

        {title && (
          <h2
            style={{
              margin: '0 0 var(--space-6)',
              fontSize: 'var(--text-3xl)',
              maxWidth: '20ch',
            }}
          >
            {title}
          </h2>
        )}

        {children}
      </div>
    </section>
  );
}
