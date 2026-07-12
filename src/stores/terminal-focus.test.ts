// src/stores/terminal-focus.test.ts
// The terminal focus store is the seam between the listing rows/chips/pager
// (writers) and the status bar + CodeWindowFrame's release rule (readers).
// The release rule keeps the pager subordinate to the scroll scrub — real
// scrolling always wins — and the execute stamps are the event clock's
// source of truth: set on the forward crossing, nulled on rewind.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  TERMINAL_FOCUS_RELEASE_DELTA,
  shouldReleaseTerminalFocus,
  useTerminalFocusStore,
} from './terminal-focus';

describe('terminal focus store', () => {
  beforeEach(() => {
    useTerminalFocusStore.setState({
      openProject: null,
      openDepth: 0,
      hoveredRow: null,
      hintRetired: false,
      bootExecutedAtMs: null,
      exitExecutedAtMs: null,
    });
  });

  it('starts with no pager open, no hover, hint live, no execute stamps', () => {
    const s = useTerminalFocusStore.getState();
    expect(s.openProject).toBeNull();
    expect(s.hoveredRow).toBeNull();
    expect(s.hintRetired).toBe(false);
    expect(s.bootExecutedAtMs).toBeNull();
    expect(s.exitExecutedAtMs).toBeNull();
  });

  it('records the depth at the moment the pager opens', () => {
    useTerminalFocusStore.getState().setOpenProject('cleave', 0.78);
    const s = useTerminalFocusStore.getState();
    expect(s.openProject).toBe('cleave');
    expect(s.openDepth).toBe(0.78);
  });

  it('retires the hint permanently on first open — closing never revives it', () => {
    useTerminalFocusStore.getState().setOpenProject('metaencode', 0.79);
    expect(useTerminalFocusStore.getState().hintRetired).toBe(true);
    useTerminalFocusStore.getState().setOpenProject(null, 0.79);
    const s = useTerminalFocusStore.getState();
    expect(s.openProject).toBeNull();
    expect(s.hintRetired).toBe(true);
  });

  it('tracks hover independently of the open pager', () => {
    useTerminalFocusStore.getState().setHoveredRow('gptportal');
    expect(useTerminalFocusStore.getState().hoveredRow).toBe('gptportal');
    expect(useTerminalFocusStore.getState().openProject).toBeNull();
    useTerminalFocusStore.getState().setHoveredRow(null);
    expect(useTerminalFocusStore.getState().hoveredRow).toBeNull();
  });

  it('stamps the execute crossings and nulls them on rewind', () => {
    useTerminalFocusStore.getState().setBootExecutedAtMs(1234);
    useTerminalFocusStore.getState().setExitExecutedAtMs(5678);
    expect(useTerminalFocusStore.getState().bootExecutedAtMs).toBe(1234);
    expect(useTerminalFocusStore.getState().exitExecutedAtMs).toBe(5678);
    useTerminalFocusStore.getState().setBootExecutedAtMs(null);
    useTerminalFocusStore.getState().setExitExecutedAtMs(null);
    expect(useTerminalFocusStore.getState().bootExecutedAtMs).toBeNull();
    expect(useTerminalFocusStore.getState().exitExecutedAtMs).toBeNull();
  });
});

describe('shouldReleaseTerminalFocus', () => {
  it('holds the pager for scroll drift under the threshold', () => {
    expect(shouldReleaseTerminalFocus(0.78 + TERMINAL_FOCUS_RELEASE_DELTA * 0.5, 0.78)).toBe(false);
  });

  it('release is strict drift PAST the threshold (exact drift holds)', () => {
    // Computed as an exact drift so float noise from depth arithmetic can't
    // flip the boundary case.
    expect(shouldReleaseTerminalFocus(TERMINAL_FOCUS_RELEASE_DELTA, 0)).toBe(false);
  });

  it('releases once the user really scrolls, in either direction', () => {
    expect(shouldReleaseTerminalFocus(0.78 + TERMINAL_FOCUS_RELEASE_DELTA * 1.5, 0.78)).toBe(true);
    expect(shouldReleaseTerminalFocus(0.78 - TERMINAL_FOCUS_RELEASE_DELTA * 1.5, 0.78)).toBe(true);
  });
});
