import * as THREE from "three";
import type { KartDef } from "../types";

function mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.18, ...extra });
}

function wheel(wide: number, radius: number): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, wide, 14),
    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }),
  );
  tire.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, wide + 0.04, 10),
    new THREE.MeshStandardMaterial({ color: 0xc5ccd3, metalness: 0.7, roughness: 0.25 }),
  );
  rim.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, wide + 0.08, 8),
    new THREE.MeshStandardMaterial({ color: 0x22262c, metalness: 0.5, roughness: 0.35 }),
  );
  hub.rotation.z = Math.PI / 2;
  g.add(tire, rim, hub);
  return g;
}

export function createKartMesh(def: KartDef): THREE.Group {
  const root = new THREE.Group();
  const paint = mat(def.paint);
  const accent = mat(def.accent, { metalness: 0.35, roughness: 0.3 });
  const dark = mat(def.cabin, { roughness: 0.55 });
  const glass = mat("#8fd4e8", { transparent: true, opacity: 0.35, metalness: 0.6, roughness: 0.1 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 2.05), paint);
  chassis.position.y = 0.38;
  chassis.castShadow = true;
  root.add(chassis);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.08, 2.2), dark);
  floor.position.y = 0.24;
  root.add(floor);

  if (def.id === "vespa") {
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.15, 6), paint);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.42, 1.35);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.32), accent);
    wing.position.set(0, 0.92, -0.92);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), dark);
    mast.position.set(0, 0.7, -0.85);
    const side = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.16, 0.7), accent);
    side.position.set(0, 0.34, 0.1);
    root.add(nose, wing, mast, side);
  } else if (def.id === "cometa") {
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), paint);
    nose.scale.set(1, 0.55, 1.35);
    nose.position.set(0, 0.42, 0.85);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 2.1), accent);
    stripe.position.set(0, 0.54, 0.05);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.07, 0.28), dark);
    wing.position.set(0, 0.72, -0.95);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.7, 8), mat("#c5ccd3", { metalness: 0.8 }));
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(0.42, 0.32, -1.05);
    root.add(nose, stripe, wing, pipe);
  } else if (def.id === "guardiao") {
    chassis.scale.set(1.22, 1.15, 1.05);
    const armor = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.35, 1.7), paint);
    armor.position.set(0, 0.52, 0.05);
    const bull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.28), accent);
    bull.position.set(0, 0.4, 1.2);
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 10, Math.PI), dark);
    cage.rotation.x = Math.PI / 2;
    cage.position.set(0, 0.85, -0.15);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.7), dark);
    roof.position.set(0, 1.05, -0.1);
    root.add(armor, bull, cage, roof);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.22, 2.45), paint);
    body.position.set(0, 0.34, 0.05);
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.9), paint);
    wedge.position.set(0, 0.4, 0.85);
    wedge.rotation.x = 0.25;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 2.4), accent);
    stripe.position.set(0.28, 0.48, 0);
    const stripe2 = stripe.clone();
    stripe2.position.x = -0.28;
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.4), dark);
    diffuser.position.set(0, 0.22, -1.2);
    root.add(body, wedge, stripe, stripe2, diffuser);
  }

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.42), dark);
  seat.position.set(0, 0.58, -0.15);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), accent);
  helmet.position.set(0, 0.86, -0.08);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8, 0, Math.PI), glass);
  visor.position.set(0, 0.86, 0.02);
  visor.rotation.y = Math.PI;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.28), dark);
  torso.position.set(0, 0.7, -0.1);
  root.add(seat, helmet, visor, torso);

  const wr = def.id === "guardiao" ? 0.34 : 0.3;
  const ww = def.id === "guardiao" ? 0.28 : 0.22;
  const spreadX = def.id === "guardiao" ? 0.72 : 0.62;
  const frontZ = def.id === "ziper" ? 0.95 : 0.82;
  const rearZ = def.id === "ziper" ? -0.95 : -0.82;
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
  }

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 6),
    new THREE.MeshBasicMaterial({ color: def.accent }),
  );
  glow.position.set(-0.28, 0.38, -1.05);
  const glow2 = glow.clone();
  glow2.position.x = 0.28;
  root.add(glow, glow2);

  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return root;
}
