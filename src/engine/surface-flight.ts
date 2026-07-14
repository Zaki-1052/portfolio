// src/engine/surface-flight.ts
// Module-level mirror of the `> surface_` return flight (the camera-pose.ts
// data-module pattern): SurfaceControl orchestrates the sequence (fade to
// dark → instant scroll-to-top under cover → replay the overture's push-in)
// and drives `progress` with a gsap tween; camera-controller samples
// INTRO_KEYFRAMES by this progress as a third camera track while `active`.
// Deliberately NOT the intro store — the overture's phase machine is
// designed to never re-enter 'push' after 'done', and re-entering it would
// re-mount the typed overlay. Cancel is always safe: the real scroll
// position is already 0 before the flight starts, so dropping the
// decorative track lands on sampleCamera(0, …) — the flight's own endpoint.
import { clamp } from '@/utils/math';

const flight = {
  active: false,
  progress: 0,
};

export function getSurfaceFlight(): { active: boolean; progress: number } {
  return flight;
}

export function startSurfaceFlight(): void {
  flight.active = true;
  flight.progress = 0;
}

export function setSurfaceFlightProgress(t: number): void {
  flight.progress = clamp(t, 0, 1);
}

export function cancelSurfaceFlight(): void {
  flight.active = false;
  flight.progress = 0;
}
