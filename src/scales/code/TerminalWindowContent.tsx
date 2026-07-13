// src/scales/code/TerminalWindowContent.tsx
// The terminal's HTML interior — the REAL interactive interface of the code
// band (site precedent: HTML projected over the 3D scene, real buttons and
// links, native focus). Three responsibilities:
//   1. Projection glue: a gsap ticker (CoilAnnotations pattern, skip-work
//      guarded) re-derives the locked window rect from the SAME pure
//      functions the mesh uses + the camera-pose mirror, projects two
//      corners through worldToScreen, and sets the container's LAYOUT BOX
//      (left/top/width/height in px — never transform:scale, which blurs
//      rasterized text; a layout box reflows real text crisp at any DPR).
//      HTML exists only while the window is flat (phase ≥ 0.999) — it is
//      never tilted, so the mapping is a pure 2D rect.
//   2. The event clock's threshold watcher: stamps bootExecutedAtMs /
//      exitExecutedAtMs on forward crossings (nulled on rewind) and mirrors
//      the beat + print states onto data attributes for the CSS reveals.
//   3. The content tree: title bar, boot prompt, listing, live prompt +
//      chips, farewell, status bar.
import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { gsap } from 'gsap';
import { useDepthStore } from '@/stores/depth';
import { useMotionStore } from '@/stores/motion';
import { useTerminalFocusStore } from '@/stores/terminal-focus';
import { getCameraPose } from '@/engine/camera-pose';
import { worldToScreen } from '@/engine/screen-project';
import { rotateByQuat } from '@/utils/quaternion';
import {
  FAREWELL_LINES,
  TERMINAL_BEAT_DEFAULTS,
  liveTerminalBeatParams,
  terminalBeatFor,
  windowOpacityFor,
  windowPosePhase,
  type TerminalBeatParams,
} from './terminal-beats';
import { CODE_WINDOW_STANDOFF, windowLockedRect } from './code-window-pose';
import { CODE_WINDOW_DEFAULTS } from './code-window-params';
import { getCodeWindowOverride, subscribeCodeParams } from './code-live-params';
import { getTerminalIdentity } from '@/content/loader';
import { TerminalPromptLine } from './TerminalPromptLine';
import { TerminalInteractiveListing } from './TerminalInteractiveListing';
import { TerminalChips } from './TerminalChips';
import { TerminalStatusBar } from './TerminalStatusBar';
import { TerminalFocusCard } from './TerminalFocusCard';

function beatParams(): TerminalBeatParams {
  return import.meta.env.DEV ? liveTerminalBeatParams : TERMINAL_BEAT_DEFAULTS;
}

