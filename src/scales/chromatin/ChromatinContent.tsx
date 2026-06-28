// src/scales/chromatin/ChromatinContent.tsx
import { ScaleSection } from '@/components/ScaleSection';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection, getPublications } from '@/content/loader';
import { useReveal } from '@/hooks/useReveal';

export function ChromatinContent() {
  const section = getSection('chromatin');
  const { publications } = getPublications();
  const pubsRef = useReveal<HTMLDivElement>();

  return (
    <ScaleSection
      scale="chromatin"
      magnification="10,000×"
      title={section?.frontmatter.title}
      kicker="the regulation layer"
    >
      {section && <MarkdownRenderer content={section.body} className="prose" />}

      <div
        ref={pubsRef}
        className="reveal"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          maxWidth: 'var(--measure)',
          marginTop: 'var(--space-7)',
        }}
      >
        {publications.map((pub) => (
          <article
            key={pub.id}
            className="publication"
            style={{
              borderLeft: '1px solid var(--accent-line)',
              padding: 'var(--space-4) var(--space-4) var(--space-4) var(--space-5)',
              borderRadius: 'var(--radius-sharp)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--accent)',
                marginBottom: 'var(--space-2)',
                letterSpacing: '0.03em',
              }}
            >
              {pub.status} · {pub.year}
            </div>
            <h3
              style={{
                margin: '0 0 var(--space-3)',
                fontSize: 'var(--text-lg)',
                color: 'var(--text-strong)',
                maxWidth: '40ch',
              }}
            >
              {pub.title}
            </h3>
            <p
              style={{
                margin: '0 0 var(--space-3)',
                color: 'var(--text-body)',
                lineHeight: 'var(--leading-normal)',
              }}
            >
              {pub.description}
            </p>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
              }}
            >
              {pub.venue}
            </div>
          </article>
        ))}
      </div>
    </ScaleSection>
  );
}
