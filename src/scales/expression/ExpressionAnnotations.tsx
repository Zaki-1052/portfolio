// src/scales/expression/ExpressionAnnotations.tsx
// The scene-native contact index: one luminous annotation per signal-line
// terminus — a channel label pinned to its projected end, expanding to the
// real handle/link when focused — plus the origin-anchored stack (the
// `% mail zara ▊` prompt beneath the surviving cursor, the closing
// movement's scroll-scrubbed sign-off, and the idle garnish). This is the
// REAL interactive interface when WebGL is active; the in-flow document
// version is the no-WebGL fallback, display:none'd under
// [data-webgl='active'] (globals.css).
//
// Positioning is imperative on a gsap ticker (the CoilAnnotations
// precedent), projecting the LIVE resolved origin + termini through the
// FINAL camera pose. Five termini bunch harder than the coil's two loci at
// near-axial view angles, so the de-collision is an iterative pairwise
// relaxation, not a single push. The CRT scanline overlay and the
// --expression-warmth custom property ride the same tick (cheap depth-only
// style writes — one ticker for the whole band's HTML register).
import { useEffect, useMemo, useRef } from 'react';
import { invalidate } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { useSignalFocusStore } from '@/stores/signal-focus';
import { getLinks, getSection, getTerminalIdentity } from '@/content/loader';
import { getCameraPose } from '@/engine/camera-pose';
import { worldToScreen } from '@/engine/screen-project';
import {
  EXPRESSION_BEAT_DEFAULTS,
  annotationsEnvelope,
  liveExpressionBeatParams,
  scanlineOpacityFor,
  signoffCharsTyped,
  warmBookendT,
} from './expression-beats';
import {
  SIGNAL_CHANNEL_IDS,
  resolveSignalOrigin,
  signalChannelTerminus,
  type SignalChannelId,
} from './signal-geometry';
import { SIGNAL_LOOK_DEFAULTS } from './signal-params';
import { getExpressionLookOverride } from './expression-live-params';

/** Minimum screen separation between any two terminus labels. */
const MIN_SEPARATION = 72;
/** Relaxation passes — five points converge in two; three is margin. */
const DECOLLIDE_PASSES = 3;
/** Garnish typing cadence (real-terminal speed, the tap-response clock). */
const GARNISH_CHAR_MS = 30;

interface ChannelInfo {
  id: SignalChannelId;
  handle: string;
  href: string;
  mailto: boolean;
}

function buildChannels(): ChannelInfo[] {
  const links = getLinks();
  const pool = [...links.socials, ...links.external];
  return SIGNAL_CHANNEL_IDS.map((id) => {
    if (id === 'email') {
      return { id, handle: links.email, href: `mailto:${links.email}`, mailto: true };
    }
    const entry = pool.find((e) => e.name.toLowerCase() === id);
    return {
      id,
      handle: entry?.display ?? id,
      href: entry?.url ?? '#',
      mailto: false,
    };
  });
}

/** Iterative pairwise relaxation: push every colliding pair symmetrically
 *  apart until all pairs clear MIN_SEPARATION (or the passes run out —
 *  five points settle well inside three). Near-coincident pairs split
 *  vertically, deterministically. */
