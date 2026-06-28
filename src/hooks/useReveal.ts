// src/hooks/useReveal.ts
import { useEffect, useRef } from 'react';

const OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px',
};

let sharedObserver: IntersectionObserver | null = null;
let refCount = 0;

function getObserver(): IntersectionObserver {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          sharedObserver?.unobserve(entry.target);
        }
      }
    }, OBSERVER_OPTIONS);
  }
  return sharedObserver;
}

export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      el.classList.add('revealed');
      return;
    }

    const observer = getObserver();
    refCount++;
    observer.observe(el);

    return () => {
      observer.unobserve(el);
      refCount--;
      if (refCount <= 0 && sharedObserver) {
        sharedObserver.disconnect();
        sharedObserver = null;
        refCount = 0;
      }
    };
  }, []);

  return ref;
}
