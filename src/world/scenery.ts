import * as THREE from "three";
import type { BuiltTrack } from "../tracks/types";
import { makeSkyTexture } from "./textures";

function instanceOf(geo: THREE.BufferGeometry, mat: THREE.Material, transforms: THREE.Matrix4[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, transforms.length);
  transforms.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

function plantAlong(
  track: BuiltTrack,
  every: number,
  offset: number,
  jitter: number,
  y: number,
): THREE.Matrix4[] {
  const mats: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  const main = track.samples.filter((s) => !s.shortcut);
  for (let i = 0; i < main.length; i += every) {
    const s = main[i];
    for (const side of [-1, 1]) {
      const dist = offset + (Math.sin(i * 17.1 + side) * 0.5 + 0.5) * jitter;
      dummy.position.copy(s.position).addScaledVector(s.binormal, side * (s.halfWidth + s.runoff + dist));
      dummy.position.y = s.position.y + y;
      dummy.rotation.set(0, s.progress * 40 + side, 0);
      dummy.updateMatrix();
      mats.push(dummy.matrix.clone());
    }
  }
  return mats;
}

export function decorateTrack(track: BuiltTrack, mobile: boolean): THREE.Group {
  const root = new THREE.Group();
  root.add(track.group);
  const pal = track.def.palette;

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 24, 16),
    new THREE.MeshBasicMaterial({
      map: makeSkyTexture(pal.skyTop, pal.skyHorizon),
      side: THREE.BackSide,
      fog: false,
    }),
  );
  root.add(sky);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(260, 40),
    new THREE.MeshStandardMaterial({
      color: track.def.mood === "coast" ? 0x0c1a28 : track.def.mood === "neon" ? 0x120814 : 0x2a2e28,
      roughness: 1,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.6;
  root.add(ground);

  if (track.def.mood === "coast") decorateCoast(root, track, mobile);
  if (track.def.mood === "mountain") decorateMountain(root, track, mobile);
  if (track.def.mood === "neon") decorateNeon(root, track, mobile);

  return root;
}

function decorateCoast(root: THREE.Group, track: BuiltTrack, mobile: boolean): void {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 220, 1, 1),
    new THREE.MeshStandardMaterial({
      color: 0x12304a,
      metalness: 0.55,
      roughness: 0.28,
      transparent: true,
      opacity: 0.92,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-90, -0.35, 70);
  root.add(water);

  const tower = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.8 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.2, 14, 10), stone);
  base.position.y = 7;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(3.1, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0x8b2a22 }));
  cap.position.y = 15.6;
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd27a }),
  );
  lantern.position.y = 14.4;
  tower.add(base, cap, lantern);
  const cape = track.samples.reduce((a, b) => (b.position.z > a.position.z ? b : a));
  tower.position.copy(cape.position).addScaledVector(cape.binormal, cape.halfWidth + 8);
  tower.position.y = cape.position.y;
  root.add(tower);

  const light = new THREE.PointLight(0xffc56a, 18, 48, 2);
  light.position.copy(tower.position).add(new THREE.Vector3(0, 14.4, 0));
  if (!mobile) root.add(light);

  const palmTrunk = new THREE.CylinderGeometry(0.12, 0.22, 4.4, 5);
  const palmFrond = new THREE.ConeGeometry(1.6, 1.4, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f5a38, roughness: 0.8 });
  const trunks = plantAlong(track, mobile ? 18 : 10, 6, 5, 2.2);
  root.add(instanceOf(palmTrunk, trunkMat, trunks));
  const fronds = trunks.map((m) => {
    const o = new THREE.Object3D();
    o.matrix.copy(m);
    o.position.setFromMatrixPosition(m);
    o.position.y += 2.4;
    o.rotation.y = o.position.x;
    o.updateMatrix();
    return o.matrix.clone();
  });
  root.add(instanceOf(palmFrond, leafMat, fronds));

  addLamps(root, track, 0xffc56a, mobile);
}

