import { clamp } from "../config";

/**
 * Shared player-right → physics steer.
 *
 * Touch on 390×844 (REVISOR, ?v=white1): drag right → kart turns screen-right.
 * Finger-right is +playerRight (stick X grows to the right).
 *
 * Physics adds `steer` to heading (FWD = sin/cos of heading). The chase cam
 * sits behind the kart looking along +heading. Three.js camera.right is then
 * world-left of that heading, so a +heading yaw reads as a LEFT turn on
 * screen. One minus maps player-right onto a screen-right yaw.
 *
 * Keyboard ArrowRight/D is also +playerRight. Same formula — they must agree.
 * Do not invert only one device.
 */
export function steerFromPlayerRight(playerRight: number): number {
  return clamp(-playerRight, -1, 1);
}

export function keyPlayerRight(left: boolean, right: boolean): number {
  return (right ? 1 : 0) - (left ? 1 : 0);
}
