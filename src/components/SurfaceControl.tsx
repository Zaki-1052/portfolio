// src/components/SurfaceControl.tsx
// The `> surface_` return control (§5.5.4) — sibling of the overture's
// `> skip_` in every way that matters: same warm-gold register, same
// decision precedent (instant jump under a fade, never a fast-scroll), and
// the same overlay/button separation (a focusable control never lives
// inside an aria-hidden subtree). The full-motion sequence: fade to dark
// (~0.5 s) → lenis jump to 0 under cover of darkness → replay the
// overture's camera push-in via surface-flight.ts while the dark lifts →
// land at the hero. Esc / wheel / touch during the flight cancels to an
// instant landing (the real scroll is already at 0 — only the decorative
// track stops). Reduced motion: instant cut, no flight (the skip
// precedent). Mounted LAST in app.tsx's chrome so natural DOM order makes
// it the band's final Tab stop. This absorbs PLAN2 §9.5's scroll-to-top.
//
// DEV experiment (§5.5, parked): the leva 'expression surface' toggle flips
// this to a long smooth reverse-scroll — the whole descent played backward.
// import.meta.env.DEV-gated at the call site, so production always flies.
import { useCallback, useEffect, useRef } from 'react';
import { invalidate } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { useSignalFocusStore } from '@/stores/signal-focus';
import { getLenis } from '@/engine/scroll-engine';
import {
  cancelSurfaceFlight,
  setSurfaceFlightProgress,
  startSurfaceFlight,
} from '@/engine/surface-flight';
import {
  EXPRESSION_BEAT_DEFAULTS,
  liveExpressionBeatParams,
} from '@/scales/expression/expression-beats';
import { getSurfaceFlightMode } from '@/scales/expression/expression-live-params';

/** Fade to dark — prompt, not ceremonial (the skip-fade precedent). */
const FADE_IN_S = 0.5;
/** The dark lifts while the flight plays (the overture's landing fade). */
const FADE_OUT_S = 0.8;
/** The overture push-in's own duration — the replay matches it exactly. */
const FLIGHT_S = 2.5;
/** The parked reverse-scroll experiment's descent-in-reverse duration. */
const REVERSE_SCROLL_S = 10;

export function SurfaceControl() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const running = useRef(false);
  const tweens = useRef<gsap.core.Tween[]>([]);

  // Re-render only when the reveal boolean flips, never per scroll tick.
  const revealed = useDepthStore((s) => {
    const p = import.meta.env.DEV ? liveExpressionBeatParams : EXPRESSION_BEAT_DEFAULTS;
    return s.currentScale === 'expression' && s.depth >= p.surfaceRevealAt;
  });

  const finish = useCallback((fadeOutS: number) => {
    for (const t of tweens.current) t.kill();
    tweens.current = [];
    cancelSurfaceFlight();
    getLenis()?.start();
    running.current = false;
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.style.pointerEvents = 'none';
      tweens.current.push(gsap.to(overlay, { opacity: 0, duration: fadeOutS, ease: 'power1.out' }));
    }
    invalidate();
  }, []);

  const ascend = useCallback(() => {
    if (running.current) return;
    const lenis = getLenis();

    // The parked experiment: play the whole descent backward. DEV-only —
    // the toggle setter is bound in expression-dev-tools, itself DEV-gated.
    if (import.meta.env.DEV && getSurfaceFlightMode() === 'reverse-scroll') {
      lenis?.scrollTo(0, { duration: REVERSE_SCROLL_S });
      return;
    }

    const overlay = overlayRef.current;
    if (useMotionStore.getState().reduced || !overlay) {
      // Instant cut — the skip control's reduced path exactly.
      lenis?.scrollTo(0, { immediate: true, force: true });
      invalidate();
      return;
    }

    running.current = true;
    // A focused channel would fight the flight's pose — release it first.
    useSignalFocusStore.getState().setFocusedChannel(null, useDepthStore.getState().depth);
    overlay.style.pointerEvents = 'auto';
    tweens.current.push(
      gsap.to(overlay, {
        opacity: 1,
        duration: FADE_IN_S,
        ease: 'power1.in',
        onComplete: () => {
          // Under cover of darkness: stop user input, jump the REAL scroll
          // to the top (force bypasses the stop), then fly the decorative
          // push-in while the dark lifts.
          lenis?.stop();
          lenis?.scrollTo(0, { immediate: true, force: true });
          invalidate();
          startSurfaceFlight();
          const progress = { t: 0 };
          tweens.current.push(
            gsap.to(progress, {
              t: 1,
              duration: FLIGHT_S,
              ease: 'power2.inOut',
              onUpdate: () => {
                setSurfaceFlightProgress(progress.t);
                invalidate();
              },
              onComplete: () => finish(0.2),
            }),
            gsap.to(overlay, { opacity: 0, duration: FADE_OUT_S, ease: 'power1.out' }),
          );
        },
      }),
    );
  }, [finish]);

  // Cancel paths: Esc, wheel, or touch during an active flight cuts to the
  // landed state (real scroll is already 0 — only the decoration stops).
  useEffect(() => {
    const cancel = (): void => {
      if (!running.current) return;
      finish(0.25);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchstart', cancel);
    };
  }, [finish]);

  useEffect(
    () => () => {
      for (const t of tweens.current) t.kill();
    },
    [],
  );

  return (
    <>
      {/* Decorative cover for the jump — blocks input during the sequence,
          never a11y (no focusable content inside). */}
      <div ref={overlayRef} className="surface-overlay" aria-hidden="true" />
      <button
        type="button"
        className="surface-control"
        data-revealed={revealed || undefined}
        onClick={ascend}
        tabIndex={revealed ? 0 : -1}
      >
        <span className="surface-prompt" aria-hidden="true">
          &gt;{' '}
        </span>
        surface
        <span className="surface-caret" aria-hidden="true">
          _
        </span>
      </button>
    </>
  );
}
