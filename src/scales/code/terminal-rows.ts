// src/scales/code/terminal-rows.ts
// content JSON → the terminal session's data, pure and deterministic
// (design §3.5, revised 2026-07-14 second pass):
//   · the ls LISTING is PROJECTS ONLY — every row a directory with its
//     trailing slash (no symlink arrows, no .txt files here). The two main
//     projects expand in place (typed one-liner + GitHub link); the tier-2
//     projects open the split-pane focus card.
//   · the TOOLKIT never appears in the listing (it lives in the hidden
//     ~/.toolkit, and the boot command has no -a). It surfaces as the
//     completion CHIPS under the live prompt — .txt files
//     (`[languages.txt]`) that complete `less ~/.toolkit/<key>.txt` and
//     open the card.
// Rows carry the ls -lht columns (perms · size · date · name) so the
// mapping is provable in Vitest; the components stay dumb projectors.
import type { Project, ProjectsData, Tier2Project } from '@/content/types';
import type { ToolkitEntry } from '@/content/loader';

export const DIR_PERMS = 'drwxr-xr-x';
/** Main projects wear group-write perms — a visible cue that these two rows
 *  behave differently (expand in place) from the card-opening rest. */
export const MAIN_PERMS = 'drwxrwxr-x';

/** Column placeholder until real metrics are written (content workflow). */
const NO_VALUE = '—';

/** A main (tier-1) project — expands in place in the listing. */
export interface TerminalMainRow {
  kind: 'main';
  id: string;
  /** Listing label — the directory name with its trailing slash. */
  label: string;
  perms: typeof MAIN_PERMS;
  oneLiner: string;
  size: string;
  date: string;
  stars?: number;
  metric?: string;
  /** The full tier-1 record — the expansion's content source. */
  project: Project;
}

/** A tier-2 project — opens the split-pane focus card. */
export interface TerminalProjectRow {
  kind: 'project';
  id: string;
  label: string;
  perms: typeof DIR_PERMS;
  title: string;
  oneLiner: string;
  size: string;
  date: string;
  /** External target — the card's GitHub link. */
  href: string;
  stars?: number;
  metric?: string;
}

export type TerminalSessionRow = TerminalMainRow | TerminalProjectRow;

/** A toolkit entry — a chip + card, never a listing row. */
export interface TerminalToolkitItem {
  kind: 'toolkit';
  id: string;
  /** Chip label — a plain document in the hidden ~/.toolkit (`languages.txt`). */
  label: string;
  /** The toolkit value line ("Python, R, TypeScript…") — the card's chips. */
  oneLiner: string;
  entry: ToolkitEntry;
}

export function terminalMainRows(tier1: readonly Project[]): TerminalMainRow[] {
  return tier1
    .filter((p) => p.scale === 'code')
    .map((p) => ({
      kind: 'main' as const,
      id: p.id,
      label: `${p.id}/`,
      perms: MAIN_PERMS,
      oneLiner: p.oneLiner,
      size: p.size ?? NO_VALUE,
      date: p.date ?? NO_VALUE,
      stars: p.stars,
      metric: p.metric,
      project: p,
    }));
}

export function terminalProjectRows(tier2: readonly Tier2Project[]): TerminalProjectRow[] {
  return tier2.map((p) => ({
    kind: 'project' as const,
    id: p.id,
    label: `${p.id}/`,
    perms: DIR_PERMS,
    title: p.title,
    oneLiner: p.oneLiner,
    size: p.size ?? NO_VALUE,
    date: p.date ?? NO_VALUE,
    href: p.links.github,
    stars: p.stars,
    metric: p.metric,
  }));
}

export function terminalToolkitItems(toolkit: readonly ToolkitEntry[]): TerminalToolkitItem[] {
  return toolkit.map((entry) => ({
    kind: 'toolkit' as const,
    id: entry.key,
    label: `${entry.key}.txt`,
    oneLiner: entry.value,
    entry,
  }));
}

/** The ls listing in print order: main projects, then the rest. Within each
 *  group the JSON order IS the display order (ls -lht's -t implies
 *  newest-first; the date column doubles as the sort key Zara curates). */
export function terminalSessionRows(data: ProjectsData): TerminalSessionRow[] {
  return [...terminalMainRows(data.tier1), ...terminalProjectRows(data.tier2)];
}
