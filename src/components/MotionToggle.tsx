// src/components/MotionToggle.tsx
import { useMotionStore } from '@/stores/motion';

/** On-page reduced-motion control (adds to, never overrides, the OS pref). */
export function MotionToggle() {
  const userReduced = useMotionStore((s) => s.userReduced);
  const toggleUserReduced = useMotionStore((s) => s.toggleUserReduced);

  return (
    <button
      type="button"
      className="motion-toggle"
      aria-pressed={userReduced}
      onClick={toggleUserReduced}
      title="Toggle reduced motion"
    >
      reduce motion
    </button>
  );
}
