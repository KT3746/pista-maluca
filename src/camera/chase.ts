import * as THREE from "three";
import { clamp, damp } from "../config";
import type { KartBody } from "../physics/kart";
import { queryTrack } from "../tracks/builder";
import type { BuiltTrack } from "../tracks/types";

/** Close enough to see the kart, far enough that walls never eat the near plane. */
export const RACE_NEAR = 0.28;
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

function keepInsideRibbon(point: THREE.Vector3, track: BuiltTrack, phone: boolean): void {
  const q = queryTrack(track.samples, point);
  if (!Number.isFinite(q.lateral) || !isFiniteVec(q.right)) return;
  const maxLat = q.halfWidth + Math.min(1.15, q.runoff * 0.25);
  if (Math.abs(q.lateral) > maxLat) {
    point.addScaledVector(q.right, -Math.sign(q.lateral) * (Math.abs(q.lateral) - maxLat));
  }
  if (Number.isFinite(q.height)) {
    point.y = Math.max(point.y, q.height + (phone ? 3.4 : 2.55));
  }
}

/**
 * Third-person chase: sit behind and a little above the kart, look down the
 * ribbon — never parked on the roof looking into the asphalt.
 *
 * A singular lookAt (eye == target, or NaN heading) used to write NaNs into
 * the view matrix. On many GPUs that blows the frame to white and can drop
 * the WebGL context; we refuse to lookAt a degenerate pair.
 */
export class ChaseCamera {
  private look = new THREE.Vector3();
  private desired = new THREE.Vector3();
  fov = 48;
  private snapTime = 0;

  attach(camera: THREE.PerspectiveCamera, kart: KartBody, track: BuiltTrack | null = null): void {
    this.snapTime = 2.2;
    camera.near = RACE_NEAR;
    camera.far = RACE_FAR;
    this.place(camera, kart, true, 1 / 60, track);
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
    const phone = typeof window !== "undefined" && window.innerWidth < 820;
    const heading = Number.isFinite(kart.heading) ? kart.heading : 0;
    const speed = Number.isFinite(kart.speed) ? Math.min(Math.abs(kart.speed), 48) : 0;
    const boost = kart.boostTime > 0 ? 1 : 0;
    const back = (phone ? 16.8 : 11.8) + speed * 0.1;
    const height = (phone ? 5.6 : 3.55) + speed * 0.014;
    const ahead = (phone ? 26 : 16) + speed * 0.16;
    const sin = Math.sin(heading);
    const cos = Math.cos(heading);
    const px = Number.isFinite(kart.position.x) ? kart.position.x : 0;
    const py = Number.isFinite(kart.position.y) ? kart.position.y : 0;
    const pz = Number.isFinite(kart.position.z) ? kart.position.z : 0;

    this.desired.set(px - sin * back, py + height, pz - cos * back);
    if (track) keepInsideRibbon(this.desired, track, phone);

    LOOK_TARGET.set(px + sin * ahead, py + (phone ? 1.55 : 1.2), pz + cos * ahead);

    const snap = paused || this.snapTime > 0;
    if (this.snapTime > 0) this.snapTime = Math.max(0, this.snapTime - dt);

    if (snap || !isFiniteVec(camera.position) || !isFiniteVec(this.look) || !isFiniteVec(this.desired)) {
      camera.position.copy(this.desired);
      this.look.copy(LOOK_TARGET);
    } else {
      camera.position.x = damp(camera.position.x, this.desired.x, 5.8, dt);
      camera.position.y = damp(camera.position.y, this.desired.y, 5.2, dt);
      camera.position.z = damp(camera.position.z, this.desired.z, 5.8, dt);
      this.look.x = damp(this.look.x, LOOK_TARGET.x, 6.4, dt);
      this.look.y = damp(this.look.y, LOOK_TARGET.y, 6.4, dt);
      this.look.z = damp(this.look.z, LOOK_TARGET.z, 6.4, dt);
    }

    if (track) keepInsideRibbon(camera.position, track, phone);

    const minDist = phone ? 13.5 : 8.5;
    const dx = camera.position.x - px;
    const dy = camera.position.y - py;
    const dz = camera.position.z - pz;
    if (!isFiniteVec(camera.position) || dx * dx + dy * dy + dz * dz < minDist * minDist) {
      camera.position.copy(this.desired);
    }

    if (!isFiniteVec(this.look) || camera.position.distanceToSquared(this.look) < 0.25) {
      this.look.set(px + sin * 14, py + 1.2, pz + cos * 14);
    }

    // If look is almost straight up/down, nudge it forward so lookAt stays stable.
    VIEW.copy(this.look).sub(camera.position);
    const horiz = VIEW.x * VIEW.x + VIEW.z * VIEW.z;
    if (horiz < 0.04) {
      this.look.x = camera.position.x + sin * 12;
      this.look.z = camera.position.z + cos * 12;
    }

    camera.up.set(0, 1, 0);
    camera.lookAt(this.look);

    if (!matrixIsFinite(camera.matrix) || !isFiniteVec(camera.position)) {
      camera.position.set(px - sin * back, py + height, pz - cos * back);
      camera.up.set(0, 1, 0);
      camera.lookAt(px + sin * 14, py + 1.2, pz + cos * 14);
      if (!matrixIsFinite(camera.matrix)) {
        camera.quaternion.identity();
        camera.rotation.set(0, heading, 0);
        camera.position.set(px - sin * back, py + height, pz - cos * back);
      }
    }

    const wantFov = 52 + speed * 0.22 + boost * 5;
    this.fov = snap ? wantFov : damp(this.fov, wantFov, 3.6, dt);
    if (!Number.isFinite(this.fov)) this.fov = 52;
    camera.fov = clamp(this.fov, 40, 72);
    camera.near = RACE_NEAR;
    camera.far = RACE_FAR;
    camera.updateProjectionMatrix();
  }
}
