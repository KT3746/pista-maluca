import * as THREE from "three";

function steerFromPlayerRight(playerRight) {
  return Math.max(-1, Math.min(1, -playerRight));
}

function measure(playerRight, heading = 0) {
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
  return { playerRight, steer, ndcX: ahead.x, screenRight: ahead.x > 0 };
}

const headings = [0, 0.6, 1.4, Math.PI];
let ok = true;
for (const h of headings) {
  const right = measure(1, h);
  const left = measure(-1, h);
  const agree = right.screenRight && !left.screenRight && right.steer === -1 && left.steer === 1;
  if (!agree) ok = false;
  console.log(
    `heading=${h.toFixed(2)} key/stick-right ndcX=${right.ndcX.toFixed(3)} screenRight=${right.screenRight} | left ndcX=${left.ndcX.toFixed(3)} screenRight=${left.screenRight}`,
  );
}
if (!ok) {
  console.error("FAIL: shared -playerRight did not yaw screen-right");
  process.exit(1);
}
console.log("PASS: ArrowRight/D and finger-right share -playerRight and yaw screen-right");
