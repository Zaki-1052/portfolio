// src/scales/code/CodeContent.tsx
import { ScaleSection } from '@/components/ScaleSection';
import { TerminalListing, type TerminalRow } from '@/scales/code/TerminalListing';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection, getProjects } from '@/content/loader';

function FeaturedProject({ name, line, href }: { name: string; line: string; href?: string }) {
  const content = (
    <div
      className="featured-block"
      style={{
        border: '1px solid var(--hairline)',
        borderRadius: 0,
        padding: 'var(--space-4)',
        background: 'var(--surface-deep)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          color: 'var(--accent)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <span style={{ color: 'var(--text-faint)' }}>$ </span>cat {name}/README.md
      </div>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-body)',
          lineHeight: 'var(--leading-normal)',
        }}
      >
        {line}
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'block', textDecoration: 'none' }}
      >
        {content}
      </a>
    );
  }
  return content;
}

export function CodeContent() {
  const section = getSection('code');
  const { tier1, tier2 } = getProjects();

  const featuredSoftware = tier1.filter((p) => p.scale === 'code');

  const terminalItems: TerminalRow[] = tier2.map((p) => ({
    name: p.title,
    description: p.oneLiner,
    stars: p.stars,
    href: p.links.github,
  }));

  return (
    <ScaleSection scale="code" title={section?.frontmatter.title} kicker="the sequence level">
      {section && <MarkdownRenderer content={section.body} className="prose" />}

      <div
        className="featured-grid"
        style={{
          marginTop: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {featuredSoftware.map((p) => (
          <FeaturedProject key={p.id} name={p.id} line={p.oneLiner} href={p.links.github} />
        ))}
      </div>

      <TerminalListing cwd="~/projects" items={terminalItems} />
    </ScaleSection>
  );
}
