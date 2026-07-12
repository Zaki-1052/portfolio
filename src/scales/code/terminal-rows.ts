// src/scales/code/terminal-rows.ts
// projects.json → the ls -la session listing, pure and deterministic. The
// file type teaches the behavior (design §3.5): tier-1 code projects are
// real DIRECTORIES (in-terminal content — tapping opens the pager) and
// tier-2 projects are SYMLINKS (external — the `->` announces "opens
// elsewhere" before anyone taps). The presentation strings the listing
// depends on (perms, labels) are derived HERE so the mapping is provable in
// Vitest; the component stays a dumb projector of these rows.
import type { Project, ProjectsData, Tier2Project } from '@/content/types';

export const DIR_PERMS = 'drwxr-xr-x';
export const SYMLINK_PERMS = 'lrwxr-xr-x';

export interface TerminalDirRow {
  kind: 'dir';
  id: string;
  /** Listing label — the directory name with its trailing slash. */
  label: string;
  perms: typeof DIR_PERMS;
  oneLiner: string;
  /** The full tier-1 record — the pager's content source (title, tags,
   *  links, highlights, readmeSize). */
  project: Project;
}

export interface TerminalSymlinkRow {
  kind: 'symlink';
  id: string;
  /** Listing label — `name ->` in real ls symlink style. */
  label: string;
  perms: typeof SYMLINK_PERMS;
  oneLiner: string;
  /** External target — the GitHub repo the row opens in a new tab. */
  href: string;
  stars?: number;
  metric?: string;
}

export type TerminalSessionRow = TerminalDirRow | TerminalSymlinkRow;

export function terminalDirRows(tier1: readonly Project[]): TerminalDirRow[] {
  return tier1
    .filter((p) => p.scale === 'code')
    .map((p) => ({
      kind: 'dir' as const,
      id: p.id,
      label: `${p.id}/`,
      perms: DIR_PERMS,
      oneLiner: p.oneLiner,
      project: p,
    }));
}

export function terminalSymlinkRows(tier2: readonly Tier2Project[]): TerminalSymlinkRow[] {
  return tier2.map((p) => ({
    kind: 'symlink' as const,
    id: p.id,
    label: `${p.id} ->`,
    perms: SYMLINK_PERMS,
    oneLiner: p.oneLiner,
    href: p.links.github,
    stars: p.stars,
    metric: p.metric,
  }));
}

/** The full listing in print order: directories first, then symlinks —
 *  readable-here before reachable-elsewhere. */
export function terminalSessionRows(data: ProjectsData): TerminalSessionRow[] {
  return [...terminalDirRows(data.tier1), ...terminalSymlinkRows(data.tier2)];
}
