// src/scales/code/TerminalStatusBar.tsx
// The single bottom row inside the terminal body (vim/ranger idiom, §3.7).
// States, in priority order: symlink departure flash (`opening <id> ↗`,
// fading) → pager-owned (the pager renders its own `(END)` line, the bar
// stays quiet) → hovered/focused row detail (symlink target or README
// size) → the first-open hint, which retires permanently after the first
// open (coil first-focus precedent). Symlink targets surface HERE so the
// rows stay clean.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getProjects } from '@/content/loader';
import { useTerminalFocusStore } from '@/stores/terminal-focus';
import { subscribeTapEvents } from './terminal-actions';
import { terminalSessionRows, type TerminalSessionRow } from './terminal-rows';

const FLASH_MS = 1600;

function rowDetail(row: TerminalSessionRow): string {
  if (row.kind === 'symlink') {
    return `-> ${row.href.replace(/^https?:\/\//, '')}`;
  }
  const size = row.project.readmeSize ?? '';
  return `${row.id}/README.md${size ? ` · ${size}` : ''}`;
}

export function TerminalStatusBar() {
  const hoveredRow = useTerminalFocusStore((s) => s.hoveredRow);
  const hintRetired = useTerminalFocusStore((s) => s.hintRetired);
  const openProject = useTerminalFocusStore((s) => s.openProject);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);
  const rowsById = useMemo(() => {
    const map = new Map<string, TerminalSessionRow>();
    for (const row of terminalSessionRows(getProjects())) map.set(row.id, row);
    return map;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeTapEvents((e) => {
      if (e.kind !== 'symlink') return;
      setFlash(`opening ${e.id} ↗`);
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => {
        setFlash(null);
        flashTimer.current = null;
      }, FLASH_MS);
    });
    return () => {
      unsubscribe();
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    };
  }, []);

  if (flash !== null) {
    return (
      <div className="term-status-bar">
        <span className="term-status-bar__flash">{flash}</span>
      </div>
    );
  }

  // Pager open → the pager owns the bar (its `(END) — q to close` line
  // renders inside the pager region).
  if (openProject !== null) return <div className="term-status-bar" />;

  const hovered = hoveredRow !== null ? rowsById.get(hoveredRow) : undefined;
  return (
    <div className="term-status-bar">
      {hovered ? (
        <span className="term-status-bar__detail">{rowDetail(hovered)}</span>
      ) : !hintRetired ? (
        <span className="term-status-bar__hint">-- tap a project to open --</span>
      ) : null}
    </div>
  );
}
