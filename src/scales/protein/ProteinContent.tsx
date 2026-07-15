// src/scales/protein/ProteinContent.tsx
// The fourth band's content, in two registers:
//   · WebGL active — the band is scene-native: scroll runways give the
//     receptor its arrival and index beats, and the ONLY visible content
//     will be the ProteinIntro overlay and ProteinAnnotations labels pinned
//     to the scene (added in Session 4+). The document version below is
//     display:none'd (globals.css).
//   · No WebGL — the runways collapse and the full document version renders:
//     kicker/title/prose and the status sidebar.
import { ScaleBadge, ScaleSection } from '@/components/ScaleSection';
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
    <ScaleSection scale="protein" hideBadge>
      {/* Scene-native runways — heights are TUNED AGAINST THE CAMERA TIMING
          (globals.css Scroll runways block); they only take space when the
          Canvas owns the band. */}
      <div className="protein-runway protein-runway--arrival" aria-hidden="true" />
      <div className="protein-runway protein-runway--index" aria-hidden="true" />
      {/* ProteinIntro and ProteinAnnotations mount here in Session 4+ */}

      <div className="protein-doc">
        <ScaleBadge scale="protein" magnification="1,000,000×" />
        <p className="protein-doc__kicker">structural biology, lately</p>
        <h2 className="protein-doc__title">{section?.frontmatter.title ?? 'Molecular Dynamics'}</h2>
        {section && <MarkdownRenderer content={section.body} className="prose" />}

        <aside
          style={{
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius)',
            padding: 'var(--space-5)',
            background: 'var(--surface-raised)',
            marginTop: 'var(--space-7)',
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
            <StatusRow k="system" v="post-synaptic CNS membrane protein" />
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
            <Tag>AMBER</Tag>
            <Tag>membrane</Tag>
          </div>
        </aside>
      </div>
    </ScaleSection>
  );
}
