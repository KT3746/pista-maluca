import * as THREE from "three";
import type { BuiltTrack } from "../tracks/types";
import { queryTrack } from "../tracks/builder";
import { makeNightEnv, makeSkyTexture } from "./textures";

function instanceOf(geo: THREE.BufferGeometry, mat: THREE.Material, transforms: THREE.Matrix4[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, transforms.length);
  transforms.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  return mesh;
}

function plantAlong(
  track: BuiltTrack,
  every: number,
  offset: number,
  jitter: number,
  y: number,
  clearance = 2.4,
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
      const q = queryTrack(track.samples, dummy.position);
      if (Math.abs(q.lateral) < q.halfWidth + clearance) continue;
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
      color: track.def.mood === "coast" ? 0x1a3348 : track.def.mood === "neon" ? 0x221428 : 0x3a4038,
      roughness: 0.92,
      metalness: 0.04,
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
      color: 0x1a4a6e,
      metalness: 0.72,
      roughness: 0.18,
      envMapIntensity: 1.1,
      transparent: true,
      opacity: 0.94,
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

  const light = new THREE.PointLight(0xffc56a, 22, 56, 1.6);
  light.position.copy(tower.position).add(new THREE.Vector3(0, 14.4, 0));
  root.add(light);

  addPalms(root, track, mobile);
  addLamps(root, track, 0xffc56a, mobile);
}

function addPalms(root: THREE.Group, track: BuiltTrack, mobile: boolean): void {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d7a44, roughness: 0.72, flatShading: true });
  const trunks = plantAlong(track, mobile ? 16 : 9, 6.4, 4.2, 2.4, 3.0);
  if (!trunks.length) return;
  root.add(instanceOf(new THREE.CylinderGeometry(0.11, 0.2, 4.8, 6), trunkMat, trunks));
  const dummy = new THREE.Object3D();
  const frondMats: THREE.Matrix4[] = [];
  for (const m of trunks) {
    dummy.matrix.copy(m);
    dummy.position.setFromMatrixPosition(m);
    dummy.position.y += 2.55;
    for (let k = 0; k < 5; k++) {
      dummy.rotation.set(1.05, (k / 5) * Math.PI * 2 + dummy.position.x * 0.1, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      frondMats.push(dummy.matrix.clone());
    }
  }
  root.add(instanceOf(new THREE.ConeGeometry(0.62, 1.65, 5), leafMat, frondMats));
}

function decorateMountain(root: THREE.Group, track: BuiltTrack, mobile: boolean): void {
  const pine = new THREE.ConeGeometry(1.8, 6.2, 6);
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x2a4a32, roughness: 1 });
  const pines = plantAlong(track, mobile ? 14 : 8, 8, 6, 3.1, 3.2);
  if (pines.length) root.add(instanceOf(pine, pineMat, pines));

  const rock = new THREE.DodecahedronGeometry(1.6, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a6760, roughness: 1 });
  const rocks = plantAlong(track, 18, 6.5, 2.2, 0.6, 3.5);
  if (rocks.length) root.add(instanceOf(rock, rockMat, rocks));

  const tunnelSamples = track.samples.filter((s) => !s.shortcut && s.progress > 0.48 && s.progress < 0.62);
  const stone = new THREE.MeshStandardMaterial({ color: 0x6a6e74, roughness: 0.85 });
  for (let i = 0; i < tunnelSamples.length; i += 3) {
    const s = tunnelSamples[i];
    const hw = s.halfWidth + 1.6;
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.7, 5.2, 0.7), stone);
    left.position.copy(s.position).addScaledVector(s.binormal, -hw);
    left.position.y += 2.4;
    const right = left.clone();
    right.position.copy(s.position).addScaledVector(s.binormal, hw);
    right.position.y += 2.4;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 1.4, 0.55, 0.7), stone);
    lintel.position.copy(s.position);
    lintel.position.y += 5.1;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
    lamp.position.copy(lintel.position);
    lamp.position.y -= 0.45;
    root.add(left, right, lintel, lamp);
  }
  if (tunnelSamples.length) {
    const mid = tunnelSamples[Math.floor(tunnelSamples.length / 2)];
    const pl = new THREE.PointLight(0xffe0b0, 18, 26, 2);
    pl.position.copy(mid.position);
    pl.position.y += 3.2;
    root.add(pl);
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
      new THREE.MeshStandardMaterial({ color: 0x241820, roughness: 0.62, metalness: 0.18, emissive: 0x120814, emissiveIntensity: 0.4 }),
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

  const a = new THREE.PointLight(0xff2d7b, 12, 32, 2);
  a.position.set(20, 6, 30);
  const b = new THREE.PointLight(0x2de2ff, 12, 32, 2);
  b.position.set(-20, 6, 10);
  root.add(a, b);
  addLamps(root, track, 0xff8ad4, mobile);
}

function addLamps(root: THREE.Group, track: BuiltTrack, color: number, mobile: boolean): void {
  const pole = new THREE.CylinderGeometry(0.07, 0.09, 5.2, 5);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3e46, metalness: 0.45, roughness: 0.38 });
  const lamp = new THREE.SphereGeometry(0.22, 8, 8);
  const lampMat = new THREE.MeshBasicMaterial({ color });
  const poles = plantAlong(track, mobile ? 16 : 11, 3.4, 0.15, 2.6, 2.8);
  if (!poles.length) return;
  root.add(instanceOf(pole, poleMat, poles));
  const heads: THREE.Matrix4[] = [];
  for (const m of poles) {
    const o = new THREE.Object3D();
    o.matrix.copy(m);
    o.position.setFromMatrixPosition(m);
    o.position.y += 2.6;
    o.updateMatrix();
    heads.push(o.matrix.clone());
    track.lampPositions.push(o.position.clone());
  }
  root.add(instanceOf(lamp, lampMat, heads));
}

export function makeLights(track: BuiltTrack, _mobile: boolean): THREE.Group {
  const g = new THREE.Group();
  const pal = track.def.palette;
  const hemi = new THREE.HemisphereLight(pal.ambient, pal.hemiGround, 1.85);
  const dir = new THREE.DirectionalLight(pal.sun, 1.7);
  dir.position.set(pal.sunDir[0] * 40, pal.sunDir[1] * 40, pal.sunDir[2] * 40);
  dir.castShadow = !_mobile;
  if (dir.castShadow) {
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 2;
    dir.shadow.camera.far = 160;
    dir.shadow.camera.left = -50;
    dir.shadow.camera.right = 50;
    dir.shadow.camera.top = 50;
    dir.shadow.camera.bottom = -50;
  }
  const fill = new THREE.DirectionalLight(0x8eb0d8, 0.55);
  fill.position.set(-pal.sunDir[0] * 20, 18, -pal.sunDir[2] * 20);
  const rim = new THREE.DirectionalLight(0xffc56a, 0.35);
  rim.position.set(8, 6, -16);
  const ambient = new THREE.AmbientLight(0x4a5a72, 0.7);
  g.add(hemi, dir, fill, rim, ambient);
  return g;
}

export function makeRaceEnvironment(): THREE.CubeTexture {
  return makeNightEnv();
}