export function TerminalWindowContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // --- The projection tick: layout box from the pose mirror. ---
  useEffect(() => {
    let lastVersion = -1;
    let lastDepth = -1;
    let lastW = 0;
    let lastH = 0;
    // Dev-panel edits (fillFraction, titleBarFrac) reshape the rect without
    // a pose/depth change — poke the guard so the next tick recomputes.
    const unsubscribeParams = subscribeCodeParams(() => {
      lastDepth = -1;
    });

    const tick = (): void => {
      const container = containerRef.current;
      if (!container) return;
      const depth = useDepthStore.getState().depth;
      const pose = getCameraPose();
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (pose.version === lastVersion && depth === lastDepth && w === lastW && h === lastH) {
        return;
      }
      lastVersion = pose.version;
      lastDepth = depth;
      lastW = w;
      lastH = h;

      const p = beatParams();
      const reduced = useMotionStore.getState().reduced;
      const opacity = windowOpacityFor(depth, p);
      // Reduced motion: the pose is always settled, so the HTML lives for
      // the window's whole opacity envelope. Full motion: only while flat.
      const phase = reduced ? (opacity > 0 ? 1 : 0) : windowPosePhase(depth, p);
      const live = phase >= 0.999 && opacity > 0.001;
      if (container.dataset.live !== (live ? '1' : '0')) {
        container.dataset.live = live ? '1' : '0';
      }
      if (!live) return;
      container.style.opacity = opacity < 0.999 ? opacity.toFixed(3) : '';

      const look = getCodeWindowOverride() ?? CODE_WINDOW_DEFAULTS;
      const rect = windowLockedRect(pose.fov, w / h, CODE_WINDOW_STANDOFF, look.fillFraction);

      // The window's corners in world space, from the same expression the
      // mesh composes (flight offsets are all zero at phase 1 by the no-pop
      // invariant, so the locked pose needs none of them).
      const fwd = rotateByQuat([0, 0, -1], pose.quaternion);
      const right = rotateByQuat([1, 0, 0], pose.quaternion);
      const up = rotateByQuat([0, 1, 0], pose.quaternion);
      const cx = pose.position[0] + fwd[0] * CODE_WINDOW_STANDOFF;
      const cy = pose.position[1] + fwd[1] * CODE_WINDOW_STANDOFF;
      const cz = pose.position[2] + fwd[2] * CODE_WINDOW_STANDOFF;
      const tl = worldToScreen(
        [
          cx - right[0] * rect.halfW + up[0] * rect.halfH,
          cy - right[1] * rect.halfW + up[1] * rect.halfH,
          cz - right[2] * rect.halfW + up[2] * rect.halfH,
        ],
        pose,
        w,
        h,
      );
      const br = worldToScreen(
        [
          cx + right[0] * rect.halfW - up[0] * rect.halfH,
          cy + right[1] * rect.halfW - up[1] * rect.halfH,
          cz + right[2] * rect.halfW - up[2] * rect.halfH,
        ],
        pose,
        w,
        h,
      );
      if (!tl.visible || !br.visible) return;

      const width = br.x - tl.x;
      const height = br.y - tl.y;
      container.style.left = `${tl.x.toFixed(1)}px`;
      container.style.top = `${tl.y.toFixed(1)}px`;
      container.style.width = `${width.toFixed(1)}px`;
      container.style.height = `${height.toFixed(1)}px`;
      // Title-bar band + inner inset for the children (the HTML aligns to
      // the window's inner content area so square corners never poke past
      // the rounded chrome — no clip-path needed).
      container.style.setProperty('--term-bar-h', `${(look.titleBarFrac * height).toFixed(1)}px`);
      container.style.setProperty('--term-inset', `${(height * 0.02).toFixed(1)}px`);
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      unsubscribeParams();
    };
  }, []);

  // --- The event clock's threshold watcher (two-clock rule): stamp the
  // wall-clock ms of each forward execute crossing, null it on rewind, and
  // mirror beat/print states as data attributes for the CSS reveals. ---
  useEffect(
    () =>
      useDepthStore.subscribe(
        (s) => s.depth,
        (depth) => {
          const p = beatParams();
          const store = useTerminalFocusStore.getState();
          if (depth >= p.bootExecute && store.bootExecutedAtMs === null) {
            store.setBootExecutedAtMs(performance.now());
          } else if (depth < p.bootExecute && store.bootExecutedAtMs !== null) {
            store.setBootExecutedAtMs(null);
          }
          if (depth >= p.exitExecute && store.exitExecutedAtMs === null) {
            store.setExitExecutedAtMs(performance.now());
          } else if (depth < p.exitExecute && store.exitExecutedAtMs !== null) {
            store.setExitExecutedAtMs(null);
          }

          const body = bodyRef.current;
          const title = titleRef.current;
          if (!body) return;
          const beat = terminalBeatFor(depth, p);
          if (body.dataset.beat !== beat) body.dataset.beat = beat;
          const booted = depth >= p.bootExecute ? '1' : '0';
          if (body.dataset.booted !== booted) {
            body.dataset.booted = booted;
            if (title) {
              const id = getTerminalIdentity();
              title.textContent =
                booted === '1'
                  ? `${id.user}@${id.host} — ~/${id.projectsDir}`
                  : `${id.user}@${id.host} — ~`;
            }
          }
          const exited = depth >= p.exitExecute ? '1' : '0';
          if (body.dataset.exited !== exited) body.dataset.exited = exited;
        },
        { fireImmediately: true },
      ),
    [],
  );

  // Mirror the open card onto the body for the split-pane layout (desktop
  // CSS docks the card right and shrinks .term-main when data-open is set).
  useEffect(
    () =>
      useTerminalFocusStore.subscribe(
        (s) => s.openProject,
        (openProject) => {
          const body = bodyRef.current;
          if (!body) return;
          const open = openProject !== null ? '1' : '0';
          if (body.dataset.open !== open) body.dataset.open = open;
        },
        { fireImmediately: true },
      ),
    [],
  );

  // Arrow-key roving focus over the rows (§3.6 — the zsh menu-select keys).
  // Fires only while focus is already inside the body (the handler rides
  // bubbling from the focused control), so arrow-key page scrolling
  // everywhere else is untouched. Enter is native to buttons/links.
  const onBodyKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const body = bodyRef.current;
    if (!body) return;
    const items = Array.from(body.querySelectorAll<HTMLElement>('.term-row, .term-chip'));
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;
    e.preventDefault();
    const next =
      e.key === 'ArrowDown' ? Math.min(items.length - 1, current + 1) : Math.max(0, current - 1);
    items[next]?.focus();
  };

  const identity = getTerminalIdentity();

  return (
    <div ref={containerRef} className="terminal-window" data-live="0">
      <div ref={titleRef} className="terminal-window__titlebar" aria-hidden="true">
        {`${identity.user}@${identity.host} — ~`}
      </div>
      <div
        ref={bodyRef}
        className="terminal-window__body"
        role="group"
        aria-label="Projects — interactive terminal"
        data-beat="before"
        data-booted="0"
        data-exited="0"
        data-open="0"
        onKeyDown={onBodyKeyDown}
      >
        <div className="term-main">
          <TerminalPromptLine variant="boot" />
          <TerminalInteractiveListing />
          <TerminalPromptLine variant="live" />
          <TerminalChips />
          <div className="term-farewell" aria-hidden="true">
            {FAREWELL_LINES.map((line, i) => (
              <div
                key={line}
                className="term-line term-print--farewell"
                style={{ '--print-delay': `${i * 150}ms` } as CSSProperties}
              >
                {line}
              </div>
            ))}
            {/* The cursor that will outlive the window — renderer #2 hands it
                to the survivor mesh when the HTML dies at the farewell hold. */}
            <div
              className="term-line term-print--farewell"
              style={{ '--print-delay': '300ms' } as CSSProperties}
            >
              <span className="term-cursor" />
            </div>
          </div>
          <TerminalStatusBar />
        </div>
        <TerminalFocusCard />
      </div>
    </div>
  );
}
