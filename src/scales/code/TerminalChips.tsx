// src/scales/code/TerminalChips.tsx
// zsh menu-select completion chips under the live prompt — THE toolkit
// affordance (revised 2026-07-14 second pass: the toolkit never appears in
// the ls listing; it lives in the hidden ~/.toolkit, invisible to the
// no--a boot listing). Each chip is a plain document — `[languages.txt]`
// — and tapping one completes `less ~/.toolkit/languages.txt` and opens
// the split-pane card. Real <button>s; the inverse-video highlight is
// :focus-visible / :hover driven so keyboard and pointer share one visual.
import { useMemo, type CSSProperties } from 'react';
import { getToolkit } from '@/content/loader';
import { TERMINAL_BEAT_DEFAULTS, liveTerminalBeatParams } from './terminal-beats';
import { terminalToolkitItems } from './terminal-rows';
import { openProjectFromRow, setHoveredRow } from './terminal-actions';

export function TerminalChips() {
  const items = useMemo(() => terminalToolkitItems(getToolkit()), []);
  const p = import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;

  return (
    <div
      className="term-chips term-print"
      style={{ '--print-delay': `${p.outputPrintMs + 340}ms` } as CSSProperties}
      role="group"
      aria-label="Open a toolkit entry"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="term-chip"
          onClick={() => openProjectFromRow(item.id)}
          onMouseEnter={() => setHoveredRow(item.id)}
          onMouseLeave={() => setHoveredRow(null)}
          onFocus={() => setHoveredRow(item.id)}
          onBlur={() => setHoveredRow(null)}
        >
          [{item.label}]
        </button>
      ))}
    </div>
  );
}
