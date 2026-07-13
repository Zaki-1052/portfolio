// src/content/loader.ts
import type {
  ProjectsData,
  PublicationsData,
  LinksData,
  Status,
  FormConfig,
  ParsedSection,
  SectionFrontmatter,
  TerminalIdentity,
} from './types';
import type { ScaleName } from '@/stores/depth';

import projectsData from '../../content/projects.json';
import publicationsData from '../../content/publications.json';
import linksData from '../../content/links.json';
import statusData from '../../content/status.json';
import toolkitData from '../../content/toolkit.json';
import formData from '../../content/form.json';
import introData from '../../content/intro.json';
import terminalData from '../../content/terminal.json';

const markdownFiles = import.meta.glob('/content/sections/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function parseFrontmatter(raw: string): ParsedSection {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return {
      frontmatter: { scale: 'tissue' as ScaleName, title: '' },
      body: raw.trim(),
    };
  }

  const [, yamlBlock, body] = match;
  const frontmatter: Record<string, string> = {};

  for (const line of yamlBlock!.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    frontmatter[key] = value;
  }

  return {
    frontmatter: frontmatter as unknown as SectionFrontmatter,
    body: body!.trim(),
  };
}

const sectionCache = new Map<string, ParsedSection>();

function buildSectionCache() {
  if (sectionCache.size > 0) return;
  for (const [path, raw] of Object.entries(markdownFiles)) {
    const filename = path.split('/').pop()?.replace('.md', '') ?? '';
    sectionCache.set(filename, parseFrontmatter(raw));
  }
}

// Partial: the 'approach' journey band carries no prose content by design.
const scaleToFile: Partial<Record<ScaleName, string>> = {
  tissue: 'brain',
  cellular: 'cellular',
  chromatin: 'chromatin',
  protein: 'protein',
  code: 'code',
  expression: 'expression',
};

export function getSection(scale: ScaleName): ParsedSection | undefined {
  buildSectionCache();
  const file = scaleToFile[scale];
  return file ? sectionCache.get(file) : undefined;
}

export function getProjects(): ProjectsData {
  return projectsData as ProjectsData;
}

export function getPublications(): PublicationsData {
  return publicationsData as PublicationsData;
}

export function getLinks(): LinksData {
  return linksData as LinksData;
}

export function getStatus(): Status {
  return statusData as Status;
}

export interface ToolkitEntry {
  key: string;
  value: string;
  blurb?: string;
  /** ls -laht size column in the terminal listing (placeholder metric). */
  size?: string;
  /** ls -laht date column in the terminal listing. */
  date?: string;
}

export function getToolkit(): ToolkitEntry[] {
  return toolkitData as ToolkitEntry[];
}

export function getTerminalIdentity(): TerminalIdentity {
  return terminalData as TerminalIdentity;
}

export function getFormConfig(): FormConfig {
  return formData as FormConfig;
}

export interface IntroContent {
  lines: string[];
}

export function getIntro(): IntroContent {
  return introData as IntroContent;
}
