// src/components/LoadingSequence.tsx
// The overture overlay (SPEC §7): dark screen → typed mono lines → when the
// typing is finished AND the scene is honestly ready, the overlay fades while
// the camera flies the INTRO_KEYFRAMES push-in → scroll unlocks. Plays every
// visit by design. The overlay is purely decorative (aria-hidden — no
// focusable content, never traps assistive tech); it blocks pointer input to
// the page below, but MotionToggle sits above it (--z-nav > --z-intro) and
// stays clickable throughout. Scroll stays locked (app.tsx stops Lenis at
// boot) until finish; the initial #hash jump is deferred to that moment so
// the sequence always plays from the top.
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { invalidate } from '@react-three/fiber';
import { getLenis } from '@/engine/scroll-engine';
import { jumpToInitialHash } from '@/engine/url-scale-sync';
import { useIntroStore } from '@/stores/intro';
import { useMotionStore } from '@/stores/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getIntro } from '@/content/loader';
import { visibleTextAt, type TypingSnapshot } from './intro-typing';

const INTRO_LINES = getIntro().lines;
const PUSH_SECONDS = 2.5;
const OVERLAY_FADE_SECONDS = 0.8;

export function LoadingSequence() {
  const phase = useIntroStore((s) => s.phase);
  const reduced = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState<TypingSnapshot>(() => visibleTextAt(INTRO_LINES, 0));

  // Typing loop. Reduced motion renders the full text instantly (a live
  // mid-typing toggle flip lands here too and completes on the spot).
  useEffect(() => {
    if (phase !== 'typing') return;
    if (reduced) {
      setSnap(visibleTextAt(INTRO_LINES, Number.MAX_SAFE_INTEGER));
      useIntroStore.getState().markTypingDone();
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (): void => {
      const s = visibleTextAt(INTRO_LINES, performance.now() - start);
      setSnap(s);
      if (s.done) {
        useIntroStore.getState().markTypingDone();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduced]);

  // Push flight: drive introProgress through the INTRO_KEYFRAMES track while
  // the overlay fades out over the flight's opening stretch.
  useEffect(() => {
    if (phase !== 'push') return;
    const progress = { t: 0 };
    const flight = gsap.to(progress, {
      t: 1,
      duration: PUSH_SECONDS,
      ease: 'power2.inOut',
      onUpdate: () => {
        useIntroStore.getState().setIntroProgress(progress.t);
        invalidate();
      },
      onComplete: () => useIntroStore.getState().finish(),
    });
    const fade = overlayRef.current
      ? gsap.to(overlayRef.current, {
          opacity: 0,
          duration: OVERLAY_FADE_SECONDS,
          ease: 'power1.out',
        })
      : null;
    // A reduced-motion flip mid-flight cuts straight to the landing.
    const unsub = useMotionStore.subscribe(
      (s) => s.reduced,
      (r) => {
        if (r) useIntroStore.getState().finish();
      },
    );
    return () => {
      flight.kill();
      fade?.kill();
      unsub();
    };
  }, [phase]);

  // Landing: release the scroll lock and honor any #hash the page loaded with.
  useEffect(() => {
    if (phase !== 'done') return;
    const lenis = getLenis();
    if (lenis) {
      lenis.start();
      jumpToInitialHash(lenis);
    }
    invalidate();
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div ref={overlayRef} className="intro-overlay" aria-hidden="true">
      <div className="intro-lines">
        {snap.lines.map((text, i) => (
          <p key={i} className="intro-line">
            {text}
            {i === snap.activeLine && !snap.done && <span className="intro-cursor" />}
          </p>
        ))}
      </div>
    </div>
  );
}
