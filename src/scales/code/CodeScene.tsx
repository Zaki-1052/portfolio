// src/scales/code/CodeScene.tsx
// The fifth band's scene — the scene-native terminal (DESIGN-terminal-
// expression §3): a macOS window that flies in as a 3D object, boots via a
// scroll-scrubbed command, parks screen-locked as the interactive HTML
// listing, then exits and dissolves — the block cursor surviving alone into
// the expression band (§4). The window is the hero; the environment (grid +
// drift motes) exists mainly to parallax behind it. Scene fog/clear color
// live in SceneAtmosphere; the HTML interior lives in the document layer
// (TerminalWindowContent) and projects onto the locked window plane.
import { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { acquireAmbientRendering } from '@/engine/render-loop';
import { CodeEnvironment } from './code-environment';
import { CodeWindowFrame } from './CodeWindowFrame';
import { CodeCursorSurvivor } from './CodeCursorSurvivor';

export function CodeScene() {
  const reduced = useReducedMotion();

  // Idle micro-motion (cursor blink, mote drift) only under full motion —
  // refcounted, since neighboring scenes overlap this one across handoffs.
  useEffect(() => {
    if (reduced) return undefined;
    return acquireAmbientRendering();
  }, [reduced]);

  return (
    <group>
      <CodeEnvironment />
      <CodeWindowFrame />
      <CodeCursorSurvivor />
    </group>
  );
}
