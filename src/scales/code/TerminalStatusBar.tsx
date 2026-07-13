// src/scales/code/TerminalStatusBar.tsx
// The single bottom row inside the terminal body (vim/ranger idiom, §3.7).
// States, in priority order: external departure flash (`opening <id> ↗`,
// fading) → card-open (the card renders its own `(END)` line, the bar
// stays quiet) → hovered/focused row or chip detail (path + size, or the
// GitHub target) → the first-open hint, which retires permanently after
// the first open (coil first-focus precedent).
import { useEffect, useMemo, useRef, useState } from 'react';
import { getProjects, getToolkit } from '@/content/loader';
import { useTerminalFocusStore } from '@/stores/terminal-focus';
import { subscribeTapEvents } from './terminal-actions';
import {
  terminalSessionRows,
  terminalToolkitItems,
  type TerminalSessionRow,
  type TerminalToolkitItem,
} from './terminal-rows';

const FLASH_MS = 1600;

function detailFor(entry: TerminalSessionRow | TerminalToolkitItem): string {
  if (entry.kind === 'toolkit') return `~/.toolkit/${entry.id}.txt`;
  if (entry.kind === 'project') return `-> ${entry.href.replace(/^https?:\/\//, '')}`;
  return `${entry.label} · ${entry.size}`;
}

export function TerminalStatusBar() {
  const hoveredRow = useTerminalFocusStore((s) => s.hoveredRow);
  const hintRetired = useTerminalFocusStore((s) => s.hintRetired);
  const openProject = useTerminalFocusStore((s) => s.openProject);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);
  const byId = useMemo(() => {
    const map = new Map<string, TerminalSessionRow | TerminalToolkitItem>();
    for (const row of terminalSessionRows(getProjects())) map.set(row.id, row);
    for (const item of terminalToolkitItems(getToolkit())) map.set(item.id, item);
    return map;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeTapEvents((e) => {
      if (e.kind !== 'external') return;
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

  // Card open → the card owns the bar (its `(END) — q to close` line
  // renders inside the card region).
  if (openProject !== null) return <div className="term-status-bar" />;

  const hovered = hoveredRow !== null ? byId.get(hoveredRow) : undefined;
  return (
    <div className="term-status-bar">
      {hovered ? (
        <span className="term-status-bar__detail">{detailFor(hovered)}</span>
      ) : !hintRetired ? (
        <span className="term-status-bar__hint">-- tap a project to open --</span>
      ) : null}
    </div>
  );
}
