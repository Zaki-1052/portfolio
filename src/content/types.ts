// src/content/types.ts
import type { ScaleName } from '@/stores/depth';

export interface Project {
  id: string;
  title: string;
  domain?: string;
  branch?: 'epigenetics' | 'structural' | 'software';
  oneLiner: string;
  tags: string[];
  links: { github?: string; paper?: string };
  scale?: ScaleName;
  /** ls -laht size column (placeholder — e.g. lines of code "12k", or repo
   *  size "1.2M"; Zara picks the metric). */
  size?: string;
  /** ls -laht date column (e.g. "Jun 2025") — doubles as the chronological
   *  sort key the -t flag implies, so keep entries date-descending. */
  date?: string;
  /** Gold badge in the terminal listing (★ count), tier-2 style. */
  stars?: number;
  /** Gold badge fallback when stars don't fit the project (e.g. "◇ demo"). */
  metric?: string;
}

export interface Tier2Project {
  id: string;
  title: string;
  oneLiner: string;
  stars?: number;
  metric?: string;
  tags?: string[];
  links: { github: string };
  /** ls -laht size column (see Project.size). */
  size?: string;
  /** ls -laht date column (see Project.date). */
  date?: string;
}

/** Session identity strings for the code band's terminal — content, not
 *  code, so the prompt/title-bar wording is editable without touching
 *  components. NOTE: projectsDir must match the literal `cd projects` in
 *  terminal-beats.ts' BOOT_COMMAND (the scrub math pins its length). */
export interface TerminalIdentity {
  user: string;
  host: string;
  projectsDir: string;
}

export interface ProjectsData {
  tier1: Project[];
  tier2: Tier2Project[];
}

export interface Publication {
  id: string;
  title: string;
  year: number;
  status: string;
  venue: string;
  description: string;
  links: { preprint?: string | null; paper?: string | null };
}

export interface PublicationsData {
  publications: Publication[];
}

export interface ContactLink {
  name: string;
  url: string;
  display: string;
}

export interface LinksData {
  email: string;
  socials: ContactLink[];
  external: ContactLink[];
}

export interface Status {
  status: string;
  updatedAt: string;
}

export interface SectionFrontmatter {
  scale: ScaleName;
  title: string;
  subtitle?: string;
  description?: string;
}

export interface ParsedSection {
  frontmatter: SectionFrontmatter;
  body: string;
}

export interface FormConfig {
  endpoint: string;
  recipientDisplay: string;
  maxDailySubmissions: number;
  minMessageLength: number;
}
