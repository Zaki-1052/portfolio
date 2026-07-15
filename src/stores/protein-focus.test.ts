// src/stores/protein-focus.test.ts
// The protein focus store is the seam between the toggle UI / annotation
// labels (writers) and the ProteinMesh morph engine + dim uniforms (readers).
// The release rule keeps click-driven focus from ever fighting the scroll.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  PROTEIN_FOCUS_RELEASE_DELTA,
  shouldReleaseProteinFocus,
  useProteinFocusStore,
} from './protein-focus';

describe('protein focus store', () => {
  beforeEach(() => {
    useProteinFocusStore.setState({
      activeSystem: 'gq',
      toggleBlend: 0,
      focusedAnnotation: null,
      focusDepth: 0,
    });
  });

  it('starts with gq, no focus', () => {
    const s = useProteinFocusStore.getState();
    expect(s.activeSystem).toBe('gq');
    expect(s.toggleBlend).toBe(0);
    expect(s.focusedAnnotation).toBeNull();
  });

  it('toggles the active system', () => {
    useProteinFocusStore.getState().setActiveSystem('gi');
    expect(useProteinFocusStore.getState().activeSystem).toBe('gi');
    useProteinFocusStore.getState().setActiveSystem('gq');
    expect(useProteinFocusStore.getState().activeSystem).toBe('gq');
  });

  it('clamps the toggle blend to [0, 1]', () => {
    useProteinFocusStore.getState().setToggleBlend(1.5);
    expect(useProteinFocusStore.getState().toggleBlend).toBe(1);
    useProteinFocusStore.getState().setToggleBlend(-0.3);
    expect(useProteinFocusStore.getState().toggleBlend).toBe(0);
  });

  it('records the depth at the moment annotation focus is set', () => {
    useProteinFocusStore.getState().setFocusedAnnotation('5ht2a-md', 0.64);
    const s = useProteinFocusStore.getState();
    expect(s.focusedAnnotation).toBe('5ht2a-md');
    expect(s.focusDepth).toBe(0.64);
  });

  it('clearing focus preserves the blend value', () => {
    useProteinFocusStore.getState().setToggleBlend(0.7);
    useProteinFocusStore.getState().setFocusedAnnotation('mpro-analysis', 0.65);
    useProteinFocusStore.getState().setFocusedAnnotation(null, 0.65);
    const s = useProteinFocusStore.getState();
    expect(s.focusedAnnotation).toBeNull();
    expect(s.toggleBlend).toBe(0.7);
  });
});

describe('shouldReleaseProteinFocus', () => {
  it('holds focus for scroll drift under the threshold', () => {
    expect(shouldReleaseProteinFocus(0.64 + PROTEIN_FOCUS_RELEASE_DELTA * 0.5, 0.64)).toBe(false);
  });

  it('releases once the user really scrolls, in either direction', () => {
    expect(shouldReleaseProteinFocus(0.64 + PROTEIN_FOCUS_RELEASE_DELTA * 1.5, 0.64)).toBe(true);
    expect(shouldReleaseProteinFocus(0.64 - PROTEIN_FOCUS_RELEASE_DELTA * 1.5, 0.64)).toBe(true);
  });
});
