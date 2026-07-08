// src/scales/chromatin/ChromatinContent.tsx
// The third band's content, in two registers:
//   · WebGL active — the band is scene-native: named scroll runways give the
//     coil its arrival and index beats, and the ONLY visible content is the
//     CoilIntro overlay and the CoilAnnotations publication labels pinned to
//     the region loci. The document version below is display:none'd
//     (globals.css).
//   · No WebGL — the runways collapse and the full document version renders:
//     kicker/title/prose and the publication list.
// Both registers drive the SAME focus store (labels here, region beads in
// the harnesses), so the two can never disagree.
import { ScaleBadge, ScaleSection } from '@/components/ScaleSection';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection, getPublications } from '@/content/loader';
import { useReveal } from '@/hooks/useReveal';
import { CoilAnnotations } from './CoilAnnotations';
import { CoilIntro } from './CoilIntro';

export function ChromatinContent() {
  const section = getSection('chromatin');
  const { publications } = getPublications();
  const pubsRef = useReveal<HTMLDivElement>();

  return (
    // hideBadge: the floating scale badge reads as a document artifact over
    // the scene-native band — the depth indicator already carries the scale
    // identity there; the fallback document keeps its own badge below.
    <ScaleSection scale="chromatin" hideBadge>
      {/* Scene-native runways — heights are TUNED AGAINST THE CAMERA TIMING
          (globals.css Scroll runways block); they only take space when the
          Canvas owns the band. */}
      <div className="coil-runway coil-runway--arrival" aria-hidden="true" />
      <div className="coil-runway coil-runway--index" aria-hidden="true" />
      <CoilIntro />
      <CoilAnnotations />

      <div className="chromatin-doc">
        <ScaleBadge scale="chromatin" magnification="10,000×" />
        <p className="chromatin-doc__kicker">the regulation layer</p>
        <h2 className="chromatin-doc__title">{section?.frontmatter.title ?? 'Publications'}</h2>
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
            <article key={pub.id} className="publication">
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
      </div>
    </ScaleSection>
  );
}
