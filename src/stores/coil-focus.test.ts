// src/stores/coil-focus.test.ts
// The coil focus store is the seam between the region-bead click handler /
// dev panel (writers) and the CoilMesh unwind engine + dim uniforms
// (readers). The release rule keeps click-driven focus from ever fighting
// the scroll-driven deterministic scrub.
import { beforeEach, describe, expect, it } from 'vitest';
import { COIL_FOCUS_RELEASE_DELTA, shouldReleaseCoilFocus, useCoilFocusStore } from './coil-focus';

describe('coil focus store', () => {
  beforeEach(() => {
    useCoilFocusStore.setState({
      focusedRegion: null,
      hoveredRegion: null,
      unwindBlend: 0,
      focusDepth: 0,
    });
  });

  it('starts unfocused and compact', () => {
    const s = useCoilFocusStore.getState();
    expect(s.focusedRegion).toBeNull();
    expect(s.unwindBlend).toBe(0);
  });

  it('records the depth at the moment focus is set', () => {
    useCoilFocusStore.getState().setFocusedRegion(1, 0.5);
    const s = useCoilFocusStore.getState();
    expect(s.focusedRegion).toBe(1);
    expect(s.focusDepth).toBe(0.5);
  });

  it('release keeps the blend value (the tween drives it down smoothly)', () => {
    useCoilFocusStore.getState().setFocusedRegion(0, 0.48);
    useCoilFocusStore.getState().setUnwindBlend(1);
    useCoilFocusStore.getState().setFocusedRegion(null, 0.48);
    const s = useCoilFocusStore.getState();
    expect(s.focusedRegion).toBeNull();
    expect(s.unwindBlend).toBe(1);
  });

  it('tracks hover independently of focus', () => {
    useCoilFocusStore.getState().setHoveredRegion(1);
    expect(useCoilFocusStore.getState().hoveredRegion).toBe(1);
    expect(useCoilFocusStore.getState().focusedRegion).toBeNull();
    useCoilFocusStore.getState().setHoveredRegion(null);
    expect(useCoilFocusStore.getState().hoveredRegion).toBeNull();
  });

  it('clamps the blend to [0, 1]', () => {
    useCoilFocusStore.getState().setUnwindBlend(1.4);
    expect(useCoilFocusStore.getState().unwindBlend).toBe(1);
    useCoilFocusStore.getState().setUnwindBlend(-0.2);
    expect(useCoilFocusStore.getState().unwindBlend).toBe(0);
  });
});

describe('shouldReleaseCoilFocus', () => {
  it('holds focus for scroll drift under the threshold', () => {
    expect(shouldReleaseCoilFocus(0.5 + COIL_FOCUS_RELEASE_DELTA * 0.5, 0.5)).toBe(false);
  });

  it('releases once the user really scrolls, in either direction', () => {
    expect(shouldReleaseCoilFocus(0.5 + COIL_FOCUS_RELEASE_DELTA * 1.5, 0.5)).toBe(true);
    expect(shouldReleaseCoilFocus(0.5 - COIL_FOCUS_RELEASE_DELTA * 1.5, 0.5)).toBe(true);
  });
});
