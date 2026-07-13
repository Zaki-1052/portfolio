// src/scales/code/CodeContent.tsx
// The fifth band's content, in two registers (the ChromatinContent shape):
//   · WebGL active — the band is scene-native: the code runways pace the
//     terminal's arrival/plateau/exit beats, and the real interface is the
//     scene-native terminal window (TerminalWindowContent mounts beside the
//     runways in Stage C). The document register below is display:none'd
//     (globals.css).
//   · No WebGL — the runways collapse and the full document register renders:
//     kicker/title/prose, the featured software cards, and the static
//     listing. Unchanged Phase-1 output.
import { useState } from 'react';
import { ScaleBadge, ScaleSection } from '@/components/ScaleSection';
import { TerminalListing, type TerminalRow } from '@/scales/code/TerminalListing';
import { TerminalWindowContent } from '@/scales/code/TerminalWindowContent';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection, getProjects, getToolkit } from '@/content/loader';
import { useReveal } from '@/hooks/useReveal';

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
  const toolkit = getToolkit();
  const [expandedBlurb, setExpandedBlurb] = useState<string | null>(null);
  const featuredRef = useReveal<HTMLDivElement>();
  const terminalRef = useReveal<HTMLDivElement>();

  const featuredSoftware = tier1.filter((p) => p.scale === 'code');

  const terminalItems: TerminalRow[] = tier2.map((p) => ({
    name: p.title,
    description: p.oneLiner,
    stars: p.stars,
    metric: p.metric,
    href: p.links.github,
  }));

  return (
    // hideBadge: the floating scale badge reads as a document artifact over
    // the scene-native band — the depth indicator already carries the scale
    // identity there; the fallback document keeps its own badge below.
    <ScaleSection scale="code" hideBadge>
      {/* Scene-native runways — heights pace the whole band's scroll length
          (globals.css Scroll runways block); the per-beat depths live in
          terminal-beats.ts. They only take space when the Canvas owns the
          band. */}
      <div className="code-runway code-runway--arrival" aria-hidden="true" />
      <div className="code-runway code-runway--plateau" aria-hidden="true" />
      <div className="code-runway code-runway--exit" aria-hidden="true" />
      <TerminalWindowContent />

      <div className="code-doc">
        <ScaleBadge scale="code" />
        <p className="code-doc__kicker">the sequence level</p>
        <h2 className="code-doc__title">{section?.frontmatter.title ?? 'Software'}</h2>
        {section && <MarkdownRenderer content={section.body} className="prose" />}

        <div
          ref={featuredRef}
          className="featured-grid reveal"
          style={{
            marginTop: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
          }}
        >
          {featuredSoftware.map((p) => (
            <FeaturedProject key={p.id} name={p.id} line={p.oneLiner} href={p.links.github} />
          ))}
        </div>

        <div ref={terminalRef} className="reveal">
          <TerminalListing cwd="~/projects" items={terminalItems} />
        </div>

        {/* The toolkit (moved up from expression 2026-07-13 — the terminal
            is its native home; the scene-native register serves it as
            less-able directories, this is the no-WebGL twin). */}
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
