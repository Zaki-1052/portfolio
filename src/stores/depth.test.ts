// src/stores/depth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useDepthStore } from './depth';

describe('useDepthStore', () => {
  beforeEach(() => {
    useDepthStore.setState({
      depth: 0,
      currentScale: 'approach',
      previousScale: null,
      isTransitioning: false,
      scaleProgress: 0,
    });
  });

  it('clamps depth into [0, 1]', () => {
    useDepthStore.getState().setDepth(-0.4);
    expect(useDepthStore.getState().depth).toBe(0);
    useDepthStore.getState().setDepth(1.7);
    expect(useDepthStore.getState().depth).toBe(1);
  });

  it('derives currentScale and scaleProgress from depth', () => {
    useDepthStore.getState().setDepth(0.35);
    const s = useDepthStore.getState();
    expect(s.currentScale).toBe('cellular');
    expect(s.scaleProgress).toBeCloseTo((0.35 - 0.28) / (0.43 - 0.28), 10);
  });

  it('tracks previousScale across a boundary crossing then clears it', () => {
    const set = useDepthStore.getState().setDepth;
    set(0.2); // approach -> tissue: crossing recorded
    expect(useDepthStore.getState().currentScale).toBe('tissue');
    expect(useDepthStore.getState().previousScale).toBe('approach');
    set(0.25); // settled outside any zone
    expect(useDepthStore.getState().previousScale).toBeNull();
    set(0.28);
    expect(useDepthStore.getState().currentScale).toBe('cellular');
    expect(useDepthStore.getState().previousScale).toBe('tissue');
    set(0.4);
    expect(useDepthStore.getState().previousScale).toBeNull();
    expect(useDepthStore.getState().isTransitioning).toBe(false);
  });
});
