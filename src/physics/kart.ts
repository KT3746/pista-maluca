import * as THREE from "three";
import { clamp, damp, wrapPi } from "../config";
import type { InputState, KartStats } from "../types";
import { queryTrack } from "../tracks/builder";
import type { BuiltTrack } from "../tracks/types";

export class KartBody {
  position = new THREE.Vector3();
  heading = 0;
  roll = 0;
  speed = 0;
  yawRate = 0;
  vertVel = 0;
  airborne = false;
  onAsphalt = true;
  surfaceGrip = 1;
  lateral = 0;
  progress = 0;
  sampleIndex = 0;
  drifting = false;
  driftDir = 0;
  driftCharge = 0;
  boostTime = 0;
  slipTime = 0;
  stunTime = 0;
  invuln = 0;
  smokeTime = 0;
  magnetTime = 0;
  shake = 0;
  lap = 0;
  lapStart = 0;
  lastProgress = 0;
  finished = false;
  finishTime = 0;
  checkpoints = 0;
  wheelSpin = 0;
  offTrackTimer = 0;
  wallContact = false;
  stuckTimer = 0;
  airTime = 0;
  recoverTimer = 0;

  reset(pos: THREE.Vector3, heading: number): void {
    this.position.copy(pos);
    this.heading = heading;
    this.speed = 0;
    this.yawRate = 0;
    this.vertVel = 0;
    this.airborne = false;
    this.drifting = false;
    this.driftCharge = 0;
    this.boostTime = 0;
    this.slipTime = 0;
    this.stunTime = 0;
    this.shake = 0;
    this.lap = 0;
    this.lastProgress = 0.0;
    this.finished = false;
    this.checkpoints = 0;
    this.offTrackTimer = 0;
    this.wallContact = false;
    this.stuckTimer = 0;
    this.airTime = 0;
    this.recoverTimer = 0;
  }
}

function snapToRibbon(kart: KartBody, track: BuiltTrack): void {
  const main = track.samples.filter((x) => !x.shortcut);
  let s = main[0] ?? track.samples[0];
  let best = 1;
  for (const cand of main) {
    const d = Math.abs(cand.progress - kart.progress);
    const wrap = Math.min(d, 1 - d);
    if (wrap < best) {
      best = wrap;
      s = cand;
    }
  }
  kart.position.copy(s.position);
  kart.position.y += 0.06;
  kart.heading = Math.atan2(s.tangent.x, s.tangent.z);
  kart.speed = Math.max(4, kart.speed * 0.4);
  kart.airborne = false;
  kart.vertVel = 0;
  kart.shake = 0.28;
  kart.offTrackTimer = 0;
  kart.stuckTimer = 0;
  kart.airTime = 0;
  kart.wallContact = false;
}

const FWD = new THREE.Vector3();
const PUSH = new THREE.Vector3();

