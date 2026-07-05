// src/stores/intro.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useIntroStore } from './intro';
import { useMotionStore } from './motion';

function resetStores(): void {
  useIntroStore.setState({
    phase: 'typing',
    introProgress: 0,
    typingDone: false,
    sceneReady: false,
    pushEnabled: true,
  });
  useMotionStore.setState({ osReduced: false, userReduced: false, reduced: false });
}

describe('intro store', () => {
  beforeEach(resetStores);

  it('starts in typing with zero progress', () => {
    const s = useIntroStore.getState();
    expect(s.phase).toBe('typing');
    expect(s.introProgress).toBe(0);
  });

  it('holds typing until BOTH typingDone and sceneReady, then pushes', () => {
    useIntroStore.getState().markTypingDone();
    expect(useIntroStore.getState().phase).toBe('typing');
    useIntroStore.getState().markSceneReady();
    expect(useIntroStore.getState().phase).toBe('push');
  });

  it('order does not matter for the transition', () => {
    useIntroStore.getState().markSceneReady();
    expect(useIntroStore.getState().phase).toBe('typing');
    useIntroStore.getState().markTypingDone();
    expect(useIntroStore.getState().phase).toBe('push');
  });

  it('reduced motion skips the push: typing goes straight to done', () => {
    useMotionStore.setState({ osReduced: true, userReduced: false, reduced: true });
    useIntroStore.getState().markSceneReady();
    useIntroStore.getState().markTypingDone();
    const s = useIntroStore.getState();
    expect(s.phase).toBe('done');
    expect(s.introProgress).toBe(1);
  });

  it('disablePush (WebGL fallback) marks the scene ready and skips the push', () => {
    useIntroStore.getState().disablePush();
    expect(useIntroStore.getState().phase).toBe('typing');
    useIntroStore.getState().markTypingDone();
    const s = useIntroStore.getState();
    expect(s.phase).toBe('done');
    expect(s.introProgress).toBe(1);
  });

  it('disablePush mid-push lands immediately', () => {
    useIntroStore.getState().markTypingDone();
    useIntroStore.getState().markSceneReady();
    expect(useIntroStore.getState().phase).toBe('push');
    useIntroStore.getState().disablePush();
    expect(useIntroStore.getState().phase).toBe('done');
  });

  it('finish is idempotent and clamps progress', () => {
    useIntroStore.getState().finish();
    useIntroStore.getState().finish();
    const s = useIntroStore.getState();
    expect(s.phase).toBe('done');
    expect(s.introProgress).toBe(1);
    useIntroStore.getState().setIntroProgress(2);
    expect(useIntroStore.getState().introProgress).toBe(1);
    useIntroStore.getState().setIntroProgress(-1);
    expect(useIntroStore.getState().introProgress).toBe(0);
  });

  it('late signals after done never regress the phase', () => {
    useIntroStore.getState().finish();
    useIntroStore.getState().markTypingDone();
    useIntroStore.getState().markSceneReady();
    expect(useIntroStore.getState().phase).toBe('done');
  });
});
