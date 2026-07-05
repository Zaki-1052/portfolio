// src/scales/cellular/ArborAnnotations.tsx
// The scene-native project index: one luminous annotation per limb — a group
// label pinned to its projected tip anchor by a hairline, and the compact
// project entries that fade in when that limb is focused. This is the REAL
// interactive interface when WebGL is active (proper buttons/links, keyboard
// reachable); the in-flow document version is the no-WebGL fallback and is
// display:none'd under [data-webgl='active'] (globals.css).
//
// Positioning is imperative on a gsap ticker: it projects the anchors through
// the FINAL camera pose (camera-pose.ts — focus blend + parallax included) and
// skips all work when the pose version, depth, and viewport are unchanged, so
// the demand frameloop stays quiet at rest.
import { useEffect, useRef } from 'react';
import { invalidate } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useDepthStore } from '@/stores/depth';
import { useBranchFocusStore } from '@/stores/branch-focus';
import { BRANCH_META, BRANCH_ORDER, limbIndexOf, type BranchKey } from '@/content/branch-order';
import { getProjects } from '@/content/loader';
import { getCameraPose } from '@/engine/camera-pose';
import { worldToScreen } from '@/engine/screen-project';
import { BRANCH_ANCHORS } from './arbor-anchors';
import { smoothstep } from '@/utils/math';

// The overlay fades in as the mist clears off the resolved tree, and out as
// the next band's document begins scrolling over the settle hold.
const REVEAL_START = 0.33;
const REVEAL_END = 0.36;
const FADE_START = 0.4;
const FADE_END = 0.425;

function annotationEnvelope(depth: number): number {
  return (
    smoothstep(REVEAL_START, REVEAL_END, depth) * (1 - smoothstep(FADE_START, FADE_END, depth))
  );
}

export function ArborAnnotations() {
  const focusedBranch = useBranchFocusStore((s) => s.focusedBranch);
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Map<BranchKey, HTMLDivElement>>(new Map());
  const { tier1 } = getProjects();

  useEffect(() => {
    let lastVersion = -1;
    let lastDepth = -1;
    let lastW = 0;
    let lastH = 0;

    const tick = (): void => {
      const container = containerRef.current;
      if (!container) return;
      const depth = useDepthStore.getState().depth;
      const pose = getCameraPose();
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (pose.version === lastVersion && depth === lastDepth && w === lastW && h === lastH) {
        return;
      }
      lastVersion = pose.version;
      lastDepth = depth;
      lastW = w;
      lastH = h;

      const envelope = annotationEnvelope(depth);
      container.style.opacity = envelope.toFixed(3);
      // pointer-events on the container stay 'none' always; the label/entry
      // elements re-enable themselves — but a fully faded overlay must not
      // intercept anything at all.
      container.style.visibility = envelope <= 0.001 ? 'hidden' : 'visible';
      if (envelope <= 0.001) return;

      for (const branch of BRANCH_ORDER) {
        const el = groupRefs.current.get(branch);
        if (!el) continue;
        const anchor = BRANCH_ANCHORS[limbIndexOf(branch)];
        const p = worldToScreen(anchor, pose, w, h);
        if (!p.visible) {
          el.style.display = 'none';
          continue;
        }
        el.style.display = '';
        el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
        // Labels push outward from the screen center so they never sit on
        // top of their own limb.
        el.dataset.side = p.x < w * 0.5 ? 'left' : 'right';
      }
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, []);

  const toggleFocus = (branch: BranchKey): void => {
    const store = useBranchFocusStore.getState();
    const depth = useDepthStore.getState().depth;
    store.setFocusedBranch(store.focusedBranch === branch ? null : branch, depth);
    invalidate();
  };
  const setHover = (branch: BranchKey | null): void => {
    useBranchFocusStore.getState().setHoveredBranch(branch);
    invalidate();
  };

  return (
    <div ref={containerRef} className="arbor-annotations" role="group" aria-label="Project index">
      {BRANCH_ORDER.map((branch) => {
        const open = focusedBranch === branch;
        const projects = tier1.filter((p) => p.branch === branch);
        return (
          <div
            key={branch}
            ref={(el) => {
              if (el) groupRefs.current.set(branch, el);
              else groupRefs.current.delete(branch);
            }}
            className="arbor-annotation"
            data-side="right"
          >
            <span className="arbor-annotation__line" aria-hidden="true" />
            <div className="arbor-annotation__body">
              <button
                type="button"
                className="arbor-annotation__label"
                aria-pressed={open}
                onClick={() => toggleFocus(branch)}
                onMouseEnter={() => setHover(branch)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(branch)}
                onBlur={() => setHover(null)}
              >
                {BRANCH_META[branch].label}
              </button>
              <div className="arbor-annotation__entries" data-open={open || undefined}>
                {projects.map((project) => (
                  <div key={project.id} className="arbor-entry">
                    {project.links.github ? (
                      <a href={project.links.github} target="_blank" rel="noreferrer">
                        {project.title} <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <span className="arbor-entry__title">{project.title}</span>
                    )}
                    <p>{project.oneLiner}</p>
                    <span className="arbor-entry__tags">{project.tags.join(' · ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
