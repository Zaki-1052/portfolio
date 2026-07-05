// src/scales/approach/ApproachContent.tsx
// The pre-descent journey section: a tall, deliberately empty scroll runway
// behind which the 3D approach plays out (lonely form in the void → spiral
// descent → plunge through the surface). No portfolio content lives here by
// design — the only visible element is the fixed scroll cue. The section
// element itself is load-bearing: its DOM height is the journey's scroll
// runway, and measureSectionBoundaries pins the canonical 'approach' band to
// it. Height lives in globals.css (#approach) so the no-WebGL fallback can
// collapse the runway it has no journey to spend on.
import { useEffect, useRef } from 'react';
import { useDepthStore } from '@/stores/depth';
import { useIntroStore } from '@/stores/intro';
import { smoothstep } from '@/utils/math';

// Fixed-to-the-viewport scroll cue: fades in a beat after the overture lands
// (the one moment a visitor genuinely needs the affordance — the depth
// indicator stays hidden through the approach band), then dissolves as
// scrolling begins. Fixed positioning means it never travels with the page,
// so it can never drift up over the form. Decorative (aria-hidden): the
// visually-hidden paragraph in the section carries the semantics.
function DescendCue() {
  const introDone = useIntroStore((s) => s.phase === 'done');
  const fadeRef = useRef<HTMLDivElement>(null);

  // Depth-driven dissolve, imperative like the DepthIndicator fill — no React
  // re-render per scroll tick. Scrub-exact: scrolling back to the very top
  // brings the idle affordance back.
  useEffect(
    () =>
      useDepthStore.subscribe(
        (s) => s.depth,
        (depth) => {
          fadeRef.current?.style.setProperty(
            'opacity',
            (1 - smoothstep(0.005, 0.03, depth)).toFixed(3),
          );
        },
        { fireImmediately: true },
      ),
    [],
  );

  return (
    <div className="descend-cue" data-visible={introDone || undefined} aria-hidden="true">
      <div ref={fadeRef}>
        <span className="scroll-hint">
          descend <span>↓</span>
        </span>
      </div>
    </div>
  );
}

export function ApproachContent() {
  return (
    <section
      id="approach"
      data-scale="approach"
      aria-label="Descent introduction"
      style={{
        position: 'relative',
        background: 'var(--section-bg, var(--bg))',
        transition: 'background var(--dur-slow) var(--ease-in-out)',
      }}
    >
      <p className="visually-hidden">
        A visual descent introduction plays here. Scroll on — the portfolio content begins in the
        next section.
      </p>
      <DescendCue />
    </section>
  );
}
