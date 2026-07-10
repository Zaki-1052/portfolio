// src/scales/chromatin/CoilAnnotations.tsx
// The scene-native publication index: one luminous annotation per region
// locus — a title label pinned to its projected anchor by a hairline, and the
// publication card that fades in when that region is focused. This is the
// REAL interactive interface when WebGL is active (proper buttons/links,
// keyboard reachable); the in-flow document version is the no-WebGL fallback
// and is display:none'd under [data-webgl='active'] (globals.css).
//
// Positioning is imperative on a gsap ticker (ArborAnnotations precedent),
// projecting through the FINAL camera pose. Coil delta: the anchor MOVES —
// it rides lerp(compact, open, unwindBlend) so the label travels with its
// region as the fiber unwinds — so the skip-work guard keys on the blend too.
//
// Publication ↔ region mapping is array order: publications.json[0] is
// region 0, [1] is region 1 (two entries, two loci, both fixed).
import { useEffect, useRef, useState } from 'react';
import { invalidate } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useDepthStore } from '@/stores/depth';
import { useCoilFocusStore, type CoilRegionIndex } from '@/stores/coil-focus';
import { getPublications } from '@/content/loader';
import { getCameraPose } from '@/engine/camera-pose';
import { worldToScreen } from '@/engine/screen-project';
import { getRegionAnchors } from './coil-anchors';
import { smoothstep } from '@/utils/math';
import type { Vec3 } from '@/utils/coil-generator';

// The overlay fades in once the cluster stands resolved after the orbital
// sweep begins (5.6: pushed past the retimed intro's fade start), and out
// as the band hands off to the next scale.
const REVEAL_START = 0.505;
const REVEAL_END = 0.53;
const FADE_START = 0.545;
const FADE_END = 0.565;

const REGIONS: readonly CoilRegionIndex[] = [0, 1];

function annotationEnvelope(depth: number): number {
  return (
    smoothstep(REVEAL_START, REVEAL_END, depth) * (1 - smoothstep(FADE_START, FADE_END, depth))
  );
}

