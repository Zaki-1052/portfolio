// src/scales/code/TerminalInteractiveListing.tsx
// The `ls -lht` output as the band's annotation system (§3.5, revised
// 2026-07-14 second pass): PROJECTS ONLY, every row a directory with its
// trailing slash (no symlink arrows, no .txt — the toolkit lives in the
// chips), honest columns (perms · size · date · name · gold badge), every
// row a REAL control:
//   · the two MAIN projects EXPAND IN PLACE — the one-liner types out
//     beneath the row, the GitHub link after the description;
//   · the tier-2 projects open the split-pane focus card via the typed
//     `less` completion.
// The inverse-video selection bar rides :hover / :focus-visible in CSS —
// DOM focus IS the selection state. Print reveal is pure CSS transition
// stagger keyed off the body's [data-booted] attribute; rewinding clears
// instantly.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { gsap } from 'gsap';
import { getProjects } from '@/content/loader';
import { useMotionStore } from '@/stores/motion';
import { TERMINAL_BEAT_DEFAULTS, liveTerminalBeatParams } from './terminal-beats';
import { tapCommandCharsAt } from './terminal-output';
import {
  terminalSessionRows,
  type TerminalMainRow,
  type TerminalSessionRow,
} from './terminal-rows';
import { notifyExternalOpened, openProjectFromRow, setHoveredRow } from './terminal-actions';

function formatStars(n: number): string {
  return n >= 1000 ? n.toLocaleString() : String(n);
}

function rowBadge(row: TerminalSessionRow): string {
  if (row.stars) return `★ ${formatStars(row.stars)}`;
  if (row.metric) return row.metric;
  return '';
}

/** Duration of the expansion's typed one-liner (time-driven — a response to
 *  the visitor, not to scroll). */
const EXPAND_TYPE_MS = 420;

/** The main-project expansion, sequenced like a real session: the
 *  description TYPES out first, and only when it lands does the GitHub link
 *  print beneath it (Zara's rule: the link comes after the description).
 *  The URL is a real anchor; the row itself only toggles. */
function TerminalRowExpand({ row }: { row: TerminalMainRow }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return undefined;
    if (useMotionStore.getState().reduced || row.oneLiner.length === 0) {
      el.textContent = row.oneLiner;
      setTyped(true);
      return undefined;
    }
    const startedAt = performance.now();
    const tick = (): void => {
      const chars = tapCommandCharsAt(row.oneLiner, performance.now() - startedAt, EXPAND_TYPE_MS);
      const text = row.oneLiner.slice(0, chars);
      if (el.textContent !== text) el.textContent = text;
      if (chars >= row.oneLiner.length) {
        gsap.ticker.remove(tick);
        setTyped(true);
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [row]);

  const href = row.project.links.github;
  return (
    <div className="term-row-expand">
      <span ref={textRef} className="term-row-expand__desc" />
      {href && typed && (
        <a
          className="term-row-expand__target"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${row.project.title} on GitHub — opens in a new tab`}
          onClick={() => notifyExternalOpened(row.id)}
        >
          {`-> ${href.replace(/^https?:\/\//, '')}`} <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  );
}

export function TerminalInteractiveListing() {
  const [rows] = useState(() => terminalSessionRows(getProjects()));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Stagger step across total-line + rows (render-time read is fine: the
  // count is fixed and the ms value is a dev-tuned constant).
  const p = import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;
  const step = p.outputPrintMs / (rows.length + 1);

  return (
    <div className="term-listing" role="group" aria-label={`${rows.length} projects`}>
      <div
        className="term-line term-print"
        style={{ '--print-delay': '0ms' } as CSSProperties}
        aria-hidden="true"
      >
        total {rows.length}
      </div>
      <ul className="term-rows">
        {rows.map((row, i) => {
          const delayStyle = {
            '--print-delay': `${Math.round((i + 1) * step)}ms`,
          } as CSSProperties;
          const expanded = row.kind === 'main' && expandedId === row.id;
          const inner = (
            <>
              <span className="term-row__perms">{row.perms}</span>
              <span className="term-row__size">{row.size}</span>
              <span className="term-row__date">{row.date}</span>
              <span className="term-row__name">{row.label}</span>
              <span className="term-row__badge">{rowBadge(row)}</span>
            </>
          );
          return (
            <li key={row.id} className="term-print" style={delayStyle}>
              {row.kind === 'main' ? (
                <button
                  type="button"
                  className="term-row"
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : row.id)}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onFocus={() => setHoveredRow(row.id)}
                  onBlur={() => setHoveredRow(null)}
                >
                  {inner}
                </button>
              ) : (
                <button
                  type="button"
                  className="term-row"
                  onClick={() => openProjectFromRow(row.id)}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onFocus={() => setHoveredRow(row.id)}
                  onBlur={() => setHoveredRow(null)}
                >
                  {inner}
                </button>
              )}
              {expanded && row.kind === 'main' && <TerminalRowExpand row={row} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
