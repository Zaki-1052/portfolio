// src/scales/cellular/CellularContent.tsx
import { useState } from 'react';
import { ScaleSection } from '@/components/ScaleSection';
import { ProjectCard } from '@/components/ProjectCard';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection, getProjects } from '@/content/loader';

type BranchKey = 'epigenetics' | 'structural' | 'software';

const BRANCH_META: Record<BranchKey, { label: string; blurb: string }> = {
  epigenetics: {
    label: 'epigenetics',
    blurb: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.',
  },
  structural: {
    label: 'structural biology',
    blurb: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.',
  },
  software: {
    label: 'software',
    blurb: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.',
  },
};

const BRANCH_ORDER: BranchKey[] = ['epigenetics', 'structural', 'software'];

export function CellularContent() {
  const [focus, setFocus] = useState<BranchKey>('epigenetics');
  const section = getSection('cellular');
  const { tier1 } = getProjects();

  const branchProjects = tier1.filter((p) => p.branch === focus);

  return (
    <ScaleSection
      scale="cellular"
      magnification="100×"
      title={section?.frontmatter.title ?? 'Three branches of one tree'}
      kicker="pick a branch"
    >
      {section && <MarkdownRenderer content={section.body} className="prose" />}

      <div
        className="branches"
        style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-7)' }}
      >
        {BRANCH_ORDER.map((key) => (
          <button
            key={key}
            className="branch"
            aria-pressed={focus === key}
            data-dim={focus !== key}
            onClick={() => setFocus(key)}
          >
            <h4>{BRANCH_META[key].label}</h4>
            <p>{BRANCH_META[key].blurb}</p>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {branchProjects.map((project) => (
          <ProjectCard
            key={project.id}
            title={project.title}
            href={project.links.github}
            description={project.oneLiner}
            tags={project.tags}
            meta={project.domain}
          />
        ))}
      </div>
    </ScaleSection>
  );
}
