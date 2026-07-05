// src/scales/cellular/CellularContent.tsx
// The second band's content, in two registers:
//   · WebGL active — the band is scene-native: named scroll runways give the
//     arbor its arrival and index beats, and the ONLY visible content is the
//     ArborAnnotations overlay (luminous labels + entries pinned to the
//     limbs). The document version below is display:none'd (globals.css).
//   · No WebGL — the runways collapse and the full document version renders:
//     kicker/title/prose, the three branch buttons, and the project cards.
// Both registers drive the SAME focus store, so the fallback buttons and the
// 3D interaction can never disagree.
import { ScaleSection } from '@/components/ScaleSection';
import { ProjectCard } from '@/components/ProjectCard';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection, getProjects } from '@/content/loader';
import { useReveal } from '@/hooks/useReveal';
import { useBranchFocusStore } from '@/stores/branch-focus';
import { useDepthStore } from '@/stores/depth';
import { BRANCH_META, BRANCH_ORDER, type BranchKey } from '@/content/branch-order';
import { ArborAnnotations } from './ArborAnnotations';

export function CellularContent() {
  const focusedBranch = useBranchFocusStore((s) => s.focusedBranch);
  // The fallback list always shows one group; the store's null means
  // "overview" in the 3D register.
  const shown: BranchKey = focusedBranch ?? 'epigenetics';
  const section = getSection('cellular');
  const { tier1 } = getProjects();
  const cardsRef = useReveal<HTMLDivElement>();

  const branchProjects = tier1.filter((p) => p.branch === shown);
  const pick = (key: BranchKey): void => {
    useBranchFocusStore.getState().setFocusedBranch(key, useDepthStore.getState().depth);
  };

  return (
    <ScaleSection scale="cellular" magnification="100×">
      {/* Scene-native runways — heights are TUNED AGAINST THE CAMERA TIMING
          (globals.css Scroll runways block); they only take space when the
          Canvas owns the band. */}
      <div className="arbor-runway arbor-runway--arrival" aria-hidden="true" />
      <div className="arbor-runway arbor-runway--index" aria-hidden="true" />
      <ArborAnnotations />

      <div className="cellular-doc">
        <p className="cellular-doc__kicker">pick a branch</p>
        <h2 className="cellular-doc__title">
          {section?.frontmatter.title ?? 'Three branches of one tree'}
        </h2>
        {section && <MarkdownRenderer content={section.body} className="prose" />}

        <div
          className="branches"
          style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-7)' }}
        >
          {BRANCH_ORDER.map((key) => (
            <button
              key={key}
              className="branch"
              aria-pressed={shown === key}
              data-dim={shown !== key}
              onClick={() => pick(key)}
            >
              <h4>{BRANCH_META[key].label}</h4>
              <p>{BRANCH_META[key].blurb}</p>
            </button>
          ))}
        </div>

        <div
          ref={cardsRef}
          className="reveal"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
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
      </div>
    </ScaleSection>
  );
}
