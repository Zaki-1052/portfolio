// src/stores/signal-focus.test.ts
// The signal focus store is the seam between the contact annotations
// (writers), camera-controller's pivot tween (focusBlend owner), the two
// mail triggers (mailOpen), and the closing movement's event stamps. The
// release rule keeps a focused channel subordinate to the scroll scrub, and
// fireFinalPulse must be idempotent — SignalLines calls it every frame past
// the threshold, but the pulse fires once per forward crossing.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  SIGNAL_FOCUS_RELEASE_DELTA,
  shouldReleaseSignalFocus,
  useSignalFocusStore,
} from './signal-focus';

describe('signal focus store', () => {
  beforeEach(() => {
    useSignalFocusStore.setState({
      focusedChannel: null,
      hoveredChannel: null,
      focusBlend: 0,
      focusDepth: 0,
      hintRetired: false,
      mailOpen: false,
      signalBurst: 0,
      signalBurstFiredAtMs: null,
      finalPulseFiredAtMs: null,
    });
  });

  it('starts unfocused, hint live, mail closed, no stamps', () => {
    const s = useSignalFocusStore.getState();
    expect(s.focusedChannel).toBeNull();
    expect(s.hoveredChannel).toBeNull();
    expect(s.focusBlend).toBe(0);
    expect(s.hintRetired).toBe(false);
    expect(s.mailOpen).toBe(false);
    expect(s.signalBurst).toBe(0);
    expect(s.signalBurstFiredAtMs).toBeNull();
    expect(s.finalPulseFiredAtMs).toBeNull();
  });

  it('records the depth at the moment a channel focuses', () => {
    useSignalFocusStore.getState().setFocusedChannel('github', 0.92);
    const s = useSignalFocusStore.getState();
    expect(s.focusedChannel).toBe('github');
    expect(s.focusDepth).toBe(0.92);
  });

  it('keeps the hint through the first focus and retires it on the first release', () => {
    useSignalFocusStore.getState().setFocusedChannel('email', 0.91);
    // Visible while the first channel is open — the hint teaches the release.
    expect(useSignalFocusStore.getState().hintRetired).toBe(false);
    useSignalFocusStore.getState().setFocusedChannel(null, 0.91);
    expect(useSignalFocusStore.getState().focusedChannel).toBeNull();
    expect(useSignalFocusStore.getState().hintRetired).toBe(true);
    // Refocusing never revives it.
    useSignalFocusStore.getState().setFocusedChannel('github', 0.92);
    expect(useSignalFocusStore.getState().hintRetired).toBe(true);
  });

  it('fireSubmitSpark counts bursts and re-stamps every send', () => {
    useSignalFocusStore.getState().fireSubmitSpark(1000);
    useSignalFocusStore.getState().fireSubmitSpark(2000);
    const s = useSignalFocusStore.getState();
    expect(s.signalBurst).toBe(2);
    expect(s.signalBurstFiredAtMs).toBe(2000);
  });

  it('fireFinalPulse is idempotent — the first stamp wins until cleared', () => {
    useSignalFocusStore.getState().fireFinalPulse(1000);
    useSignalFocusStore.getState().fireFinalPulse(9999);
    expect(useSignalFocusStore.getState().finalPulseFiredAtMs).toBe(1000);
    useSignalFocusStore.getState().clearFinalPulse();
    expect(useSignalFocusStore.getState().finalPulseFiredAtMs).toBeNull();
    useSignalFocusStore.getState().fireFinalPulse(5000);
    expect(useSignalFocusStore.getState().finalPulseFiredAtMs).toBe(5000);
  });
});

describe('shouldReleaseSignalFocus', () => {
  it('holds focus for scroll drift under the threshold', () => {
    expect(shouldReleaseSignalFocus(0.92 + SIGNAL_FOCUS_RELEASE_DELTA * 0.5, 0.92)).toBe(false);
  });

  it('release is strict drift PAST the threshold (exact drift holds)', () => {
    expect(shouldReleaseSignalFocus(SIGNAL_FOCUS_RELEASE_DELTA, 0)).toBe(false);
  });

  it('releases once the user really scrolls, in either direction', () => {
    expect(shouldReleaseSignalFocus(0.92 + SIGNAL_FOCUS_RELEASE_DELTA * 1.5, 0.92)).toBe(true);
    expect(shouldReleaseSignalFocus(0.92 - SIGNAL_FOCUS_RELEASE_DELTA * 1.5, 0.92)).toBe(true);
  });
});
