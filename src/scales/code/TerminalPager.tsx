// src/scales/code/TerminalPager.tsx
// The band's focus card in pager costume (§3.8): `less <id>/README.md`
// fills the terminal body — the alternate-screen metaphor is exact, the
// listing stays untouched underneath. Content is the project card (title,
// one-liner, highlight bullets, tag chips, GitHub link), short enough to
// need no internal scrolling. Non-modal `role="region"`; focus moves in on
// open and back to the opener on close (the TerminalMail discipline). Close
// paths: q, Esc, ✕, and scroll-away — CodeWindowFrame runs the release
// delta every frame, so real scrolling always wins.
import { useEffect, useMemo, useRef } from 'react';
import { getProjects } from '@/content/loader';
import { useDepthStore } from '@/stores/depth';
import { useTerminalFocusStore } from '@/stores/terminal-focus';
import { trapFocus } from '@/utils/focus-trap';
import { terminalDirRows, type TerminalDirRow } from './terminal-rows';

function closePager(): void {
  const store = useTerminalFocusStore.getState();
  store.setOpenProject(null, useDepthStore.getState().depth);
}

export function TerminalPager() {
  const openProject = useTerminalFocusStore((s) => s.openProject);
  const regionRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dirsById = useMemo(() => {
    const map = new Map<string, TerminalDirRow>();
    for (const dir of terminalDirRows(getProjects().tier1)) map.set(dir.id, dir);
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
        closePager();
        return;
      }
      if (e.key === 'Tab') trapFocus(e, regionRef.current);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openProject]);

  const dir = openProject !== null ? dirsById.get(openProject) : undefined;
  if (!dir) return null;
  const project = dir.project;

  return (
    <div
      ref={regionRef}
      className="term-pager"
      role="region"
      aria-label={`${project.title} — README`}
      tabIndex={-1}
    >
      <button
        type="button"
        className="term-pager__close"
        onClick={closePager}
        aria-label="Close (q)"
      >
        ✕
      </button>
      <div className="term-pager__doc">
        <h3 className="term-pager__title"># {project.title}</h3>
        <p className="term-pager__oneliner">{project.oneLiner}</p>
        {project.highlights && project.highlights.length > 0 && (
          <ul className="term-pager__highlights">
            {project.highlights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <div className="term-pager__tags" aria-label="Stack">
          {project.tags.map((tag) => (
            <span key={tag} className="term-pager__tag">
              [{tag}]
            </span>
          ))}
        </div>
        {project.links.github && (
          <a
            className="term-pager__link"
            href={project.links.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub — opens in a new tab"
          >
            → [GitHub <span aria-hidden="true">↗</span>]
          </a>
        )}
      </div>
      <div className="term-pager__status" aria-hidden="true">
        {dir.id}/README.md (END) — q to close
      </div>
    </div>
  );
}
