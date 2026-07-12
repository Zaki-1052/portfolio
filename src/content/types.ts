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
  /** Terminal-pager highlight bullets (2–3) — lorem placeholder until real
   *  copy is written (the established content workflow). */
  highlights?: string[];
  /** Displayed README size for the listing's status-bar detail (e.g. "2.1 kB"). */
  readmeSize?: string;
}

export interface Tier2Project {
  id: string;
  title: string;
  oneLiner: string;
  stars?: number;
  metric?: string;
  tags?: string[];
  links: { github: string };
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
