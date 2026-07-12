// src/scales/code/TerminalInteractiveListing.tsx
// The `ls -la` output as the band's annotation system (§3.5 — hyperlinked
// output, the OSC 8 idiom): every row is a REAL control. Directories are
// <button>s that open the in-terminal pager; symlinks are <a target=_blank>
// whose `->` announces "external" before anyone taps. The inverse-video
// selection bar rides :hover / :focus-visible in CSS — DOM focus IS the
// selection state (no store index). Print reveal is pure CSS transition
// stagger keyed off the body's [data-booted] attribute (the event clock);
// rewinding clears instantly.
import { useMemo, type CSSProperties } from 'react';
import { getProjects } from '@/content/loader';
import { TERMINAL_BEAT_DEFAULTS, liveTerminalBeatParams } from './terminal-beats';
import { terminalSessionRows, type TerminalSessionRow } from './terminal-rows';
import { notifySymlinkOpened, openProjectFromRow, setHoveredRow } from './terminal-actions';

function formatStars(n: number): string {
  return n >= 1000 ? n.toLocaleString() : String(n);
}

function rowBadge(row: TerminalSessionRow): string {
  if (row.kind === 'symlink') {
    if (row.stars) return `★ ${formatStars(row.stars)}`;
    if (row.metric) return row.metric;
  }
  return '';
}

export function TerminalInteractiveListing() {
  const rows = useMemo(() => terminalSessionRows(getProjects()), []);
  // Stagger step across total-line + rows + live prompt (render-time read is
  // fine: the count is fixed and the ms value is a dev-tuned constant).
  const p = import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;
  const step = p.outputPrintMs / (rows.length + 2);

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
          const inner = (
            <>
              <span className="term-row__perms">{row.perms}</span>
              <span className="term-row__main">
                <span className="term-row__name">{row.label}</span>
                {row.oneLiner && <span className="term-row__desc">{row.oneLiner}</span>}
              </span>
              <span className="term-row__badge">{rowBadge(row)}</span>
            </>
          );
          return (
            <li key={row.id} className="term-print" style={delayStyle}>
              {row.kind === 'dir' ? (
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
              ) : (
                <a
                  className="term-row"
                  href={row.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${row.id} — opens GitHub in a new tab`}
                  onClick={() => notifySymlinkOpened(row.id)}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onFocus={() => setHoveredRow(row.id)}
                  onBlur={() => setHoveredRow(null)}
                >
                  {inner}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
