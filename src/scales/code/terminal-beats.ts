// src/scales/code/terminal-beats.ts
// The code band's session script and beat math: depth → beat, depth → typed
// characters, depth → window pose phase. Everything the terminal does on the
// SCROLL clock lives here as pure functions of depth (the two-clock rule:
// commands scrub with scroll; output prints event-driven, and the event
// thresholds are these beat depths). The farewell hold is a deliberate
// correction to the design doc's beat table: the window stays flat through
// [exitExecute, farewellHoldEnd] so the shell's farewell is readable before
// the dissolve. Pure — no three/react imports; unit-tested in isolation.
import { SCALE_BOUNDARIES } from '@/engine/scale-manager';
import { clamp, smoothstep } from '@/utils/math';

export interface TerminalBeatParams {
  /** The window enters the void — small, tilted, drifting. */
  flightStart: number;
  /** The window is flat + screen-locked; the boot command scrubs. */
  bootStart: number;
  /** Execute threshold: the listing prints (event-driven). */
  bootExecute: number;
  /** The exit command scrubs. */
  exitStart: number;
  /** Execute threshold: the farewell prints (event-driven). */
  exitExecute: number;
  /** The window holds flat so the farewell is readable. */
  farewellHoldEnd: number;
  /** The window is gone; the block cursor survives alone. */
  dissolveEnd: number;
  /** Event-driven output print duration (the fast shell dump). */
  outputPrintMs: number;
  /** Tap-response command completion duration (real-terminal speed). */
  tapCompleteMs: number;
}

// v1 defaults from the validated design (§3.1) — tuned live in leva
// (code-dev-tools) via liveTerminalBeatParams, then blessed values baked back
// here. Frozen so a dev-panel write can only ever land on the live copy.
export const TERMINAL_BEAT_DEFAULTS: Readonly<TerminalBeatParams> = Object.freeze({
  flightStart: SCALE_BOUNDARIES[5], // 0.71 — the band boundary
  bootStart: 0.735,
  bootExecute: 0.755,
  exitStart: 0.825,
  exitExecute: 0.845,
  farewellHoldEnd: 0.85,
  dissolveEnd: SCALE_BOUNDARIES[6], // 0.86 — the cursor crosses alone
  outputPrintMs: 300,
  tapCompleteMs: 220,
});

// Mutable working copy the dev panel writes into; production reads the frozen
// defaults above (the liveCameraKeyframes pattern).
export const liveTerminalBeatParams: TerminalBeatParams = { ...TERMINAL_BEAT_DEFAULTS };

// The session script. `cd projects && ls -la` (not `ls ~/projects/`) so the
// working directory is honestly ~/projects and the pager's later
// `less cleave/README.md` is path-correct — the terminal never lies.
export const BOOT_COMMAND = 'cd projects && ls -la';
export const EXIT_COMMAND = 'exit';
/** The authentic macOS login-shell farewell. */
export const FAREWELL_LINES: readonly string[] = ['logout', 'Saving session ...completed.'];

export type TerminalBeat =
  'before' | 'flight' | 'boot' | 'plateau' | 'exit' | 'farewell' | 'dissolve' | 'after';

export function terminalBeatFor(
  depth: number,
  p: TerminalBeatParams = TERMINAL_BEAT_DEFAULTS,
): TerminalBeat {
  if (depth < p.flightStart) return 'before';
  if (depth < p.bootStart) return 'flight';
  if (depth < p.bootExecute) return 'boot';
  if (depth < p.exitStart) return 'plateau';
  if (depth < p.exitExecute) return 'exit';
  if (depth < p.farewellHoldEnd) return 'farewell';
  if (depth < p.dissolveEnd) return 'dissolve';
  return 'after';
}

/** Fraction of a command beat at which the scrub completes — the finished
 *  line sits under the cursor for a breath before the execute crossing,
 *  exactly like seeing the typed command before pressing return. */
export const SCRUB_COMPLETE_FRACTION = 0.9;

/** Characters of `command` visible at `depth` for a scrub spanning
 *  [start, execute]. Monotonic in depth, saturating at the full command, and
 *  a pure function of depth — scrolling back re-derives the backspaced state. */
function charsScrubbed(depth: number, start: number, execute: number, command: string): number {
  if (execute <= start) return depth >= execute ? command.length : 0;
  const completeAt = start + (execute - start) * SCRUB_COMPLETE_FRACTION;
  const t = clamp((depth - start) / (completeAt - start), 0, 1);
  return Math.floor(t * command.length);
}

export function bootCharsTyped(
  depth: number,
  p: TerminalBeatParams = TERMINAL_BEAT_DEFAULTS,
): number {
  return charsScrubbed(depth, p.bootStart, p.bootExecute, BOOT_COMMAND);
}

export function exitCharsTyped(
  depth: number,
  p: TerminalBeatParams = TERMINAL_BEAT_DEFAULTS,
): number {
  return charsScrubbed(depth, p.exitStart, p.exitExecute, EXIT_COMMAND);
}

/**
 * The window's pose phase: 0 parked in the void → 1 locked flat on screen.
 * Rises across the arrival flight, holds EXACTLY 1 from the boot beat through
 * the farewell hold (the smoothstep edges guarantee the exact endpoints, so
 * the HTML layer's phase ≥ 0.999 gate is stable), then falls to exactly 0 by
 * the dissolve end. Both edges have zero slope, so the flight and the locked
 * plateau meet with no pop (the no-pop invariant lives in code-window-pose).
 */
export function windowPosePhase(
  depth: number,
  p: TerminalBeatParams = TERMINAL_BEAT_DEFAULTS,
): number {
  const rise = smoothstep(p.flightStart, p.bootStart, depth);
  const fall = 1 - smoothstep(p.farewellHoldEnd, p.dissolveEnd, depth);
  return rise * fall;
}

/** How far into the flight the window has fully faded in from the void. */
export const WINDOW_FADE_IN_SPAN = 0.008;

/**
 * The window's opacity envelope: a short fade-in right at the band edge (the
 * window resolves out of the void rather than popping), full through the
 * session, dissolving to exactly 0 across [farewellHoldEnd, dissolveEnd] in
 * step with the receding pose. Under reduced motion this envelope is the
 * WHOLE flight story — the pose stays settled and only opacity moves.
 */
export function windowOpacityFor(
  depth: number,
  p: TerminalBeatParams = TERMINAL_BEAT_DEFAULTS,
): number {
  const fadeIn = smoothstep(p.flightStart, p.flightStart + WINDOW_FADE_IN_SPAN, depth);
  const dissolve = 1 - smoothstep(p.farewellHoldEnd, p.dissolveEnd, depth);
  return fadeIn * dissolve;
}
