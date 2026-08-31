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

  attach(camera: THREE.PerspectiveCamera, kart: KartBody, track: BuiltTrack | null = null): void {
    this.ready = false;
    camera.near = 1.15;
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
    const backDist = (portrait ? 16.4 : 11.8) + speed * 0.11 - boost * 0.45;
    const height = (portrait ? 6.4 : 4.8) + speed * 0.022;
    BACK.set(-Math.sin(kart.heading), 0, -Math.cos(kart.heading));
    FWD.set(Math.sin(kart.heading), 0, Math.cos(kart.heading));
    const right = new THREE.Vector3().crossVectors(FWD, new THREE.Vector3(0, 1, 0)).normalize();

    this.desired.copy(kart.position).addScaledVector(BACK, backDist).addScaledVector(right, portrait ? 0.35 : 0.55);
    this.desired.y = kart.position.y + height;

    const snap = paused || !this.ready;
    if (snap) camera.position.copy(this.desired);
    else {
      camera.position.x = damp(camera.position.x, this.desired.x, 5.4, dt);
      camera.position.y = damp(camera.position.y, this.desired.y, 4.8, dt);
      camera.position.z = damp(camera.position.z, this.desired.z, 5.4, dt);
    }

    const lookMeters = (portrait ? 24 : 16) + speed * 0.18;
    LOOK.copy(kart.position).addScaledVector(FWD, lookMeters);
    LOOK.y = kart.position.y + (portrait ? 1.7 : 1.35);
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
    const minDist = portrait ? 12.5 : 9.2;
    if (dist < minDist) camera.position.copy(this.desired);

    camera.up.set(0, 1, 0);
    camera.lookAt(this.look);

    const baseFov = portrait ? 40 : 50;
    const wantFov = baseFov + speed * 0.28 + boost * 7;
    this.fov = snap ? wantFov : damp(this.fov, wantFov, 3.8, dt);
    camera.fov = this.fov;
    camera.near = 1.15;
    camera.updateProjectionMatrix();
  }
}
