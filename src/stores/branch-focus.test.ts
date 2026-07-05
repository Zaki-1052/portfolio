// src/stores/branch-focus.test.ts
// The focus store is the seam between the annotation layer / fallback buttons
// (writers) and the camera controller / arbor materials (readers). The
// release rule keeps click-driven focus from ever fighting the scroll-driven
// deterministic scrub.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BRANCH_FOCUS_RELEASE_DELTA,
  shouldReleaseFocus,
  useBranchFocusStore,
} from './branch-focus';

describe('branch focus store', () => {
  beforeEach(() => {
    useBranchFocusStore.setState({
      focusedBranch: null,
      hoveredBranch: null,
      focusBlend: 0,
      focusDepth: 0,
    });
  });

  it('starts unfocused', () => {
    const s = useBranchFocusStore.getState();
    expect(s.focusedBranch).toBeNull();
    expect(s.hoveredBranch).toBeNull();
    expect(s.focusBlend).toBe(0);
  });

  it('records the depth at the moment focus is set', () => {
    useBranchFocusStore.getState().setFocusedBranch('structural', 0.37);
    const s = useBranchFocusStore.getState();
    expect(s.focusedBranch).toBe('structural');
    expect(s.focusDepth).toBe(0.37);
  });

  it('release keeps the blend value (the tween drives it down smoothly)', () => {
    useBranchFocusStore.getState().setFocusedBranch('software', 0.35);
    useBranchFocusStore.getState().setFocusBlend(1);
    useBranchFocusStore.getState().setFocusedBranch(null, 0.35);
    const s = useBranchFocusStore.getState();
    expect(s.focusedBranch).toBeNull();
    expect(s.focusBlend).toBe(1);
  });

  it('clamps the blend to [0, 1]', () => {
    useBranchFocusStore.getState().setFocusBlend(1.4);
    expect(useBranchFocusStore.getState().focusBlend).toBe(1);
    useBranchFocusStore.getState().setFocusBlend(-0.2);
    expect(useBranchFocusStore.getState().focusBlend).toBe(0);
  });

  it('tracks hover independently of focus', () => {
    useBranchFocusStore.getState().setHoveredBranch('epigenetics');
    expect(useBranchFocusStore.getState().hoveredBranch).toBe('epigenetics');
    expect(useBranchFocusStore.getState().focusedBranch).toBeNull();
  });
});

describe('shouldReleaseFocus', () => {
  it('holds focus for scroll drift under the threshold', () => {
    expect(shouldReleaseFocus(0.35 + BRANCH_FOCUS_RELEASE_DELTA * 0.5, 0.35)).toBe(false);
  });

  it('releases once the user really scrolls, in either direction', () => {
    expect(shouldReleaseFocus(0.35 + BRANCH_FOCUS_RELEASE_DELTA * 1.5, 0.35)).toBe(true);
    expect(shouldReleaseFocus(0.35 - BRANCH_FOCUS_RELEASE_DELTA * 1.5, 0.35)).toBe(true);
  });
});
