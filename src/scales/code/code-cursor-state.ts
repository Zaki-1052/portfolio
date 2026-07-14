// src/scales/code/code-cursor-state.ts
// Module-level mirror of the surviving cursor — the Phase-8 handoff seam.
// CodeCursorSurvivor writes its frozen world position + cell size + liveness
// each frame; the expression band's signal-origin scene (§5.1) reads it with
// no import cycle and no store subscription (the camera-pose.ts /
// scene-fog.ts data-module pattern). The cell size rides along so the
// adopting node matches the cursor's exact footprint at the custody
// crossing, not just its point. A version counter lets readers skip idle
// frames.

const cursorState = {
  position: [0, 0, 0] as [number, number, number],
  /** Frozen character-cell extents (world units) — the adopting node's
   *  starting size. */
  width: 0,
  height: 0,
  /** True while the survivor owns the cursor (farewell hold → beyond the
   *  band boundary). Blink is the READER's concern — this is existence. */
  active: false,
  version: 0,
};

export function setCodeCursorState(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  active: boolean,
): void {
  cursorState.position[0] = x;
  cursorState.position[1] = y;
  cursorState.position[2] = z;
  cursorState.width = width;
  cursorState.height = height;
  cursorState.active = active;
  cursorState.version++;
}

export function getCodeCursorState(): {
  position: [number, number, number];
  width: number;
  height: number;
  active: boolean;
  version: number;
} {
  return cursorState;
}
