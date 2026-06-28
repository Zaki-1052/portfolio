// src/scales/expression/ExpressionContent.tsx
import { ScaleSection } from '@/components/ScaleSection';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection, getLinks } from '@/content/loader';

export function ExpressionContent() {
  const section = getSection('expression');
  const links = getLinks();

  const allLinks = [
    { k: 'email', v: links.email, href: `mailto:${links.email}` },
    ...links.socials.map((s) => ({ k: s.name.toLowerCase(), v: s.display, href: s.url })),
    ...links.external.map((e) => ({ k: e.name.toLowerCase(), v: e.display, href: e.url })),
  ];

  return (
    <ScaleSection scale="expression" title={section?.frontmatter.title} kicker="surface, again">
      <div className="content-grid content-grid--equal">
        {section && <MarkdownRenderer content={section.body} className="prose" />}

        <nav className="contact-links" aria-label="Contact">
          {allLinks.map((l) => (
            <a
              key={l.k}
              className="contact-row"
              href={l.href}
              target={l.href.startsWith('mailto:') ? undefined : '_blank'}
              rel={l.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
            >
              <span className="k">{l.k}</span>
              <span className="v">{l.v}</span>
            </a>
          ))}
        </nav>
      </div>

      <div
        style={{
          marginTop: 'var(--space-9)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          color: 'var(--text-faint)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
        }}
      >
        <span>zalibhai.com</span>
      </div>
    </ScaleSection>
  );
}