export function stepKart(
  kart: KartBody,
  input: InputState,
  stats: KartStats,
  track: BuiltTrack,
  dt: number,
): void {
  kart.invuln = Math.max(0, kart.invuln - dt);
  kart.boostTime = Math.max(0, kart.boostTime - dt);
  kart.slipTime = Math.max(0, kart.slipTime - dt);
  kart.stunTime = Math.max(0, kart.stunTime - dt);
  kart.smokeTime = Math.max(0, kart.smokeTime - dt);
  kart.magnetTime = Math.max(0, kart.magnetTime - dt);
  kart.shake = Math.max(0, kart.shake - dt);

  const stunned = kart.stunTime > 0;
  const throttle = stunned ? 0 : input.throttle;
  const brake = stunned ? 1 : input.brake;
  const steerIn = stunned ? 0 : input.steer;
  const wantDrift = !stunned && input.drift;

  const q = queryTrack(track.samples, kart.position);
  kart.sampleIndex = q.index;
  kart.progress = q.progress;
  kart.lateral = q.lateral;
  kart.onAsphalt = q.surface === "asphalt" && Math.abs(q.lateral) < q.halfWidth;
  const onRunoff = Math.abs(q.lateral) > q.halfWidth && Math.abs(q.lateral) < q.halfWidth + q.runoff;

  const away = kart.position.distanceTo(q.sample.position);
  if (Math.abs(q.lateral) > q.halfWidth + q.runoff + 3.2 || kart.position.y < -2 || away > 16) {
    snapToRibbon(kart, track);
    return;
  }

  const groundY = q.height + 0.02;
  if (!kart.airborne) {
    kart.airTime = 0;
    if (q.slope > 0.48 && kart.speed > 20 && kart.onAsphalt) {
      kart.airborne = true;
      kart.vertVel = kart.speed * q.slope * 0.32;
    } else {
      kart.position.y = damp(kart.position.y, groundY, 16, dt);
    }
  } else {
    kart.airTime += dt;
    kart.vertVel -= 26 * dt;
    kart.position.y += kart.vertVel * dt;
    if (kart.position.y <= groundY || kart.airTime > 1.6) {
      kart.position.y = groundY;
      kart.airborne = false;
      kart.vertVel = 0;
      kart.airTime = 0;
      kart.shake = Math.max(kart.shake, 0.12);
    }
  }

  let grip = stats.grip;
  if (kart.airborne) grip *= 0.08;
  else if (kart.onAsphalt) grip *= 1;
  else if (onRunoff) grip *= q.surface === "sand" ? 0.38 : 0.46;
  else grip *= 0.3;
  if (kart.slipTime > 0) grip *= 0.16;
  if (kart.drifting) grip *= 0.58;
  kart.surfaceGrip = grip;

  const top =
    (18 + stats.topSpeed * 16) *
    (kart.boostTime > 0 ? 1.36 : 1) *
    (kart.onAsphalt ? 1 : kart.airborne ? 0.95 : 0.58);
  const acc = 7 + stats.accel * 10;

  if (brake > 0.1) {
    kart.speed = Math.max(kart.speed - (32 + brake * 10) * dt, -7);
  } else if (throttle > 0.05) {
    const room = top - kart.speed;
    kart.speed += Math.max(0, room) * (acc / 18) * throttle * dt * (kart.airborne ? 0.25 : 1);
    if (kart.speed < 5) kart.speed += acc * 0.55 * throttle * dt;
  } else {
    kart.speed *= Math.exp(-0.55 * dt);
  }

  const speedNorm = clamp(Math.abs(kart.speed) / 28, 0, 1);
  let steer = steerIn * (0.55 + stats.handling * 0.7) * (1.2 - 0.55 * speedNorm);

  if (wantDrift && Math.abs(kart.speed) > 9 && Math.abs(steerIn) > 0.15 && !kart.airborne) {
    if (!kart.drifting) kart.driftDir = Math.sign(steerIn) || kart.driftDir || 1;
    kart.drifting = true;
    kart.driftCharge += dt * (0.55 + stats.drift * 0.85) * (0.65 + Math.abs(steerIn) * 0.5);
    steer += kart.driftDir * (0.42 + stats.drift * 0.25);
    kart.speed *= Math.exp(-0.07 * dt);
  } else if (kart.drifting) {
    if (kart.driftCharge > 0.52 && kart.slipTime <= 0) {
      kart.boostTime = Math.min(1.4, 0.42 + kart.driftCharge * 0.6 * stats.drift);
    }
    kart.drifting = false;
    kart.driftCharge = 0;
  }

  const steerScale = (kart.airborne ? 0.15 : 1) * clamp(grip, 0.12, 1.15);
  kart.yawRate = damp(kart.yawRate, steer * (1.1 + (1 - grip) * 0.35), 11, dt);
  kart.heading += kart.yawRate * (7.2 + Math.abs(kart.speed) * 0.16) * dt * steerScale;
  if (Math.abs(steerIn) < 0.2 && kart.onAsphalt && !kart.drifting && !kart.airborne) {
    const roadH = Math.atan2(q.tangent.x, q.tangent.z);
    kart.heading += wrapPi(roadH - kart.heading) * (1 - Math.exp(-1.7 * dt));
  }
  kart.heading = wrapPi(kart.heading);

  FWD.set(Math.sin(kart.heading), 0, Math.cos(kart.heading));
  kart.position.addScaledVector(FWD, kart.speed * dt);
  if (onRunoff && !kart.airborne) {
    kart.position.addScaledVector(q.right, -Math.sign(q.lateral) * 4.2 * dt);
  }
  if (!kart.onAsphalt && !q.sample.shortcut) {
    kart.recoverTimer += dt;
    if (kart.recoverTimer > 2.1) {
      snapToRibbon(kart, track);
      return;
    }
  } else {
    kart.recoverTimer = 0;
  }

  const q2 = queryTrack(track.samples, kart.position);
  kart.progress = q2.progress;
  kart.lateral = q2.lateral;
  const limit = q2.halfWidth + q2.runoff;
  const over = Math.abs(q2.lateral) - limit;
  if (over > 0) {
    PUSH.copy(q2.right).multiplyScalar(-Math.sign(q2.lateral) * (over + 0.12));
    kart.position.add(PUSH);
    if (!kart.wallContact) {
      kart.speed *= 0.78;
      kart.heading += -Math.sign(q2.lateral) * 0.18;
      kart.shake = Math.max(kart.shake, 0.2);
      if (kart.drifting) kart.driftCharge *= 0.35;
    }
    kart.wallContact = true;
    kart.offTrackTimer += dt;
    if (over > 3.5 || kart.offTrackTimer > 1.15) {
      snapToRibbon(kart, track);
      return;
    }
  } else {
    kart.wallContact = false;
    kart.offTrackTimer = 0;
  }

  if (!kart.onAsphalt && Math.abs(kart.speed) < 2 && throttle > 0) {
    kart.stuckTimer += dt;
    if (kart.stuckTimer > 1.4) {
      snapToRibbon(kart, track);
      return;
    }
  } else {
    kart.stuckTimer = 0;
  }

  kart.roll = damp(kart.roll, -steerIn * 0.18 - kart.yawRate * 0.08, 8, dt);
  kart.wheelSpin += kart.speed * dt * 1.8;

  updateLap(kart);
}