function decollide(points: ({ x: number; y: number } | null)[]): void {
  for (let pass = 0; pass < DECOLLIDE_PASSES; pass++) {
    let moved = false;
    for (let a = 0; a < points.length; a++) {
      const pa = points[a];
      if (!pa) continue;
      for (let b = a + 1; b < points.length; b++) {
        const pb = points[b];
        if (!pb) continue;
        let dx = pb.x - pa.x;
        let dy = pb.y - pa.y;
        const d = Math.hypot(dx, dy);
        if (d >= MIN_SEPARATION) continue;
        if (d < 8) {
          dx = 0;
          dy = 1;
        } else {
          dx /= d;
          dy /= d;
        }
        const push = (MIN_SEPARATION - d) / 2;
        pa.x -= dx * push;
        pa.y -= dy * push;
        pb.x += dx * push;
        pb.y += dy * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

export function ExpressionAnnotations() {
  const focusedChannel = useSignalFocusStore((s) => s.focusedChannel);
  const hintRetired = useSignalFocusStore((s) => s.hintRetired);
  const containerRef = useRef<HTMLDivElement>(null);
  const scanlineRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const signoffRef = useRef<HTMLSpanElement>(null);
  const garnishRef = useRef<HTMLParagraphElement>(null);
  const groupRefs = useRef<Map<SignalChannelId, HTMLDivElement>>(new Map());

  const channels = useMemo(buildChannels, []);
  const section = getSection('expression');
  const identity = getTerminalIdentity();
  const signoffText = section?.frontmatter.signoff ?? '';

  // Esc = the disconnect control's keyboard twin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      const store = useSignalFocusStore.getState();
      if (store.focusedChannel === null) return;
      store.setFocusedChannel(null, useDepthStore.getState().depth);
      invalidate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The projection tick — origin stack, terminus labels, scanline, warmth.
  useEffect(() => {
    let lastVersion = -1;
    let lastDepth = -1;
    let lastW = 0;
    let lastH = 0;
    let lastReduced: boolean | null = null;

    const tick = (): void => {
      const container = containerRef.current;
      if (!container) return;
      const depth = useDepthStore.getState().depth;
      const reduced = useMotionStore.getState().reduced;
      const pose = getCameraPose();
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (
        pose.version === lastVersion &&
        depth === lastDepth &&
        w === lastW &&
        h === lastH &&
        reduced === lastReduced
      ) {
        return;
      }
      lastVersion = pose.version;
      lastDepth = depth;
      lastW = w;
      lastH = h;
      lastReduced = reduced;

      const p = import.meta.env.DEV ? liveExpressionBeatParams : EXPRESSION_BEAT_DEFAULTS;
      const look = getExpressionLookOverride() ?? SIGNAL_LOOK_DEFAULTS;

      // The CRT scanline is the band's texture, independent of the
      // annotations' reveal — it rises at the boundary and holds.
      const scanline = scanlineRef.current;
      if (scanline) {
        const so = scanlineOpacityFor(depth, look.scanlineMaxOpacity);
        scanline.style.opacity = so.toFixed(4);
        scanline.style.visibility = so <= 0.0005 ? 'hidden' : 'visible';
      }

      const envelope = annotationsEnvelope(depth, p);
      container.style.opacity = envelope.toFixed(3);
      container.style.visibility = envelope <= 0.001 ? 'hidden' : 'visible';
      // The warm bookend, HTML side — consumed by color-mix() rules.
      container.style.setProperty('--expression-warmth', warmBookendT(depth, p).toFixed(3));
      if (envelope <= 0.001) return;

      const origin = resolveSignalOrigin(depth);

      // The origin stack: prompt + sign-off + garnish, pinned beneath the
      // node's projected point.
      const originEl = originRef.current;
      if (originEl) {
        const op = worldToScreen(origin, pose, w, h);
        if (op.visible) {
          originEl.style.display = '';
          const ox = Math.min(Math.max(op.x, 120), w - 120);
          const oy = Math.min(Math.max(op.y, 60), h - 140);
          originEl.style.transform = `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0)`;
        } else {
          originEl.style.display = 'none';
        }
      }

      // The sign-off scrub — reduced motion renders it whole at the
      // threshold (an instant caption, not a typed line).
      const signoffEl = signoffRef.current;
      if (signoffEl && signoffText) {
        const chars = reduced
          ? depth >= p.signoffStart
            ? signoffText.length
            : 0
          : signoffCharsTyped(depth, signoffText, p);
        const next = signoffText.slice(0, chars);
        if (signoffEl.textContent !== next) signoffEl.textContent = next;
        signoffEl.parentElement?.setAttribute('data-active', chars > 0 ? 'true' : 'false');
      }

      // Terminus labels: project, de-collide, clamp, side-flip.
      const projected: ({ x: number; y: number } | null)[] = channels.map((c) => {
        const t = signalChannelTerminus(origin, c.id);
        const pt = worldToScreen(t, pose, w, h);
        return pt.visible ? { x: pt.x, y: pt.y } : null;
      });
      decollide(projected);

      const focusState = useSignalFocusStore.getState();
      for (let i = 0; i < channels.length; i++) {
        const c = channels[i]!;
        const el = groupRefs.current.get(c.id);
        if (!el) continue;
        const pt = projected[i];
        if (!pt) {
          el.style.display = 'none';
          continue;
        }
        el.style.display = '';

        const cx = Math.min(Math.max(pt.x, 150), w - 150);
        const cy = Math.min(Math.max(pt.y, 90), h - 170);
        el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
        const clamped = Math.abs(cx - pt.x) + Math.abs(cy - pt.y) > 2;
        if (clamped) el.dataset.clamped = 'true';
        else delete el.dataset.clamped;

        // A focused channel always opens LEFT (stable beats clever);
        // hovered channels freeze their side; everyone else flips through
        // a hysteresis band (the coil rules verbatim).
        if (focusState.focusedChannel === c.id) {
          el.dataset.side = 'left';
        } else if (focusState.hoveredChannel !== c.id) {
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
  }, [channels, signoffText]);

  // The idle garnish (§5.5.5): arm a dwell timer at the very bottom; any
  // depth change clears it; on firing, the line types at real-terminal
  // speed (or instantly under reduced motion). A timer, not the ticker —
  // the ticker's skip-work guard goes quiet exactly when idleness begins.
  useEffect(() => {
    const el = garnishRef.current;
    const text = section?.frontmatter.garnish ?? '';
    if (!el || !text) return undefined;
    let timer: number | null = null;
    let typing: number | null = null;

    const clear = (): void => {
      if (timer !== null) window.clearTimeout(timer);
      if (typing !== null) window.clearInterval(typing);
      timer = null;
      typing = null;
      el.textContent = '';
      el.dataset.active = 'false';
    };

    const arm = (depth: number): void => {
      clear();
      const p = import.meta.env.DEV ? liveExpressionBeatParams : EXPRESSION_BEAT_DEFAULTS;
      const look = getExpressionLookOverride() ?? SIGNAL_LOOK_DEFAULTS;
      if (!look.garnishEnabled || depth < p.garnishMinDepth) return;
      timer = window.setTimeout(() => {
        el.dataset.active = 'true';
        if (useMotionStore.getState().reduced) {
          el.textContent = text;
          return;
        }
        let i = 0;
        typing = window.setInterval(() => {
          i++;
          el.textContent = text.slice(0, i);
          if (i >= text.length && typing !== null) {
            window.clearInterval(typing);
            typing = null;
          }
        }, GARNISH_CHAR_MS);
      }, p.garnishIdleMs);
    };

    arm(useDepthStore.getState().depth);
    const unsub = useDepthStore.subscribe(
      (s) => s.depth,
      (depth) => arm(depth),
    );
    return () => {
      clear();
      unsub();
    };
  }, [section]);

  const toggleFocus = (channel: SignalChannelId): void => {
    const store = useSignalFocusStore.getState();
    const depth = useDepthStore.getState().depth;
    store.setFocusedChannel(store.focusedChannel === channel ? null : channel, depth);
    invalidate();
  };
  const setHover = (channel: SignalChannelId | null): void => {
    useSignalFocusStore.getState().setHoveredChannel(channel);
    invalidate();
  };
  const openMail = (): void => {
    useSignalFocusStore.getState().setMailOpen(true);
  };

  return (
    <>
      {/* The band's CRT texture — never obstruction: pointer-transparent,
          whisper opacity, no animation (a texture, not an effect). */}
      <div ref={scanlineRef} className="expression-scanline" aria-hidden="true" />
      <div
        ref={containerRef}
        className="expression-annotations"
        role="group"
        aria-label="Contact channels"
      >
        {channels.map((c) => {
          const open = focusedChannel === c.id;
          return (
            <div
              key={c.id}
              ref={(el) => {
                if (el) groupRefs.current.set(c.id, el);
                else groupRefs.current.delete(c.id);
              }}
              className="expression-annotation"
              data-focused={open || undefined}
            >
              <span className="expression-annotation__dot" aria-hidden="true" />
              <span className="expression-annotation__line" aria-hidden="true" />
              <div className="expression-annotation__body">
                <button
                  type="button"
                  className="expression-annotation__label"
                  aria-pressed={open}
                  onClick={() => toggleFocus(c.id)}
                  onMouseEnter={() => setHover(c.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(c.id)}
                  onBlur={() => setHover(null)}
                >
                  {c.id}
                </button>
                <div className="expression-annotation__entries" data-open={open || undefined}>
                  <button
                    type="button"
                    className="expression-annotation__back"
                    onClick={() => toggleFocus(c.id)}
                  >
                    <span aria-hidden="true">✕</span> disconnect
                  </button>
                  <div className="expression-entry">
                    <a
                      className="expression-entry__handle"
                      href={c.href}
                      target={c.mailto ? undefined : '_blank'}
                      rel={c.mailto ? undefined : 'noopener noreferrer'}
                    >
                      {c.handle} <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                  {!hintRetired && <p className="expression-entries__hint">scroll to release</p>}
                </div>
              </div>
            </div>
          );
        })}

        {/* The origin stack — beneath the surviving cursor: the scene-native
            mail prompt (§5.3), the sign-off scrub (§5.5.2), and the idle
            garnish (§5.5.5). */}
        <div ref={originRef} className="expression-origin">
          <button
            type="button"
            className="expression-mail-trigger"
            onClick={openMail}
            aria-haspopup="dialog"
          >
            <span className="expression-mail-trigger__prompt" aria-hidden="true">
              %{' '}
            </span>
            mail {identity.user}
            <span className="expression-mail-trigger__caret" aria-hidden="true">
              ▊
            </span>
          </button>
          <p className="expression-signoff" data-active="false">
            <span ref={signoffRef} aria-hidden="true" />
            <span className="visually-hidden">{signoffText}</span>
          </p>
          <p
            ref={garnishRef}
            className="expression-garnish"
            aria-hidden="true"
            data-active="false"
          />
        </div>
      </div>
    </>
  );
}
