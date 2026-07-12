// src/scales/code/TerminalChips.tsx
// zsh menu-select completion chips under the live prompt — `[cleave/]
// [metaencode/]`, tier-1 DIRECTORIES only (§3.6: chips mean "readable
// here"; symlinks are reachable only via their rows — two affordances, one
// mental model). Tapping a chip is identical to tapping its directory row.
// Real <button>s; the inverse-video highlight is :focus-visible / :hover
// driven so keyboard and pointer share one visual.
import { useMemo, type CSSProperties } from 'react';
import { getProjects } from '@/content/loader';
import { TERMINAL_BEAT_DEFAULTS, liveTerminalBeatParams } from './terminal-beats';
import { terminalDirRows } from './terminal-rows';
import { openProjectFromRow, setHoveredRow } from './terminal-actions';

export function TerminalChips() {
  const dirs = useMemo(() => terminalDirRows(getProjects().tier1), []);
  const p = import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;

  return (
    <div
      className="term-chips term-print"
      style={{ '--print-delay': `${p.outputPrintMs + 60}ms` } as CSSProperties}
      role="group"
      aria-label="Open a project"
    >
      {dirs.map((dir) => (
        <button
          key={dir.id}
          type="button"
          className="term-chip"
          onClick={() => openProjectFromRow(dir.id)}
          onMouseEnter={() => setHoveredRow(dir.id)}
          onMouseLeave={() => setHoveredRow(null)}
          onFocus={() => setHoveredRow(dir.id)}
          onBlur={() => setHoveredRow(null)}
        >
          [{dir.label}]
        </button>
      ))}
    </div>
  );
}
