// src/scales/protein/ProteinContent.tsx
import { ScaleSection } from '@/components/ScaleSection';
import { Tag } from '@/components/Tag';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection } from '@/content/loader';

function StatusRow({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        alignItems: 'baseline',
        borderBottom: '1px solid var(--hairline-soft)',
        paddingBottom: 'var(--space-2)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-faint)',
        }}
      >
        {k}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-body)',
          textAlign: 'right',
        }}
      >
        {v}
      </span>
    </div>
  );
}

export function ProteinContent() {
  const section = getSection('protein');

  return (
    <ScaleSection
      scale="protein"
      magnification="1,000,000×"
      title={section?.frontmatter.title}
      kicker="structural biology, lately"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 'var(--space-7)',
          alignItems: 'start',
        }}
      >
        {section && <MarkdownRenderer content={section.body} className="prose" />}

        <aside
          style={{
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius)',
            padding: 'var(--space-5)',
            background: 'var(--surface-raised)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-faint)',
              marginBottom: 'var(--space-3)',
              letterSpacing: '0.04em',
            }}
          >
            trajectory · status
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <StatusRow k="system" v="postsynaptic membrane protein" />
            <StatusRow k="lab" v="Amaro Lab, UCSD" />
            <StatusRow k="state" v="first trajectory running" />
            <StatusRow k="compute" v="SDSC Expanse (SLURM)" />
          </div>
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              flexWrap: 'wrap',
              marginTop: 'var(--space-4)',
            }}
          >
            <Tag tone="accent">MD</Tag>
            <Tag>GROMACS</Tag>
            <Tag>membrane</Tag>
          </div>
        </aside>
      </div>
    </ScaleSection>
  );
}
