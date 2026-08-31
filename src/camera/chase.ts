import * as THREE from "three";
import { damp } from "../config";
import type { KartBody } from "../physics/kart";
import type { BuiltTrack } from "../tracks/types";

const TMP = new THREE.Vector3();
const BACK = new THREE.Vector3();
const FWD = new THREE.Vector3();
const LOOK = new THREE.Vector3();

function aheadOnRibbon(track: BuiltTrack | null, kart: KartBody, meters: number): THREE.Vector3 {
  LOOK.copy(kart.position);
  if (!track) {
    LOOK.x += Math.sin(kart.heading) * meters;
    LOOK.z += Math.cos(kart.heading) * meters;
    LOOK.y += 1.15;
    return LOOK;
  }
  const main = track.samples;
  const start = Math.max(0, kart.sampleIndex);
  let acc = 0;
  let idx = start;
  for (let n = 0; n < main.length; n++) {
    const a = main[idx];
    const b = main[(idx + 1) % main.length];
    const step = a.position.distanceTo(b.position);
    acc += step;
    if (acc >= meters && !a.shortcut) {
      LOOK.copy(a.position).addScaledVector(a.tangent, 0.4);
      LOOK.y += 1.2;
      return LOOK;
    }
    idx = (idx + 1) % main.length;
  }
  LOOK.copy(kart.position);
  LOOK.x += Math.sin(kart.heading) * meters;
  LOOK.z += Math.cos(kart.heading) * meters;
  LOOK.y += 1.15;
  return LOOK;
}

export class ChaseCamera {
  private look = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private shakeVec = new THREE.Vector3();
  fov = 52;

  attach(camera: THREE.PerspectiveCamera, kart: KartBody, track: BuiltTrack | null = null): void {
    this.place(camera, kart, track, true, 1 / 60);
    camera.near = 0.55;
    camera.far = 720;
    camera.updateProjectionMatrix();
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
    const backDist = (portrait ? 11.2 : 8.6) + speed * 0.09 - boost * 0.4;
    const height = (portrait ? 4.85 : 3.7) + speed * 0.028;
    BACK.set(-Math.sin(kart.heading), 0, -Math.cos(kart.heading));
    FWD.set(Math.sin(kart.heading), 0, Math.cos(kart.heading));

    this.desired.copy(kart.position).addScaledVector(BACK, backDist);
    this.desired.y = kart.position.y + height;

    if (!paused) {
      camera.position.x = damp(camera.position.x, this.desired.x, 6.4, dt);
      camera.position.y = damp(camera.position.y, this.desired.y, 5.6, dt);
      camera.position.z = damp(camera.position.z, this.desired.z, 6.4, dt);
    } else {
      camera.position.copy(this.desired);
    }

    const lookMeters = (portrait ? 16 : 12) + speed * 0.14;
    const lookTarget = aheadOnRibbon(track, kart, lookMeters);
    lookTarget.addScaledVector(FWD, 2.2);

    if (paused) {
      this.look.copy(lookTarget);
    } else {
      this.look.x = damp(this.look.x, lookTarget.x, 7.2, dt);
      this.look.y = damp(this.look.y, lookTarget.y, 7.2, dt);
      this.look.z = damp(this.look.z, lookTarget.z, 7.2, dt);
    }

    if (kart.shake > 0) {
      this.shakeVec.set((Math.random() - 0.5) * kart.shake * 0.22, (Math.random() - 0.5) * kart.shake * 0.14, 0);
      camera.position.add(this.shakeVec);
    }

    TMP.copy(camera.position).sub(kart.position);
    const tooClose = TMP.length() < (portrait ? 7.5 : 5.6);
    if (tooClose) camera.position.copy(this.desired);

    camera.up.set(0, 1, 0);
    camera.lookAt(this.look);

    const baseFov = portrait ? 48 : 54;
    const wantFov = baseFov + speed * 0.32 + boost * 8;
    this.fov = paused ? wantFov : damp(this.fov, wantFov, 4.2, dt);
    camera.fov = this.fov;
    if (camera.near < 0.5) camera.near = 0.55;
    camera.updateProjectionMatrix();
  }
}
