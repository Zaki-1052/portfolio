// src/scales/approach/ApproachContent.tsx
// The pre-descent journey section: a tall, deliberately empty scroll runway
// behind which the 3D approach plays out (lonely form in the void → spiral
// descent → plunge through the surface). No portfolio content lives here by
// design — the only visible element is the scroll hint in the opening
// viewport. The section element itself is load-bearing: its DOM height is the
// journey's scroll runway, and measureSectionBoundaries pins the canonical
// 'approach' band to it. Height lives in globals.css (#approach) so the
// no-WebGL fallback can collapse the runway it has no journey to spend on.
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
      <div
        className="scroll-hint"
        style={{
          position: 'absolute',
          top: 'calc(100vh - var(--space-8) * 2)',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        descend <span aria-hidden="true">↓</span>
      </div>
    </section>
  );
}
