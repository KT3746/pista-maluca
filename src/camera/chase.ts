import * as THREE from "three";
import { damp } from "../config";
import type { KartBody } from "../physics/kart";
import type { BuiltTrack } from "../tracks/types";

/**
 * Third-person chase: sit behind and a little above the kart, look down the
 * ribbon — never parked on the roof looking into the asphalt.
 */
export class ChaseCamera {
  private look = new THREE.Vector3();
  private desired = new THREE.Vector3();
  fov = 48;
  private snapTime = 0;

  attach(camera: THREE.PerspectiveCamera, kart: KartBody, _track: BuiltTrack | null = null): void {
    this.snapTime = 2.2;
    camera.near = 0.85;
    camera.far = 800;
    this.place(camera, kart, true, 1 / 60);
  }

  update(
    camera: THREE.PerspectiveCamera,
    kart: KartBody,
    dt: number,
    paused: boolean,
    _track: BuiltTrack | null = null,
  ): void {
    this.place(camera, kart, paused, dt);
  }

  private place(camera: THREE.PerspectiveCamera, kart: KartBody, paused: boolean, dt: number): void {
    const phone = typeof window !== "undefined" && window.innerWidth < 820;
    const speed = Math.abs(kart.speed);
    const boost = kart.boostTime > 0 ? 1 : 0;
    const back = (phone ? 14.5 : 11.5) + speed * 0.1;
    const height = (phone ? 3.85 : 3.35) + speed * 0.012;
    const ahead = (phone ? 22 : 16) + speed * 0.16;
    const sin = Math.sin(kart.heading);
    const cos = Math.cos(kart.heading);

    this.desired.set(
      kart.position.x - sin * back,
      kart.position.y + height,
      kart.position.z - cos * back,
    );
    const lookTarget = new THREE.Vector3(
      kart.position.x + sin * ahead,
      kart.position.y + 1.15,
      kart.position.z + cos * ahead,
    );

    const snap = paused || this.snapTime > 0;
    if (this.snapTime > 0) this.snapTime = Math.max(0, this.snapTime - dt);

    if (snap) {
      camera.position.copy(this.desired);
      this.look.copy(lookTarget);
    } else {
      camera.position.x = damp(camera.position.x, this.desired.x, 5.8, dt);
      camera.position.y = damp(camera.position.y, this.desired.y, 5.2, dt);
      camera.position.z = damp(camera.position.z, this.desired.z, 5.8, dt);
      this.look.x = damp(this.look.x, lookTarget.x, 6.4, dt);
      this.look.y = damp(this.look.y, lookTarget.y, 6.4, dt);
      this.look.z = damp(this.look.z, lookTarget.z, 6.4, dt);
    }

    if (camera.position.distanceTo(kart.position) < (phone ? 11 : 8.5)) {
      camera.position.copy(this.desired);
    }

    camera.up.set(0, 1, 0);
    camera.lookAt(this.look);
    const wantFov = (phone ? 46 : 52) + speed * 0.26 + boost * 6;
    this.fov = snap ? wantFov : damp(this.fov, wantFov, 3.6, dt);
    camera.fov = this.fov;
    camera.near = 0.85;
    camera.updateProjectionMatrix();
  }
}
