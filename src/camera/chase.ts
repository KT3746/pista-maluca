import * as THREE from "three";
import { damp } from "../config";
import type { KartBody } from "../physics/kart";

export class ChaseCamera {
  private look = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private shakeVec = new THREE.Vector3();
  fov = 58;

  attach(camera: THREE.PerspectiveCamera, kart: KartBody): void {
    const back = new THREE.Vector3(-Math.sin(kart.heading), 0, -Math.cos(kart.heading));
    camera.position.copy(kart.position).addScaledVector(back, 6.4).add(new THREE.Vector3(0, 2.6, 0));
    this.look.copy(kart.position).add(new THREE.Vector3(0, 1.05, 0));
    camera.lookAt(this.look);
  }

  update(camera: THREE.PerspectiveCamera, kart: KartBody, dt: number, paused: boolean): void {
    const boost = kart.boostTime > 0 ? 1 : 0;
    const backDist = 6.8 + Math.abs(kart.speed) * 0.04 - boost * 0.35;
    const height = 3.15 + Math.abs(kart.speed) * 0.016;
    const back = new THREE.Vector3(-Math.sin(kart.heading), 0, -Math.cos(kart.heading));
    const fwd = new THREE.Vector3(Math.sin(kart.heading), 0, Math.cos(kart.heading));
    this.desired.copy(kart.position).addScaledVector(back, backDist).add(new THREE.Vector3(0, height, 0));
    if (paused) return;
    camera.position.x = damp(camera.position.x, this.desired.x, 7.2, dt);
    camera.position.y = damp(camera.position.y, this.desired.y, 6.4, dt);
    camera.position.z = damp(camera.position.z, this.desired.z, 7.2, dt);

    const lookTarget = kart.position.clone().addScaledVector(fwd, 6.5 + kart.speed * 0.08).add(new THREE.Vector3(0, 1.05, 0));
    this.look.x = damp(this.look.x, lookTarget.x, 8, dt);
    this.look.y = damp(this.look.y, lookTarget.y, 8, dt);
    this.look.z = damp(this.look.z, lookTarget.z, 8, dt);

    if (kart.shake > 0) {
      this.shakeVec.set((Math.random() - 0.5) * kart.shake * 0.35, (Math.random() - 0.5) * kart.shake * 0.25, 0);
      camera.position.add(this.shakeVec);
    }

    camera.lookAt(this.look);
    const wantFov = 56 + Math.abs(kart.speed) * 0.22 + boost * 7;
    this.fov = damp(this.fov, wantFov, 4, dt);
    camera.fov = this.fov;
    camera.updateProjectionMatrix();
  }
}
