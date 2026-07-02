// src/stores/depth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useDepthStore } from './depth';

describe('useDepthStore', () => {
  beforeEach(() => {
    useDepthStore.setState({
      depth: 0,
      currentScale: 'tissue',
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
    useDepthStore.getState().setDepth(0.25);
    const s = useDepthStore.getState();
    expect(s.currentScale).toBe('cellular');
    expect(s.scaleProgress).toBeCloseTo((0.25 - 0.17) / (0.33 - 0.17), 10);
  });

  it('tracks previousScale across a boundary crossing then clears it', () => {
    const set = useDepthStore.getState().setDepth;
    set(0.16);
    expect(useDepthStore.getState().previousScale).toBeNull();
    set(0.17);
    expect(useDepthStore.getState().currentScale).toBe('cellular');
    expect(useDepthStore.getState().previousScale).toBe('tissue');
    set(0.3);
    expect(useDepthStore.getState().previousScale).toBeNull();
    expect(useDepthStore.getState().isTransitioning).toBe(false);
  });
});