function updateLap(kart: KartBody): void {
  const prev = kart.lastProgress;
  const cur = kart.progress;
  if (prev > 0.82 && cur < 0.18 && kart.checkpoints >= 1) {
    kart.lap += 1;
    kart.checkpoints = 0;
  }
  if (cur > 0.45 && cur < 0.7) kart.checkpoints = Math.max(kart.checkpoints, 1);
  kart.lastProgress = cur;
}

export function raceDistance(kart: KartBody): number {
  return kart.lap + clamp(kart.progress, 0, 0.999);
}

export function collideKarts(a: KartBody, b: KartBody, wa: number, wb: number): void {
  const dx = a.position.x - b.position.x;
  const dz = a.position.z - b.position.z;
  const d2 = dx * dx + dz * dz;
  const min = 1.85;
  if (d2 > min * min || d2 < 1e-6) return;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const nz = dz / d;
  const overlap = min - d;
  const ta = wb / (wa + wb);
  const tb = wa / (wa + wb);
  a.position.x += nx * overlap * ta;
  a.position.z += nz * overlap * ta;
  b.position.x -= nx * overlap * tb;
  b.position.z -= nz * overlap * tb;
  const rel = a.speed - b.speed;
  a.speed -= rel * 0.18 * tb;
  b.speed += rel * 0.18 * ta;
  if (Math.abs(rel) > 8) {
    a.shake = Math.max(a.shake, 0.16);
    b.shake = Math.max(b.shake, 0.16);
  }
}
