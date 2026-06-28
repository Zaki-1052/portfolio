// src/scales/expression/ExpressionContent.tsx
import { useState } from 'react';
import { ScaleSection } from '@/components/ScaleSection';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection, getLinks, getToolkit } from '@/content/loader';
import { useReveal } from '@/hooks/useReveal';
import { TerminalMail } from './TerminalMail';

export function ExpressionContent() {
  const section = getSection('expression');
  const links = getLinks();
  const toolkit = getToolkit();
  const [expandedBlurb, setExpandedBlurb] = useState<string | null>(null);
  const [mailOpen, setMailOpen] = useState(false);
  const contactRef = useReveal<HTMLElement>();

  const allLinks = [
    { k: 'email', v: links.email, href: `mailto:${links.email}` },
    ...links.socials.map((s) => ({ k: s.name.toLowerCase(), v: s.display, href: s.url })),
    ...links.external.map((e) => ({ k: e.name.toLowerCase(), v: e.display, href: e.url })),
  ];

  return (
    <ScaleSection scale="expression" title={section?.frontmatter.title} kicker="surface, again">
      <div style={{ position: 'relative' }}>
        <img
          src="/favicon.svg"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 'calc(-1 * var(--space-8))',
            right: 0,
            width: 60,
            height: 60,
            opacity: 0.4,
          }}
        />
      </div>
      <div className="content-grid content-grid--equal">
        <div>
          {section && <MarkdownRenderer content={section.body} className="prose" />}

          <details className="toolkit">
            <summary>
              <span style={{ color: 'var(--text-faint)' }}>$ </span>
              <span style={{ color: 'var(--accent)' }}>cat</span> ~/.toolkit
            </summary>
            <div className="toolkit__body">
              {toolkit.map((entry) => (
                <div key={entry.key} className="toolkit__group">
                  <div
                    className="toolkit__key"
                    data-has-blurb={entry.blurb ? '' : undefined}
                    onClick={entry.blurb ? () => setExpandedBlurb(entry.key) : undefined}
                  >
                    {entry.key}
                  </div>
                  <div className="toolkit__val">{entry.value}</div>
                </div>
              ))}
            </div>
          </details>
        </div>

        <div>
          <nav ref={contactRef} className="contact-links reveal" aria-label="Contact">
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
          <button
            className="contact-row mail-trigger"
            onClick={() => setMailOpen(true)}
            aria-haspopup="dialog"
          >
            <span className="k">
              <span style={{ color: 'var(--text-faint)' }}>$ </span>
              <span style={{ color: 'var(--accent)' }}>mail</span> zara
            </span>
            <span className="v" style={{ color: 'var(--text-faint)' }}>
              send a message
            </span>
          </button>
        </div>
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
        <a
          href="https://github.com/Zaki-1052/portfolio"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          <span style={{ color: 'var(--accent)' }}>~</span>
          <span style={{ color: 'var(--text-faint)', margin: '0 var(--space-1)' }}>/</span>
          <span>zalibhai.com</span>
        </a>
      </div>
      <TerminalMail open={mailOpen} onClose={() => setMailOpen(false)} />
      {expandedBlurb &&
        (() => {
          const entry = toolkit.find((t) => t.key === expandedBlurb);
          if (!entry?.blurb) return null;
          return (
            <div className="holo-overlay" onClick={() => setExpandedBlurb(null)}>
              <div className="holo-popup" onClick={(e) => e.stopPropagation()}>
                <button className="holo-popup__close" onClick={() => setExpandedBlurb(null)}>
                  esc
                </button>
                <div className="holo-popup__header">{entry.key}</div>
                <div className="holo-popup__body">{entry.blurb}</div>
              </div>
            </div>
          );
        })()}
    </ScaleSection>
  );
}