export function CoilAnnotations() {
  const focusedRegion = useCoilFocusStore((s) => s.focusedRegion);
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Map<CoilRegionIndex, HTMLDivElement>>(new Map());
  const { publications } = getPublications();

  // The scroll-release teach shows on the FIRST focus only — once the
  // visitor has closed a card any way at all, they know the moves.
  const [hintRetired, setHintRetired] = useState(false);
  const wasFocused = useRef(false);
  useEffect(() => {
    if (focusedRegion !== null) {
      wasFocused.current = true;
    } else if (wasFocused.current) {
      setHintRetired(true);
    }
  }, [focusedRegion]);

  // Esc = the back control's keyboard twin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      const store = useCoilFocusStore.getState();
      if (store.focusedRegion === null) return;
      store.setFocusedRegion(null, useDepthStore.getState().depth);
      invalidate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let lastVersion = -1;
    let lastDepth = -1;
    let lastBlend = -1;
    let lastW = 0;
    let lastH = 0;
    // The region whose GEOMETRY is displayed — mirrors CoilMesh's
    // release-then-focus sequencing: on a region switch the blend runs down
    // on the OLD region first, so the label keeps riding the old anchor
    // until the blend passes through zero and the shapes swap.
    let shownRegion: CoilRegionIndex | null = null;

    const tick = (): void => {
      const container = containerRef.current;
      if (!container) return;
      const depth = useDepthStore.getState().depth;
      const focusState = useCoilFocusStore.getState();
      const blend = focusState.unwindBlend;
      const pose = getCameraPose();
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (
        pose.version === lastVersion &&
        depth === lastDepth &&
        blend === lastBlend &&
        w === lastW &&
        h === lastH
      ) {
        return;
      }
      lastVersion = pose.version;
      lastDepth = depth;
      lastBlend = blend;
      lastW = w;
      lastH = h;

      const envelope = annotationEnvelope(depth);
      container.style.opacity = envelope.toFixed(3);
      // pointer-events on the container stay 'none' always; the label/entry
      // elements re-enable themselves — but a fully faded overlay must not
      // intercept anything at all.
      container.style.visibility = envelope <= 0.001 ? 'hidden' : 'visible';
      if (envelope <= 0.001) return;

      if (focusState.focusedRegion !== null && (shownRegion === null || blend <= 1e-3)) {
        shownRegion = focusState.focusedRegion;
      }

      const anchors = getRegionAnchors();
      // First pass: project both anchors (each travels with its region —
      // compact locus at rest, the open arc's centroid at full unwind).
      const projected: ({ x: number; y: number } | null)[] = REGIONS.map((region) => {
        const t = region === shownRegion ? blend : 0;
        const c = anchors.compact[region];
        const o = anchors.open[region];
        const anchor: Vec3 = [
          c[0] + (o[0] - c[0]) * t,
          c[1] + (o[1] - c[1]) * t,
          c[2] + (o[2] - c[2]) * t,
        ];
        const p = worldToScreen(anchor, pose, w, h);
        return p.visible ? { x: p.x, y: p.y } : null;
      });

      // De-collide: at view angles where the camera looks along the chord
      // between the two loci, both project to nearly the same point and the
      // labels garble. Push them symmetrically apart to a minimum screen
      // separation — the dots slide slightly off their exact loci for those
      // angles, which beats unreadable type. (Two labels only; the arbor's
      // three tips never needed this.)
      const p0 = projected[0];
      const p1 = projected[1];
      if (p0 && p1) {
        const MIN_SEPARATION = 64;
        let dx = p1.x - p0.x;
        let dy = p1.y - p0.y;
        const d = Math.hypot(dx, dy);
        if (d < MIN_SEPARATION) {
          if (d < 8) {
            // Near-coincident: deterministic vertical split.
            dx = 0;
            dy = 1;
          } else {
            dx /= d;
            dy /= d;
          }
          const push = (MIN_SEPARATION - d) / 2;
          p0.x -= dx * push;
          p0.y -= dy * push;
          p1.x += dx * push;
          p1.y += dy * push;
        }
      }

      for (const region of REGIONS) {
        const el = groupRefs.current.get(region);
        if (!el) continue;
        const p = projected[region];
        if (!p) {
          el.style.display = 'none';
          continue;
        }
        el.style.display = '';

        // Clamp the annotation into the viewport so edge labels never clip;
        // a clamped annotation dims its connector (the hairline would point
        // at nothing honest).
        const cx = Math.min(Math.max(p.x, 150), w - 150);
        const cy = Math.min(Math.max(p.y, 90), h - 170);
        el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
        const clamped = Math.abs(cx - p.x) + Math.abs(cy - p.y) > 2;
        if (clamped) el.dataset.clamped = 'true';
        else delete el.dataset.clamped;

        // Labels push outward from the screen center so they never sit on
        // top of the cluster. A FOCUSED region always opens its card to the
        // LEFT of the anchor (the pivot centers the open arc — leftward is
        // the reliably clear side, and a stable side beats a clever one).
        // Hovered regions freeze their current side (no cursor-chasing);
        // everyone else flips only through a hysteresis band.
        if (focusState.focusedRegion === region) {
          el.dataset.side = 'left';
        } else if (focusState.hoveredRegion !== region) {
          const margin = w * 0.06;
          if (cx < w * 0.5 - margin) el.dataset.side = 'left';
          else if (cx > w * 0.5 + margin) el.dataset.side = 'right';
        }
      }
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, []);

  const toggleFocus = (region: CoilRegionIndex): void => {
    const store = useCoilFocusStore.getState();
    const depth = useDepthStore.getState().depth;
    store.setFocusedRegion(store.focusedRegion === region ? null : region, depth);
    invalidate();
  };
  const setHover = (region: CoilRegionIndex | null): void => {
    useCoilFocusStore.getState().setHoveredRegion(region);
    invalidate();
  };

  return (
    <div ref={containerRef} className="coil-annotations" role="group" aria-label="Publications">
      {REGIONS.map((region) => {
        const open = focusedRegion === region;
        const pub = publications[region];
        if (!pub) return null;
        return (
          <div
            key={region}
            ref={(el) => {
              if (el) groupRefs.current.set(region, el);
              else groupRefs.current.delete(region);
            }}
            className="coil-annotation"
            data-focused={open || undefined}
          >
            <span className="coil-annotation__dot" aria-hidden="true" />
            <span className="coil-annotation__line" aria-hidden="true" />
            <div className="coil-annotation__body">
              <button
                type="button"
                className="coil-annotation__label"
                aria-pressed={open}
                onClick={() => toggleFocus(region)}
                onMouseEnter={() => setHover(region)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(region)}
                onBlur={() => setHover(null)}
              >
                {pub.title}
              </button>
              <div className="coil-annotation__entries" data-open={open || undefined}>
                <button
                  type="button"
                  className="coil-annotation__back"
                  onClick={() => toggleFocus(region)}
                >
                  <span aria-hidden="true">✕</span> wind it back
                </button>
                <div className="coil-entry">
                  <span className="coil-entry__status">
                    {pub.status} · {pub.year}
                  </span>
                  <p>{pub.description}</p>
                  <span className="coil-entry__venue">{pub.venue}</span>
                  {(pub.links.preprint ?? pub.links.paper) && (
                    <span className="coil-entry__links">
                      {pub.links.preprint && (
                        <a href={pub.links.preprint} target="_blank" rel="noreferrer">
                          preprint <span aria-hidden="true">↗</span>
                        </a>
                      )}
                      {pub.links.paper && (
                        <a href={pub.links.paper} target="_blank" rel="noreferrer">
                          paper <span aria-hidden="true">↗</span>
                        </a>
                      )}
                    </span>
                  )}
                </div>
                {!hintRetired && (
                  <p className="coil-entries__hint">scroll to continue the descent</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
