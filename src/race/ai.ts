import type { InputState } from "../types";
import { clamp, wrapPi } from "../config";
import type { BuiltTrack } from "../tracks/types";
import { queryTrack } from "../tracks/builder";
import type { Racer } from "./types";

function lookahead(track: BuiltTrack, progress: number, ahead: number) {
  let best = track.samples[0];
  let bestD = 1;
  const target = (progress + ahead) % 1;
  for (const s of track.samples) {
    const d = Math.abs(s.progress - target);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export function thinkAI(
  racer: Racer,
  others: Racer[],
  track: BuiltTrack,
  playerProgress: number,
  wantItem: () => void,
): InputState {
  const k = racer.kart;
  const q = queryTrack(track.samples, k.position);
  const look = lookahead(track, k.progress, 0.045 + Math.abs(k.speed) * 0.0012);
  const look2 = lookahead(track, k.progress, 0.09);

  let desiredLat = -Math.sign(look.curvature - 0.02) * clamp(look.curvature * 8, 0, 2.2);
  if (racer.aiStyle === "linha") desiredLat *= 1.15;
  if (racer.aiStyle === "caos") desiredLat += Math.sin(k.progress * 40) * 0.6;

  if (racer.aiStyle !== "agressivo") {
    const cut = track.samples.find(
      (s) => s.shortcut && Math.abs(s.progress - k.progress) < 0.03,
    );
    if (cut && Math.abs(k.lateral) < q.halfWidth) {
      desiredLat = cut.position.clone().sub(k.position).dot(q.right);
    }
  }

  const worldTarget = look.position.clone().addScaledVector(look.binormal, desiredLat);
  const to = worldTarget.clone().sub(k.position);
  const wantHeading = Math.atan2(to.x, to.z);
  const err = wrapPi(wantHeading - k.heading);
  const steer = clamp(err * 1.6, -1, 1);

  const sharp = look.curvature + look2.curvature;
  const drift = sharp > 0.18 && k.speed > 12 && Math.abs(steer) > 0.35;
  let throttle = 1;
  let brake = 0;
  if (sharp > 0.28 && k.speed > 18) {
    throttle = 0.35;
    brake = 0.25;
  }

  const gap = playerProgress - (k.lap + k.progress);
  if (gap > 0.35) throttle = 1;
  if (gap < -0.55) throttle *= 0.88;

  const ahead = others.find((o) => o.id !== racer.id && placeAhead(racer, o) && dist(racer, o) < 18);
  const behind = others.find((o) => o.id !== racer.id && !placeAhead(racer, o) && dist(racer, o) < 12);

  if (racer.item === "turbo" && sharp < 0.12) wantItem();
  if (racer.item === "puck" && ahead) wantItem();
  if (racer.item === "soap" && behind) wantItem();
  if (racer.item === "soot" && behind) wantItem();
  if (racer.item === "hook") wantItem();

  return { throttle, brake, steer, drift, item: false, pause: false };
}

function placeAhead(self: Racer, other: Racer): boolean {
  return other.kart.lap + other.kart.progress > self.kart.lap + self.kart.progress;
}

function dist(a: Racer, b: Racer): number {
  return a.kart.position.distanceTo(b.kart.position);
}

export function rubberBand(racer: Racer, leaderDist: number, playerDist: number): number {
  let m = 1;
  const behindLeader = leaderDist - (racer.kart.lap + racer.kart.progress);
  if (behindLeader > 0.25) m += Math.min(0.08, behindLeader * 0.06);
  if (behindLeader < -0.2) m -= Math.min(0.07, -behindLeader * 0.05);
  const vsPlayer = playerDist - (racer.kart.lap + racer.kart.progress);
  if (vsPlayer > 0.4) m += 0.03;
  if (vsPlayer < -0.45) m -= 0.03;
  if (racer.isPlayer) return 1;
  return clamp(m, 0.9, 1.09);
}
