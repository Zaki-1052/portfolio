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
import { ScaleBadge, ScaleSection } from '@/components/ScaleSection';
import { TerminalListing, type TerminalRow } from '@/scales/code/TerminalListing';
import { TerminalWindowContent } from '@/scales/code/TerminalWindowContent';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection, getProjects } from '@/content/loader';
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
      </div>
    </ScaleSection>
  );
}
