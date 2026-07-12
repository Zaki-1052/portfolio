// src/scales/code/code-cursor-state.ts
// Module-level mirror of the surviving cursor — the Phase-8 handoff seam.
// CodeCursorSurvivor writes its frozen world position + liveness each frame;
// the expression band's signal-origin scene (§5.1) reads it with no import
// cycle and no store subscription (the camera-pose.ts / scene-fog.ts data-
// module pattern). A version counter lets readers skip idle frames.

const cursorState = {
  position: [0, 0, 0] as [number, number, number],
  /** True while the survivor owns the cursor (farewell hold → beyond the
   *  band boundary). Blink is the READER's concern — this is existence. */
  active: false,
  version: 0,
};

export function setCodeCursorState(x: number, y: number, z: number, active: boolean): void {
  cursorState.position[0] = x;
  cursorState.position[1] = y;
  cursorState.position[2] = z;
  cursorState.active = active;
  cursorState.version++;
}

export function getCodeCursorState(): {
  position: [number, number, number];
  active: boolean;
  version: number;
} {
  return cursorState;
}
