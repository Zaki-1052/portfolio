// src/scales/code/terminal-rows.test.ts
// Pins the projects.json → listing mapping against the REAL content file:
// exactly the two code-scale tier-1 projects become directories (the pager's
// only entry points), every tier-2 project becomes a symlink with a real
// external target, and the print order is dirs-then-symlinks.
import { describe, expect, it } from 'vitest';
import type { ProjectsData } from '@/content/types';
import projectsData from '../../../content/projects.json';
import {
  DIR_PERMS,
  SYMLINK_PERMS,
  terminalDirRows,
  terminalSessionRows,
  terminalSymlinkRows,
} from './terminal-rows';

const data = projectsData as ProjectsData;

describe('terminalDirRows', () => {
  it('maps exactly the code-scale tier-1 projects, in order', () => {
    const dirs = terminalDirRows(data.tier1);
    expect(dirs.map((d) => d.id)).toEqual(['cleave', 'metaencode']);
  });

  it('dresses every directory as a real directory', () => {
    for (const d of terminalDirRows(data.tier1)) {
      expect(d.kind).toBe('dir');
      expect(d.perms).toBe(DIR_PERMS);
      expect(d.label).toBe(`${d.id}/`);
    }
  });

  it('carries the full project record for the pager', () => {
    const dirs = terminalDirRows(data.tier1);
    for (const d of dirs) {
      expect(d.project.title.length).toBeGreaterThan(0);
      expect(d.project.tags.length).toBeGreaterThan(0);
      expect(d.project.links.github).toMatch(/^https:\/\//);
    }
  });
});

describe('terminalSymlinkRows', () => {
  it('maps every tier-2 project to a symlink', () => {
    const links = terminalSymlinkRows(data.tier2);
    expect(links.map((l) => l.id)).toEqual([
      'gptportal',
      'ao3-explorer',
      'yeast-msa',
      'crime-analysis',
      'webreg',
    ]);
  });

  it('dresses every symlink as a real symlink with an external target', () => {
    for (const l of terminalSymlinkRows(data.tier2)) {
      expect(l.kind).toBe('symlink');
      expect(l.perms).toBe(SYMLINK_PERMS);
      expect(l.label).toBe(`${l.id} ->`);
      expect(l.href).toMatch(/^https:\/\//);
    }
  });

  it('keeps the right-column badge data (stars or metric)', () => {
    const links = terminalSymlinkRows(data.tier2);
    const gptportal = links.find((l) => l.id === 'gptportal');
    expect(gptportal?.stars).toBeGreaterThan(0);
    const webreg = links.find((l) => l.id === 'webreg');
    expect(webreg?.metric).toBeTruthy();
  });
});

describe('terminalSessionRows', () => {
  it('prints directories first, then symlinks — seven rows total', () => {
    const rows = terminalSessionRows(data);
    expect(rows).toHaveLength(7);
    expect(rows.slice(0, 2).every((r) => r.kind === 'dir')).toBe(true);
    expect(rows.slice(2).every((r) => r.kind === 'symlink')).toBe(true);
  });
});