function decorateMountain(root: THREE.Group, track: BuiltTrack, mobile: boolean): void {
  const pine = new THREE.ConeGeometry(1.8, 6.2, 6);
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x1d3324, roughness: 1 });
  root.add(instanceOf(pine, pineMat, plantAlong(track, mobile ? 14 : 8, 7, 8, 3.1)));

  const rock = new THREE.DodecahedronGeometry(1.6, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5b5852, roughness: 1 });
  root.add(instanceOf(rock, rockMat, plantAlong(track, 16, 4.5, 3, 0.6)));

  const tunnelSamples = track.samples.filter((s) => !s.shortcut && s.progress > 0.48 && s.progress < 0.62);
  if (tunnelSamples.length > 4) {
    const path = new THREE.CatmullRomCurve3(tunnelSamples.map((s) => s.position.clone().add(new THREE.Vector3(0, 2.4, 0))));
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(path, Math.max(12, tunnelSamples.length), 5.4, 10, false),
      new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.9, side: THREE.BackSide }),
    );
    root.add(tube);
  }
  addLamps(root, track, 0xffd9a0, mobile);
}

function decorateNeon(root: THREE.Group, track: BuiltTrack, mobile: boolean): void {
  const mats: THREE.Matrix4[] = [];
  const neonMats: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  const main = track.samples.filter((s) => !s.shortcut);
  const step = mobile ? 10 : 6;
  for (let i = 0; i < main.length; i += step) {
    const s = main[i];
    for (const side of [-1, 1]) {
      dummy.position.copy(s.position).addScaledVector(s.binormal, side * (s.halfWidth + 4.2));
      dummy.position.y = s.position.y + 4.6;
      dummy.rotation.set(0, Math.atan2(s.tangent.x, s.tangent.z) + Math.PI / 2, 0);
      dummy.scale.set(3.4, 5 + ((i * 3) % 5), 2.6);
      dummy.updateMatrix();
      mats.push(dummy.matrix.clone());
      dummy.position.y += dummy.scale.y * 0.42;
      dummy.scale.set(2.2, 0.18, 0.2);
      dummy.updateMatrix();
      neonMats.push(dummy.matrix.clone());
    }
  }
  root.add(
    instanceOf(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x161018, roughness: 0.7, metalness: 0.15 }),
      mats,
    ),
  );
  root.add(
    instanceOf(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xff2d7b }),
      neonMats.filter((_, i) => i % 2 === 0),
    ),
  );
  root.add(
    instanceOf(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x2de2ff }),
      neonMats.filter((_, i) => i % 2 === 1),
    ),
  );

  if (!mobile) {
    const a = new THREE.PointLight(0xff2d7b, 10, 28, 2);
    a.position.set(20, 6, 30);
    const b = new THREE.PointLight(0x2de2ff, 10, 28, 2);
    b.position.set(-20, 6, 10);
    root.add(a, b);
  }
}

function addLamps(root: THREE.Group, track: BuiltTrack, color: number, mobile: boolean): void {
  const pole = new THREE.CylinderGeometry(0.07, 0.09, 5.2, 5);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.4, roughness: 0.4 });
  const lamp = new THREE.SphereGeometry(0.18, 6, 6);
  const lampMat = new THREE.MeshBasicMaterial({ color });
  const poles = plantAlong(track, mobile ? 22 : 14, 1.6, 0.2, 2.6);
  root.add(instanceOf(pole, poleMat, poles));
  const heads = poles.map((m) => {
    const o = new THREE.Object3D();
    o.matrix.copy(m);
    o.position.setFromMatrixPosition(m);
    o.position.y += 2.6;
    o.updateMatrix();
    return o.matrix.clone();
  });
  root.add(instanceOf(lamp, lampMat, heads));
}

export function makeLights(track: BuiltTrack, mobile: boolean): THREE.Group {
  const g = new THREE.Group();
  const pal = track.def.palette;
  const hemi = new THREE.HemisphereLight(pal.ambient, pal.hemiGround, mobile ? 0.7 : 0.9);
  const dir = new THREE.DirectionalLight(pal.sun, mobile ? 0.7 : 1.05);
  dir.position.set(pal.sunDir[0] * 40, pal.sunDir[1] * 40, pal.sunDir[2] * 40);
  if (!mobile) {
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 2;
    dir.shadow.camera.far = 160;
    dir.shadow.camera.left = -50;
    dir.shadow.camera.right = 50;
    dir.shadow.camera.top = 50;
    dir.shadow.camera.bottom = -50;
  }
  g.add(hemi, dir);
  return g;
}
