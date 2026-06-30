// src/scales/tissue/TissueContent.tsx
import { useMemo } from 'react';
import { ScaleSection } from '@/components/ScaleSection';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection, getStatus } from '@/content/loader';
import { useGlitchCycle } from '@/hooks/useGlitchCycle';

const ROLES = [
  'bioinformatics',
  'computational biology',
  'epigenomics research',
  'full-stack development',
];

export function TissueContent() {
  const section = getSection('tissue');
  const status = getStatus();
  const roles = useMemo(() => ROLES, []);
  const role = useGlitchCycle(roles);

  return (
    <ScaleSection
      scale="tissue"
      magnification="1×"
      full
      maxWidth="min(1400px, 100%)"
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-8)',
          width: '100%',
        }}
      >
        <div style={{ maxWidth: 760, flex: 1 }}>
          <p
            style={{
              margin: '0 0 var(--space-3)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-md)',
              letterSpacing: '0.02em',
            }}
          >
            {role} @ UCSD
          </p>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'var(--text-5xl)',
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              margin: '0 0 var(--space-5)',
              maxWidth: '12ch',
            }}
          >
            {section?.frontmatter.title ?? 'Zara Alibhai'}
          </h1>

          {section && <MarkdownRenderer content={section.body} className="prose" />}

          <div
            style={{
              marginTop: 'var(--space-6)',
              padding: 'var(--space-4) var(--space-5)',
              border: 'none',
              borderLeft: '2px solid var(--accent-line)',
              borderRadius: 'var(--radius-sharp)',
              background: 'var(--surface-overlay)',
              boxShadow: 'var(--glow-accent)',
              maxWidth: 540,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-faint)',
                marginBottom: 6,
                letterSpacing: '0.04em',
              }}
            >
              currently
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-body)',
              }}
            >
              {status.status}
            </div>
          </div>

          <div className="scroll-hint">
            descend <span aria-hidden="true">↓</span>
          </div>
        </div>

        <div
          className="pfp"
          style={{
            flexShrink: 0,
            width: 420,
            height: 420,
            borderRadius: 16,
            overflow: 'hidden',
            border: '2px solid var(--accent-line)',
            boxShadow: 'var(--glow-accent)',
          }}
        >
          <img
            src="/pfp.png"
            alt="Zara Alibhai"
            width={420}
            height={420}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      </div>
    </ScaleSection>
  );
}
