import * as THREE from "three";
import type { KartDef } from "../types";

function paintMat(color: string, glow = 0.2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.34,
    metalness: 0.2,
    emissive: new THREE.Color(color).multiplyScalar(glow),
    emissiveIntensity: 0.9,
  });
}

function wheel(wide: number, radius: number): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, wide, 18),
    new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.92, metalness: 0.05 }),
  );
  tire.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, wide + 0.05, 12),
    new THREE.MeshStandardMaterial({ color: 0xd8dee6, metalness: 0.78, roughness: 0.22 }),
  );
  rim.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, wide + 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.55, roughness: 0.3 }),
  );
  hub.rotation.z = Math.PI / 2;
  g.add(tire, rim, hub);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return g;
}

function addWheels(root: THREE.Group, paint: THREE.Material, wideKart: boolean): void {
  const wr = wideKart ? 0.38 : 0.35;
  const ww = wideKart ? 0.3 : 0.24;
  const spreadX = wideKart ? 0.72 : 0.62;
  const frontZ = 0.82;
  const rearZ = -0.82;
  for (const [x, z] of [
    [-spreadX, frontZ],
    [spreadX, frontZ],
    [-spreadX, rearZ],
    [spreadX, rearZ],
  ] as const) {
    const w = wheel(ww, wr);
    w.position.set(x, wr, z);
    w.name = z > 0 ? "wheelF" : "wheelR";
    root.add(w);
    const fender = new THREE.Mesh(new THREE.BoxGeometry(wideKart ? 0.4 : 0.32, 0.14, 0.55), paint);
    fender.position.set(x, 0.48, z);
    root.add(fender);
  }
}

/**
 * Compact kart: chassis + cabin + 4 wheels. No thin blades, masts, or
 * yellow-sphere heads — those read as spikes / programmer art on phone.
 */
export function createKartMesh(def: KartDef): THREE.Group {
  const root = new THREE.Group();
  root.frustumCulled = false;
  const paint = paintMat(def.paint, 0.18);
  const accent = paintMat(def.accent, 0.12);
  const dark = new THREE.MeshStandardMaterial({
    color: def.cabin,
    roughness: 0.55,
    metalness: 0.12,
    emissive: 0x000000,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: "#3a6a7c",
    transparent: true,
    opacity: 0.55,
    metalness: 0.65,
    roughness: 0.12,
  });

  const wide = def.id === "guardiao";
  const slim = def.id === "vespa";
  const bodyW = wide ? 1.22 : slim ? 0.82 : 1.02;
  const bodyL = slim ? 1.72 : 1.88;

  const pan = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.12, 0.1, bodyL + 0.18), dark);
  pan.position.y = 0.22;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(bodyW, 0.28, bodyL), paint);
  chassis.position.y = 0.4;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.82, 0.2, 0.58), paint);
  nose.position.set(0, 0.38, bodyL * 0.52);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.9, 0.18, 0.42), paint);
  tail.position.set(0, 0.36, -bodyL * 0.48);
  root.add(pan, chassis, nose, tail);

  if (def.id === "vespa") {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.12), accent);
    bumper.position.set(0, 0.34, 1.08);
    const cowling = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.7), paint);
    cowling.position.set(0, 0.52, 0.28);
    root.add(bumper, cowling);
  } else if (def.id === "cometa") {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 1.7), accent);
    stripe.position.set(0, 0.55, 0.06);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.9), paint);
    hood.position.set(0, 0.5, 0.42);
    root.add(stripe, hood);
  } else if (def.id === "guardiao") {
    const armor = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.22, 1.35), paint);
    armor.position.set(0, 0.52, 0.04);
    const bull = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.14, 0.18), accent);
    bull.position.set(0, 0.36, 1.12);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.58), dark);
    roof.position.set(0, 0.92, -0.08);
    root.add(armor, bull, roof);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.16, 1.95), paint);
    body.position.set(0, 0.36, 0.02);
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.6), accent);
    s1.position.set(0.22, 0.48, 0);
    const s2 = s1.clone();
    s2.position.x = -0.22;
    root.add(body, s1, s2);
  }

  const wing = new THREE.Mesh(new THREE.BoxGeometry(slim ? 0.72 : wide ? 1.08 : 0.92, 0.07, 0.22), dark);
  wing.position.set(0, slim ? 0.62 : 0.68, slim ? -0.92 : -1.02);
  const wingPostL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), dark);
  wingPostL.position.set(-0.22, wing.position.y - 0.1, wing.position.z);
  const wingPostR = wingPostL.clone();
  wingPostR.position.x = 0.22;
  root.add(wing, wingPostL, wingPostR);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.36), dark);
  seat.position.set(0, 0.56, -0.16);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.24), dark);
  torso.position.set(0, 0.72, -0.1);
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0x12161c, roughness: 0.28, metalness: 0.35, emissive: 0x000000 }),
  );
  helmet.position.set(0, 0.9, -0.04);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.08), glass);
  visor.position.set(0, 0.9, 0.08);
  root.add(seat, torso, helmet, visor);

  addWheels(root, paint, wide);

  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff3c8 });
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), lampMat);
  l1.position.set(-0.24, 0.38, bodyL * 0.58 + 0.12);
  const l2 = l1.clone();
  l2.position.x = 0.24;
  root.add(l1, l2);

  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b2e });
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.06), tailMat);
  t1.position.set(-0.28, 0.4, -bodyL * 0.52 - 0.08);
  const t2 = t1.clone();
  t2.position.x = 0.28;
  root.add(t1, t2);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  shadow.name = "blobShadow";
  root.add(shadow);

  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = o.name !== "blobShadow";
      o.frustumCulled = false;
    }
  });
  return root;
}
