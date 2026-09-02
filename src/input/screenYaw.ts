import * as THREE from "three";
import { steerFromPlayerRight } from "./steerMap";

export type YawSample = {
  device: "key-right" | "key-left" | "stick-right" | "stick-left";
  playerRight: number;
  steer: number;
  ndcX: number;
  screenRight: boolean;
};

/**
 * Place a chase cam behind a kart, yaw by the shared mapping, project a
 * point 8 m ahead. Positive NDC x = screen-right.
 */
export function measureScreenYaw(playerRight: number, heading = 0): YawSample {
  const steer = steerFromPlayerRight(playerRight);
  const yawed = heading + steer * 0.35;
  const sin = Math.sin(heading);
  const cos = Math.cos(heading);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.45, 720);
  camera.position.set(-sin * 10, 4, -cos * 10);
  camera.up.set(0, 1, 0);
  camera.lookAt(sin * 12, 1, cos * 12);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const ahead = new THREE.Vector3(Math.sin(yawed) * 8, 0.4, Math.cos(yawed) * 8);
  ahead.project(camera);
  const ndcX = ahead.x;
  return {
    device: playerRight > 0 ? "key-right" : "key-left",
    playerRight,
    steer,
    ndcX,
    screenRight: ndcX > 0,
  };
}

export function documentSharedMapping(): {
  keyRight: YawSample;
  keyLeft: YawSample;
  stickRight: YawSample;
  stickLeft: YawSample;
  agree: boolean;
  touchPreserved: boolean;
} {
  const keyRight = { ...measureScreenYaw(1), device: "key-right" as const };
  const keyLeft = { ...measureScreenYaw(-1), device: "key-left" as const };
  const stickRight = { ...measureScreenYaw(1), device: "stick-right" as const };
  const stickLeft = { ...measureScreenYaw(-1), device: "stick-left" as const };
  const agree =
    keyRight.screenRight === stickRight.screenRight &&
    keyLeft.screenRight === stickLeft.screenRight &&
    keyRight.steer === stickRight.steer;
  const touchPreserved = stickRight.screenRight && !stickLeft.screenRight;
  return { keyRight, keyLeft, stickRight, stickLeft, agree, touchPreserved };
}
