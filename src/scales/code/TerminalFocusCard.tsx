// src/scales/code/TerminalFocusCard.tsx
// The band's focus card (§3.8, revised 2026-07-14 second pass): on desktop
// the terminal body SPLITS tmux-style (listing stays left, this card docks
// right behind a 1px hairline — the typed less command stays visible at the
// prompt); on narrow viewports it fills the body (the pager /
// alternate-screen fallback). Pure CSS decides which — one DOM.
// Two card flavors from one openProject id:
//   · a TOOLKIT chip — `less ~/.toolkit/<key>.txt`: key, blurb, stack
//     chips from its value;
//   · a tier-2 PROJECT row — `less <id>/README.md`: title, one-liner, the
//     gold badge as a bracket chip, and the GitHub link AFTER the
//     description. No bullet points anywhere — one-liners carry the copy.
// (The two main projects don't open cards — they expand in the listing.)
// Non-modal role="region"; focus moves in on open and back to the opener on
// close (the TerminalMail discipline). Close paths: q, Esc, ✕, and
// scroll-away — CodeWindowFrame runs the release delta every frame.
import { useEffect, useMemo, useRef } from 'react';
import { getProjects, getToolkit } from '@/content/loader';
import { useDepthStore } from '@/stores/depth';
import { useTerminalFocusStore } from '@/stores/terminal-focus';
import { trapFocus } from '@/utils/focus-trap';
import {
  terminalProjectRows,
  terminalToolkitItems,
  type TerminalProjectRow,
  type TerminalToolkitItem,
} from './terminal-rows';

function closeCard(): void {
  const store = useTerminalFocusStore.getState();
  store.setOpenProject(null, useDepthStore.getState().depth);
}

function splitStack(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function formatStars(n: number): string {
  return n >= 1000 ? n.toLocaleString() : String(n);
}

export function TerminalFocusCard() {
  const openProject = useTerminalFocusStore((s) => s.openProject);
  const regionRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const byId = useMemo(() => {
    const map = new Map<string, TerminalToolkitItem | TerminalProjectRow>();
    for (const item of terminalToolkitItems(getToolkit())) map.set(item.id, item);
    for (const row of terminalProjectRows(getProjects().tier2)) map.set(row.id, row);
    return map;
  }, []);

  // Focus in on open, restored to the opening row/chip on close.
  useEffect(() => {
    if (openProject !== null) {
      openerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => regionRef.current?.focus());
    } else if (openerRef.current) {
      openerRef.current.focus();
      openerRef.current = null;
    }
  }, [openProject]);

  // q / Esc close (the less keys); Tab cycles inside while open.
  useEffect(() => {
    if (openProject === null) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'q' || e.key === 'Escape') {
        e.preventDefault();
        closeCard();
        return;
      }
      if (e.key === 'Tab') trapFocus(e, regionRef.current);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openProject]);

  const item = openProject !== null ? byId.get(openProject) : undefined;
  if (!item) return null;

  const title = item.kind === 'toolkit' ? item.entry.key : item.title;
  const badge =
    item.kind === 'project'
      ? item.stars
        ? `★ ${formatStars(item.stars)}`
        : (item.metric ?? '')
      : '';
  const statusPath = item.kind === 'toolkit' ? `~/.toolkit/${item.id}.txt` : `${item.id}/README.md`;

  return (
    <div
      ref={regionRef}
      className="term-card"
      role="region"
      aria-label={`${title} — README`}
      tabIndex={-1}
    >
      <button type="button" className="term-card__close" onClick={closeCard} aria-label="Close (q)">
        ✕
      </button>
      <div className="term-card__doc">
        <h3 className="term-card__title">{title}</h3>
        <p className="term-card__oneliner">
          {item.kind === 'toolkit' ? (item.entry.blurb ?? item.entry.value) : item.oneLiner}
        </p>
        <div
          className="term-card__tags"
          aria-label={item.kind === 'toolkit' ? 'Contents' : 'Badges'}
        >
          {item.kind === 'toolkit' ? (
            splitStack(item.entry.value).map((chip) => (
              <span key={chip} className="term-card__tag">
                [{chip}]
              </span>
            ))
          ) : badge ? (
            <span className="term-card__tag term-card__tag--gold">[{badge}]</span>
          ) : null}
        </div>
        {item.kind === 'project' && (
          <a
            className="term-card__link"
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub — opens in a new tab"
          >
            → [GitHub <span aria-hidden="true">↗</span>]
          </a>
        )}
      </div>
      <div className="term-card__status" aria-hidden="true">
        {statusPath} (END) — q to close
      </div>
    </div>
  );
}
