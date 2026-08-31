import * as THREE from "three";
import { damp } from "../config";
import type { KartBody } from "../physics/kart";
import type { BuiltTrack } from "../tracks/types";

const BACK = new THREE.Vector3();
const FWD = new THREE.Vector3();
const LOOK = new THREE.Vector3();
const RIBBON = new THREE.Vector3();

function ribbonLook(track: BuiltTrack, kart: KartBody, meters: number): THREE.Vector3 {
  const main = track.samples;
  let idx = Math.max(0, Math.min(kart.sampleIndex, main.length - 1));
  let acc = 0;
  for (let n = 0; n < main.length; n++) {
    const a = main[idx];
    const b = main[(idx + 1) % main.length];
    acc += a.position.distanceTo(b.position);
    if (acc >= meters && !a.shortcut) {
      RIBBON.copy(a.position);
      RIBBON.y += 1.35;
      return RIBBON;
    }
    idx = (idx + 1) % main.length;
  }
  RIBBON.copy(kart.position);
  RIBBON.x += Math.sin(kart.heading) * meters;
  RIBBON.z += Math.cos(kart.heading) * meters;
  RIBBON.y += 1.35;
  return RIBBON;
}

export class ChaseCamera {
  private look = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private shakeVec = new THREE.Vector3();
  fov = 46;
  private ready = false;
  private snapTime = 0;

  attach(camera: THREE.PerspectiveCamera, kart: KartBody, track: BuiltTrack | null = null): void {
    this.ready = false;
    this.snapTime = 1.25;
    camera.near = 1.35;
    camera.far = 780;
    this.place(camera, kart, track, true, 1 / 60);
    this.ready = true;
  }

  update(
    camera: THREE.PerspectiveCamera,
    kart: KartBody,
    dt: number,
    paused: boolean,
    track: BuiltTrack | null = null,
  ): void {
    this.place(camera, kart, track, paused, dt);
  }

  private place(
    camera: THREE.PerspectiveCamera,
    kart: KartBody,
    track: BuiltTrack | null,
    paused: boolean,
    dt: number,
  ): void {
    const portrait = camera.aspect < 0.78;
    const boost = kart.boostTime > 0 ? 1 : 0;
    const speed = Math.abs(kart.speed);
    const backDist = (portrait ? 18.5 : 13.2) + speed * 0.12 - boost * 0.4;
    const height = (portrait ? 5.4 : 4.2) + speed * 0.018;
    BACK.set(-Math.sin(kart.heading), 0, -Math.cos(kart.heading));
    FWD.set(Math.sin(kart.heading), 0, Math.cos(kart.heading));
    const right = new THREE.Vector3().crossVectors(FWD, new THREE.Vector3(0, 1, 0)).normalize();

    this.desired.copy(kart.position).addScaledVector(BACK, backDist).addScaledVector(right, portrait ? 0.35 : 0.55);
    this.desired.y = kart.position.y + height;

    const snap = paused || !this.ready || this.snapTime > 0;
    if (this.snapTime > 0) this.snapTime = Math.max(0, this.snapTime - dt);
    if (snap) camera.position.copy(this.desired);
    else {
      camera.position.x = damp(camera.position.x, this.desired.x, 5.4, dt);
      camera.position.y = damp(camera.position.y, this.desired.y, 4.8, dt);
      camera.position.z = damp(camera.position.z, this.desired.z, 5.4, dt);
    }

    const lookMeters = (portrait ? 28 : 18) + speed * 0.2;
    LOOK.copy(kart.position).addScaledVector(FWD, lookMeters);
    LOOK.y = kart.position.y + (portrait ? 2.15 : 1.55);
    if (track) LOOK.lerp(ribbonLook(track, kart, lookMeters), 0.5);

    if (snap) this.look.copy(LOOK);
    else {
      this.look.x = damp(this.look.x, LOOK.x, 6.2, dt);
      this.look.y = damp(this.look.y, LOOK.y, 6.2, dt);
      this.look.z = damp(this.look.z, LOOK.z, 6.2, dt);
    }

    if (kart.shake > 0) {
      this.shakeVec.set((Math.random() - 0.5) * kart.shake * 0.16, (Math.random() - 0.5) * kart.shake * 0.1, 0);
      camera.position.add(this.shakeVec);
    }

    const dist = camera.position.distanceTo(kart.position);
    const minDist = portrait ? 14.5 : 10.5;
    if (dist < minDist) camera.position.copy(this.desired);

    camera.up.set(0, 1, 0);
    camera.lookAt(this.look);

    const baseFov = portrait ? 40 : 50;
    const wantFov = baseFov + speed * 0.28 + boost * 7;
    this.fov = snap ? wantFov : damp(this.fov, wantFov, 3.8, dt);
    camera.fov = this.fov;
    camera.near = 1.35;
    camera.updateProjectionMatrix();
  }
}
