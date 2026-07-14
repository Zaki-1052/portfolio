// src/scales/expression/ExpressionContent.tsx
// The last band's content, in two registers (the CodeContent shape):
//   · WebGL active — the band is scene-native: the expression runways pace
//     the signal-origin scene's arrival/plateau/closing beats, and the real
//     interface is the scene-anchored annotation layer (ExpressionIntro +
//     ExpressionAnnotations mount beside the runways in Stage C). The
//     document register below is display:none'd (globals.css).
//   · No WebGL — the runways collapse and the full document register
//     renders: prose, contact links, and the mail trigger. Unchanged
//     Phase-1 output.
// The mail overlay is shared chrome for BOTH registers (and, later, the
// scene-native `% mail zara` prompt), so it lives OUTSIDE .expression-doc
// and its open state lives in useSignalFocusStore — one field, three
// triggers, one dialog.
import { ScaleBadge, ScaleSection } from '@/components/ScaleSection';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection, getLinks } from '@/content/loader';
import { useReveal } from '@/hooks/useReveal';
import { useSignalFocusStore } from '@/stores/signal-focus';
import { TerminalMail } from './TerminalMail';
import { ExpressionIntro } from './ExpressionIntro';
import { ExpressionAnnotations } from './ExpressionAnnotations';

// Module-stable (TerminalMail keys its success effect on this identity —
// a per-render arrow would refire the spark on unrelated re-renders).
const fireSpark = (): void => {
  useSignalFocusStore.getState().fireSubmitSpark();
};

export function ExpressionContent() {
  const section = getSection('expression');
  const links = getLinks();
  const mailOpen = useSignalFocusStore((s) => s.mailOpen);
  const setMailOpen = useSignalFocusStore((s) => s.setMailOpen);
  const contactRef = useReveal<HTMLElement>();

  const allLinks = [
    { k: 'email', v: links.email, href: `mailto:${links.email}` },
    ...links.socials.map((s) => ({ k: s.name.toLowerCase(), v: s.display, href: s.url })),
    ...links.external.map((e) => ({ k: e.name.toLowerCase(), v: e.display, href: e.url })),
  ];

  return (
    // hideBadge: the floating scale badge reads as a document artifact over
    // the scene-native band (code precedent); the fallback document keeps
    // its own badge below.
    <ScaleSection scale="expression" hideBadge>
      {/* Scene-native runways — heights pace the whole band's scroll length
          (globals.css Scroll runways block); the per-beat depths live in
          expression-beats.ts. They only take space when the Canvas owns the
          band. */}
      <div className="expression-runway expression-runway--arrival" aria-hidden="true" />
      <div className="expression-runway expression-runway--plateau" aria-hidden="true" />
      <div className="expression-runway expression-runway--closing" aria-hidden="true" />
      <ExpressionIntro />
      <ExpressionAnnotations />

      <div className="expression-doc">
        <ScaleBadge scale="expression" />
        <p className="expression-doc__kicker">surface, again</p>
        <h2 className="expression-doc__title">{section?.frontmatter.title ?? 'Contact'}</h2>
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
          <div>{section && <MarkdownRenderer content={section.body} className="prose" />}</div>

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
      </div>
      <TerminalMail open={mailOpen} onClose={() => setMailOpen(false)} onSuccess={fireSpark} />
    </ScaleSection>
  );
}
