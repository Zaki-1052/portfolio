// src/scales/expression/ExpressionScene.tsx
// The last band's scene — the signal origin (DESIGN-terminal-expression §5):
// the code scale's surviving cursor becomes a small emissive node radiating
// luminous contact lines into the thinning void, winding down to the site's
// sign-off. The node adopts the cursor's frozen seat via code-cursor-state
// (the §4 custody handoff); the HTML annotation layer lives in the document
// register (ExpressionAnnotations). Scene fog/clear color live in
// SceneAtmosphere.
import { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { acquireAmbientRendering } from '@/engine/render-loop';
import { SignalOriginNode } from './SignalOriginNode';
import { SignalLines } from './SignalLines';

export function ExpressionScene() {
  const reduced = useReducedMotion();

  // Idle micro-motion (cursor blink, traveling pulses/packets) only under
  // full motion — refcounted, since the code scene overlaps this one across
  // the custody handoff window.
  useEffect(() => {
    if (reduced) return undefined;
    return acquireAmbientRendering();
  }, [reduced]);

  return (
    <group>
      <SignalOriginNode />
      <SignalLines />
    </group>
  );
}
