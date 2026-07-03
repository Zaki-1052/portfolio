// src/engine/scene-registry.test.ts
import { describe, it, expect } from 'vitest';
import { scalesToMount, MOUNT_MARGIN } from './scene-registry';

describe('scalesToMount', () => {
  it('mounts a single scene deep inside a band', () => {
    expect(scalesToMount(0.05)).toEqual(['tissue']); // well inside [0, 0.17)
    expect(scalesToMount(0.42)).toEqual(['chromatin']); // well inside [0.33, 0.5)
  });

  it('mounts exactly the two neighbours around a boundary', () => {
    expect(scalesToMount(0.17)).toEqual(['tissue', 'cellular']);
    expect(scalesToMount(0.33)).toEqual(['cellular', 'chromatin']);
  });

  it('pre-mounts the next scene within the margin, before the boundary', () => {
    // 0.12 is within MOUNT_MARGIN (0.06) of the 0.17 boundary.
    expect(scalesToMount(0.12)).toEqual(['tissue', 'cellular']);
  });

  it('never mounts more than two scenes anywhere in [0,1] (the ≤2 budget)', () => {
    for (let d = 0; d <= 1.0001; d += 0.001) {
      expect(scalesToMount(d).length).toBeLessThanOrEqual(2);
    }
  });

  it('always mounts at least one scene', () => {
    for (let d = 0; d <= 1.0001; d += 0.01) {
      expect(scalesToMount(d).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('mounts tissue at the very top and expression at the very bottom', () => {
    expect(scalesToMount(0)).toContain('tissue');
    expect(scalesToMount(1)).toContain('expression');
  });

  it('exposes a margin small enough to preserve the ≤2 budget', () => {
    // Bands are ≥0.16 wide; a margin >0.08 could mount three at a boundary.
    expect(MOUNT_MARGIN).toBeLessThanOrEqual(0.08);
  });
});
