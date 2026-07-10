// src/scales/chromatin/CoilIntro.tsx
// The band's intro prose, surfaced in the WebGL register while the cluster
// materializes from the haze. The document version of this copy lives in
// ChromatinContent's .chromatin-doc, which is display:none'd under WebGL —
// so in 3D the intro had no home. This overlay puts it back: a fixed,
// click-through column whose opacity/blur/rise are driven by a depth
// ENVELOPE on the gsap ticker (no React re-render), so the text resolves out
// of the haze with the fiber, holds a beat, then clears before the
// CoilAnnotations publication labels arrive at 0.465.
//
// Mirrors ArborIntro.tsx exactly; only the depth window and classes differ.
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection } from '@/content/loader';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { smoothstep } from '@/utils/math';

// Depth window (canonical 0..1). 5.6 retime: the column resolves only
// AFTER the hub-dive's fill beat (the glow-filled frame stays clean of
// text) and is mostly gone before CoilAnnotations begins its reveal
// (0.505), so the two text layers never fight. These four numbers are the
// tuning knob.
const REVEAL_START = 0.465;
const REVEAL_END = 0.487;
const FADE_START = 0.498;
const FADE_END = 0.52;

// Resolve-from-haze magnitudes at zero envelope (fully faded): the column
// sits this much lower and blurrier, then sharpens/settles as it peaks.
const MAX_RISE_PX = 14;
const MAX_BLUR_PX = 5;

function introEnvelope(depth: number): number {
  return (
    smoothstep(REVEAL_START, REVEAL_END, depth) * (1 - smoothstep(FADE_START, FADE_END, depth))
  );
}

export function CoilIntro() {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const section = getSection('chromatin');

  useEffect(() => {
    let lastDepth = -1;
    let lastReduced: boolean | null = null;

    const tick = (): void => {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;

      const depth = useDepthStore.getState().depth;
      const reduced = useMotionStore.getState().reduced;
      // Recompute only when depth or the motion preference actually changed,
      // so the demand frameloop stays quiet at rest.
      if (depth === lastDepth && reduced === lastReduced) return;
      lastDepth = depth;
      lastReduced = reduced;

      const envelope = introEnvelope(depth);
      // Presence gate: data-active flips the overlay's `display` (globals.css)
      // so it's fully out of render + a11y outside its window, and it can't
      // fight the no-WebGL fallback (which keeps it display:none).
      const active = envelope > 0.001;
      container.dataset.active = active ? 'true' : 'false';
      inner.style.opacity = envelope.toFixed(3);
      // The lens is a painted dark gradient (NOT backdrop-filter — see the
      // arbor-intro CSS note); the ::before inherits this custom prop.
      container.style.setProperty('--lens-alpha', envelope.toFixed(3));
      if (!active) return;

      if (reduced) {
        // No blur/rise under reduced motion — the scrubbed opacity fade stays
        // (a scroll-position mapping, not a timed animation).
        inner.style.filter = '';
        inner.style.transform = '';
        return;
      }
      const rise = (1 - envelope) * MAX_RISE_PX;
      const blur = (1 - envelope) * MAX_BLUR_PX;
      inner.style.transform = `translateY(${rise.toFixed(1)}px)`;
      inner.style.filter = `blur(${blur.toFixed(2)}px)`;
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div ref={containerRef} className="coil-intro">
      <div className="coil-intro__col">
        <div ref={innerRef} className="coil-intro__inner">
          <h2 className="coil-intro__title">
            {section?.frontmatter.title ?? 'The regulation layer'}
          </h2>
          {section && <MarkdownRenderer content={section.body} className="prose" />}
        </div>
      </div>
    </div>
  );
}
