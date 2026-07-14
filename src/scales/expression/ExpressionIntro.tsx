// src/scales/expression/ExpressionIntro.tsx
// The last band's intro prose, surfaced in the WebGL register while the
// signal origin settles onto its anchor. The document version of this copy
// lives in ExpressionContent's .expression-doc, which is display:none'd
// under WebGL — so in 3D the intro had no home. This overlay puts it back:
// a fixed, click-through column whose opacity/blur/rise are driven by a
// depth ENVELOPE on the gsap ticker (no React re-render), resolving from
// the haze after the custody handoff and clearing before the contact
// annotations arrive.
//
// Mirrors CoilIntro/ArborIntro exactly; only the envelope source (the
// dev-tunable expression beat params) and classes differ.
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection } from '@/content/loader';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import {
  EXPRESSION_BEAT_DEFAULTS,
  introRevealT,
  liveExpressionBeatParams,
} from './expression-beats';

// Resolve-from-haze magnitudes at zero envelope (fully faded): the column
// sits this much lower and blurrier, then sharpens/settles as it peaks.
const MAX_RISE_PX = 14;
const MAX_BLUR_PX = 5;

export function ExpressionIntro() {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const section = getSection('expression');

  useEffect(() => {
    let lastDepth = -1;
    let lastReduced: boolean | null = null;

    const tick = (): void => {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;

      const depth = useDepthStore.getState().depth;
      const reduced = useMotionStore.getState().reduced;
      if (depth === lastDepth && reduced === lastReduced) return;
      lastDepth = depth;
      lastReduced = reduced;

      const p = import.meta.env.DEV ? liveExpressionBeatParams : EXPRESSION_BEAT_DEFAULTS;
      const envelope = introRevealT(depth, p);
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
    <div ref={containerRef} className="expression-intro">
      <div className="expression-intro__col">
        <div ref={innerRef} className="expression-intro__inner">
          <h2 className="expression-intro__title">
            {section?.frontmatter.title ?? '$ whoami --contact'}
          </h2>
          {section && <MarkdownRenderer content={section.body} className="prose" />}
        </div>
      </div>
    </div>
  );
}
