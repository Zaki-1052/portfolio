// src/engine/scene-registry.test.ts
import { describe, it, expect } from 'vitest';
import { scalesToMount, MOUNT_MARGIN } from './scene-registry';

describe('scalesToMount', () => {
  it('mounts a single scene deep inside a band', () => {
    expect(scalesToMount(0.05)).toEqual(['approach']); // well inside [0, 0.14)
    expect(scalesToMount(0.5)).toEqual(['chromatin']); // well inside [0.43, 0.57)
  });

  it('mounts exactly the two neighbours around a boundary', () => {
    expect(scalesToMount(0.14)).toEqual(['approach', 'tissue']);
    expect(scalesToMount(0.28)).toEqual(['tissue', 'cellular']);
  });

  it('pre-mounts the next scene within the margin, before the boundary', () => {
    // 0.09 is within MOUNT_MARGIN (0.06) of the 0.14 boundary.
    expect(scalesToMount(0.09)).toEqual(['approach', 'tissue']);
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

  it('mounts the approach at the very top and expression at the very bottom', () => {
    expect(scalesToMount(0)).toContain('approach');
    expect(scalesToMount(1)).toContain('expression');
  });

  it('exposes a margin small enough to preserve the ≤2 budget', () => {
    // Bands are ≥0.14 wide; a margin ≥0.07 could mount three at once.
    expect(MOUNT_MARGIN).toBeLessThan(0.07);
  });
});
