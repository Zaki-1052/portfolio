// src/scales/code/terminal-rows.test.ts
// Pins the content-JSON → session mapping against the REAL content files:
// the ls listing is PROJECTS ONLY — every row a slash-suffixed directory
// (main projects expand in place, tier-2 open cards), with ls -lht size/date
// columns and gold badges. The toolkit NEVER appears in the listing — it
// maps to the .txt completion chips (`languages.txt`) that open cards from
// the hidden ~/.toolkit.
import { describe, expect, it } from 'vitest';
import type { ProjectsData } from '@/content/types';
import type { ToolkitEntry } from '@/content/loader';
import projectsData from '../../../content/projects.json';
import toolkitData from '../../../content/toolkit.json';
import {
  DIR_PERMS,
  MAIN_PERMS,
  terminalMainRows,
  terminalProjectRows,
  terminalSessionRows,
  terminalToolkitItems,
} from './terminal-rows';

const data = projectsData as ProjectsData;
const toolkit = toolkitData as ToolkitEntry[];

describe('terminalMainRows', () => {
  it('maps exactly the code-scale tier-1 projects, in order', () => {
    const rows = terminalMainRows(data.tier1);
    expect(rows.map((r) => r.id)).toEqual(['cleave', 'metaencode']);
  });

  it('dresses every main project as a slash-suffixed directory with the distinct perms', () => {
    for (const r of terminalMainRows(data.tier1)) {
      expect(r.kind).toBe('main');
      expect(r.perms).toBe(MAIN_PERMS);
      expect(r.perms).not.toBe(DIR_PERMS); // the visible expand-behavior cue
      expect(r.label).toBe(`${r.id}/`);
      expect(r.size.length).toBeGreaterThan(0);
      expect(r.date.length).toBeGreaterThan(0);
    }
  });

  it('carries the gold badge fields and the record for the expansion', () => {
    const rows = terminalMainRows(data.tier1);
    expect(rows.some((r) => r.stars !== undefined || r.metric !== undefined)).toBe(true);
    for (const r of rows) {
      expect(r.project.links.github).toMatch(/^https:\/\//);
    }
  });
});

describe('terminalProjectRows', () => {
  it('maps every tier-2 project to a slash-suffixed directory — no arrows', () => {
    const rows = terminalProjectRows(data.tier2);
    expect(rows.map((r) => r.id)).toEqual([
      'gptportal',
      'ao3-explorer',
      'yeast-msa',
      'crime-analysis',
      'webreg',
    ]);
    for (const r of rows) {
      expect(r.kind).toBe('project');
      expect(r.perms).toBe(DIR_PERMS);
      expect(r.label).toBe(`${r.id}/`);
      expect(r.label).not.toContain('->');
      expect(r.href).toMatch(/^https:\/\//);
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.size.length).toBeGreaterThan(0);
      expect(r.date.length).toBeGreaterThan(0);
    }
  });

  it('keeps the gold badge data (stars or metric)', () => {
    const rows = terminalProjectRows(data.tier2);
    const gptportal = rows.find((r) => r.id === 'gptportal');
    expect(gptportal?.stars).toBeGreaterThan(0);
    const webreg = rows.find((r) => r.id === 'webreg');
    expect(webreg?.metric).toBeTruthy();
  });
});

describe('terminalToolkitItems', () => {
  it('maps every toolkit entry to a .txt chip, in order — never a listing row', () => {
    const items = terminalToolkitItems(toolkit);
    expect(items.map((i) => i.id)).toEqual(['languages', 'info', 'web', 'workflow']);
    for (const i of items) {
      expect(i.kind).toBe('toolkit');
      expect(i.label).toBe(`${i.id}.txt`);
      expect(i.oneLiner).toBe(i.entry.value);
    }
  });
});

describe('terminalSessionRows', () => {
  it('lists projects only — main first, then tier-2, seven rows total', () => {
    const rows = terminalSessionRows(data);
    expect(rows).toHaveLength(7);
    expect(rows.slice(0, 2).every((r) => r.kind === 'main')).toBe(true);
    expect(rows.slice(2).every((r) => r.kind === 'project')).toBe(true);
  });

  it('never collides ids between listing rows and toolkit chips', () => {
    const ids = [
      ...terminalSessionRows(data).map((r) => r.id),
      ...terminalToolkitItems(toolkit).map((i) => i.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
