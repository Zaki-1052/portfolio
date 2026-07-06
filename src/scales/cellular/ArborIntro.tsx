// src/scales/cellular/ArborIntro.tsx
// The band's intro prose, surfaced in the WebGL register during the
// tissue→cellular melt. The document version of this copy lives in
// CellularContent's .cellular-doc, which is display:none'd under WebGL — so in
// 3D the intro had no home. This overlay puts it back for the melt: a fixed,
// click-through column whose opacity/blur/rise are driven by a depth ENVELOPE on
// the gsap ticker (no React re-render), so the text resolves out of the haze
// with the tree, holds while the visitor lingers, then clears before the
// ArborAnnotations project labels arrive at 0.33.
//
// Mirrors the imperative-depth-envelope pattern of ArborAnnotations.tsx.
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MarkdownRenderer } from '@/content/markdown';
import { getSection } from '@/content/loader';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { lerp, smoothstep } from '@/utils/math';

// Depth window (canonical 0..1). Reveal as the cortex breakthrough settles and
// the embers drain; clear exactly as ArborAnnotations begins its reveal (0.33),
// so the two text layers never fight. These four numbers are the tuning knob.
const REVEAL_START = 0.25;
const REVEAL_END = 0.285;
const FADE_START = 0.305;
const FADE_END = 0.33;

// Resolve-from-haze magnitudes at zero envelope (fully faded): the column sits
// this much lower and this much blurrier, then sharpens/settles as it peaks.
const MAX_RISE_PX = 14;
const MAX_BLUR_PX = 5;

// The cooled lens's crush at FULL envelope. It eases up from brightness 1 /
// saturate 1 (no crush) so the box develops with the text instead of popping in.
const LENS_BRIGHTNESS = 0.55;
const LENS_SATURATE = 0.85;

function introEnvelope(depth: number): number {
  return (
    smoothstep(REVEAL_START, REVEAL_END, depth) * (1 - smoothstep(FADE_START, FADE_END, depth))
  );
}

export function ArborIntro() {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const section = getSection('cellular');

  useEffect(() => {
    let lastDepth = -1;
    let lastReduced: boolean | null = null;

    const tick = (): void => {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;

      const depth = useDepthStore.getState().depth;
      const reduced = useMotionStore.getState().reduced;
      // Recompute only when depth or the motion preference actually changed, so
      // the demand frameloop stays quiet at rest (matches ArborAnnotations).
      if (depth === lastDepth && reduced === lastReduced) return;
      lastDepth = depth;
      lastReduced = reduced;

      const envelope = introEnvelope(depth);
      container.style.opacity = envelope.toFixed(3);
      // A fully faded overlay leaves the a11y tree and stops intercepting.
      container.style.visibility = envelope <= 0.001 ? 'hidden' : 'visible';
      // Ease the lens's crush with the envelope (the ::before reads these
      // inherited custom props) so the cooled box develops gradually, in
      // lockstep with the text, instead of fading in at full strength.
      container.style.setProperty('--lens-b', lerp(1, LENS_BRIGHTNESS, envelope).toFixed(3));
      container.style.setProperty('--lens-s', lerp(1, LENS_SATURATE, envelope).toFixed(3));
      if (envelope <= 0.001) return;

      if (reduced) {
        // No blur/rise under reduced motion — the scrubbed opacity fade stays
        // (it's a scroll-position mapping, not a timed animation).
        inner.style.filter = '';
        inner.style.transform = '';
        return;
      }
      const rise = (1 - envelope) * MAX_RISE_PX;
      const blur = (1 - envelope) * MAX_BLUR_PX;
      // The cooled-lens backdrop lives on the (static) column; only this text
      // block resolves from haze, so the blur and the backdrop never fight.
      inner.style.transform = `translateY(${rise.toFixed(1)}px)`;
      inner.style.filter = `blur(${blur.toFixed(2)}px)`;
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div ref={containerRef} className="arbor-intro">
      <div className="arbor-intro__col">
        <div ref={innerRef} className="arbor-intro__inner">
          <h2 className="arbor-intro__title">
            {section?.frontmatter.title ?? 'Three branches of one tree'}
          </h2>
          {section && <MarkdownRenderer content={section.body} className="prose" />}
        </div>
      </div>
    </div>
  );
}
