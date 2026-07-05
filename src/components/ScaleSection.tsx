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
  maxWidth?: string;
  className?: string;
  id?: string;
  style?: CSSProperties;
  /** Suppress the section-level badge so a child can place it itself (the
   *  tissue hero pulls it inside its legibility scrim). */
  hideBadge?: boolean;
}

/** The scale badge (accent dot + "scale · magnification"). Exported so a
 *  section child can re-home it — e.g. inside the hero's content scrim, where
 *  it stays readable over the bright 3D surface. Text color is overridable
 *  via --badge-color (the scrim lifts it toward white). */
export function ScaleBadge({ scale, magnification }: { scale: string; magnification?: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-2xs)',
        letterSpacing: 'var(--tracking-caps)',
        textTransform: 'uppercase',
        color: 'var(--badge-color, var(--text-muted))',
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
  );
}

export function ScaleSection({
  scale,
  magnification,
  title,
  kicker,
  children,
  full = false,
  align = 'left',
  maxWidth,
  className,
  id,
  style,
  hideBadge = false,
}: ScaleSectionProps) {
  return (
    <section
      id={id ?? scale}
      data-scale={scale}
      className={className}
      style={{
        position: 'relative',
        // --section-bg lets the WebGL reveal (globals.css) turn a section
        // transparent to show the Canvas, while --bg stays a real color for
        // scrims/surfaces. Defaults to --bg when the reveal isn't active.
        background: 'var(--section-bg, var(--bg))',
        color: 'var(--text-body)',
        minHeight: full ? '100vh' : 'auto',
        padding: 'var(--section-pad-y) var(--gutter)',
        transition: 'background var(--dur-slow) var(--ease-in-out)',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: maxWidth ?? 'min(1080px, 100%)',
          margin: align === 'center' ? '0 auto' : '0',
          textAlign: align,
        }}
      >
        {!hideBadge && <ScaleBadge scale={scale} magnification={magnification} />}

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
