import * as THREE from "three";
import { clamp, damp } from "../config";
import type { KartBody } from "../physics/kart";
import { queryTrack } from "../tracks/builder";
import type { BuiltTrack } from "../tracks/types";

/** Close enough to see the kart, far enough that walls never eat the near plane. */
export const RACE_NEAR = 0.45;
export const RACE_FAR = 720;

const LOOK_TARGET = new THREE.Vector3();
const VIEW = new THREE.Vector3();

function isFiniteVec(v: THREE.Vector3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

function matrixIsFinite(m: THREE.Matrix4): boolean {
  const e = m.elements;
  for (let i = 0; i < 16; i++) if (!Number.isFinite(e[i])) return false;
  return true;
}

/**
 * If the eye falls off the asphalt (behind the kart on a curve), slide it
 * inward just enough to stay on the road. Do NOT pin it to the centerline —
 * that hid the kart after the white-out fix.
 */
function stayAboveRoad(point: THREE.Vector3, track: BuiltTrack, minHeight: number): void {
  const q = queryTrack(track.samples, point);
  if (!Number.isFinite(q.lateral) || !isFiniteVec(q.right)) return;
  const limit = Math.max(2.4, q.halfWidth * 1.05);
  const over = Math.abs(q.lateral) - limit;
  if (over > 0) {
    point.addScaledVector(q.right, -Math.sign(q.lateral) * over);
  }
  if (Number.isFinite(q.height)) {
    point.y = Math.max(point.y, q.height + minHeight);
  }
}

/**
 * Third-person chase: sit behind and a little above the kart, look down
 * the road. The kart stays centered in the lower third from countdown
 * through the race.
 *
 * Do NOT snap the eye laterally onto the ribbon — that pulled the lens
 * onto a different sample on curves and parked the kart off-screen
 * (white-out follow-up). Height may still lift off the asphalt.
 *
 * A singular lookAt (eye == target, or NaN heading) used to write NaNs
 * into the view matrix. We refuse to lookAt a degenerate pair.
 */
export class ChaseCamera {
  private look = new THREE.Vector3();
  private desired = new THREE.Vector3();
  fov = 52;
  private snapTime = 0;

  attach(camera: THREE.PerspectiveCamera, kart: KartBody, track: BuiltTrack | null = null): void {
    this.snapTime = 2.4;
    camera.near = RACE_NEAR;
    camera.far = RACE_FAR;
    this.place(camera, kart, true, 1 / 60, track);
  }

  /** Hard re-frame after a respawn so the kart never leaves the lens. */
  bump(): void {
    this.snapTime = Math.max(this.snapTime, 0.85);
  }

  update(
    camera: THREE.PerspectiveCamera,
    kart: KartBody,
    dt: number,
    paused: boolean,
    track: BuiltTrack | null = null,
  ): void {
    this.place(camera, kart, paused, dt, track);
  }

  private place(
    camera: THREE.PerspectiveCamera,
    kart: KartBody,
    paused: boolean,
    dt: number,
    track: BuiltTrack | null,
  ): void {
    const phone = typeof window !== "undefined" && (window.innerWidth < 820 || (window.visualViewport?.width ?? 820) < 820);
    const heading = Number.isFinite(kart.heading) ? kart.heading : 0;
    const speed = Number.isFinite(kart.speed) ? Math.min(Math.abs(kart.speed), 48) : 0;
    const boost = kart.boostTime > 0 ? 1 : 0;
    const back = (phone ? 11.8 : 10.2) + speed * 0.06;
    const height = (phone ? 5.4 : 4.6) + speed * 0.01;
    // Look at the kart, not the horizon. Phone pads cover the bottom ~180px,
    // so the player has to sit higher in the frame than a desktop chase.
    const ahead = (phone ? 3.4 : 5.2) + speed * 0.06;
    const lookY = phone ? 0.55 : 0.62;
    const sin = Math.sin(heading);
    const cos = Math.cos(heading);
    const px = Number.isFinite(kart.position.x) ? kart.position.x : 0;
    const py = Number.isFinite(kart.position.y) ? kart.position.y : 0;
    const pz = Number.isFinite(kart.position.z) ? kart.position.z : 0;

    // Face the kart heading — not the ribbon tangent. Mixing 75% tangent
    // walked the eye onto a different sample and hid the player.
    const backX = -sin;
    const backZ = -cos;

    this.desired.set(px + backX * back, py + height, pz + backZ * back);
    if (track) stayAboveRoad(this.desired, track, phone ? 5.4 : 4.6);

    LOOK_TARGET.set(px + sin * ahead, py + lookY, pz + cos * ahead);

    const snap = paused || this.snapTime > 0;
    if (this.snapTime > 0) this.snapTime = Math.max(0, this.snapTime - dt);

    if (snap || !isFiniteVec(camera.position) || !isFiniteVec(this.look) || !isFiniteVec(this.desired)) {
      camera.position.copy(this.desired);
      this.look.copy(LOOK_TARGET);
    } else {
      camera.position.x = damp(camera.position.x, this.desired.x, 6.4, dt);
      camera.position.y = damp(camera.position.y, this.desired.y, 5.6, dt);
      camera.position.z = damp(camera.position.z, this.desired.z, 6.4, dt);
      this.look.x = damp(this.look.x, LOOK_TARGET.x, 7.2, dt);
      this.look.y = damp(this.look.y, LOOK_TARGET.y, 7.2, dt);
      this.look.z = damp(this.look.z, LOOK_TARGET.z, 7.2, dt);
    }

    const minDist = phone ? 12.2 : 10.2;
    const dx = camera.position.x - px;
    const dy = camera.position.y - py;
    const dz = camera.position.z - pz;
    if (!isFiniteVec(camera.position) || dx * dx + dy * dy + dz * dz < minDist * minDist) {
      camera.position.copy(this.desired);
    }
    if (track) stayAboveRoad(camera.position, track, phone ? 5.4 : 4.6);

    if (!isFiniteVec(this.look) || camera.position.distanceToSquared(this.look) < 0.25) {
      this.look.set(px + sin * 8, py + lookY, pz + cos * 8);
    }

    VIEW.copy(this.look).sub(camera.position);
    const horiz = VIEW.x * VIEW.x + VIEW.z * VIEW.z;
    if (horiz < 0.04) {
      this.look.x = camera.position.x + sin * 8;
      this.look.z = camera.position.z + cos * 8;
    }

    camera.up.set(0, 1, 0);
    camera.lookAt(this.look);

    if (!matrixIsFinite(camera.matrix) || !isFiniteVec(camera.position)) {
      camera.position.set(px + backX * back, py + height, pz + backZ * back);
      camera.up.set(0, 1, 0);
      camera.lookAt(px + sin * 8, py + lookY, pz + cos * 8);
      if (!matrixIsFinite(camera.matrix)) {
        camera.quaternion.identity();
        camera.rotation.set(0, heading, 0);
        camera.position.set(px + backX * back, py + height, pz + backZ * back);
      }
    }

    const wantFov = (phone ? 50 : 48) + speed * 0.18 + boost * 4;
    this.fov = snap ? wantFov : damp(this.fov, wantFov, 3.6, dt);
    if (!Number.isFinite(this.fov)) this.fov = 50;
    camera.fov = clamp(this.fov, 42, 68);
    camera.near = RACE_NEAR;
    camera.far = RACE_FAR;
    const w = typeof window !== "undefined" ? Math.max(1, window.innerWidth) : 1280;
    const h = typeof window !== "undefined" ? Math.max(1, window.innerHeight) : 720;
    camera.aspect = w / h;
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
}
