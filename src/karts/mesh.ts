import * as THREE from "three";
import type { KartDef } from "../types";

function mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.38,
    metalness: 0.22,
    emissive: new THREE.Color(color).multiplyScalar(0.08),
    ...extra,
  });
}

function wheel(wide: number, radius: number): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, wide, 16),
    new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.92, metalness: 0.05 }),
  );
  tire.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, wide + 0.05, 12),
    new THREE.MeshStandardMaterial({ color: 0xd8dee6, metalness: 0.78, roughness: 0.22 }),
  );
  rim.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, wide + 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.55, roughness: 0.3 }),
  );
  hub.rotation.z = Math.PI / 2;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.48, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a9098, metalness: 0.6, roughness: 0.28 }),
  );
  disc.rotation.y = Math.PI / 2;
  disc.position.x = wide * 0.52;
  const disc2 = disc.clone();
  disc2.position.x = -wide * 0.52;
  disc2.rotation.y = -Math.PI / 2;
  g.add(tire, rim, hub, disc, disc2);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return g;
}

function fender(paint: THREE.Material, x: number, z: number, wide: boolean): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(wide ? 0.42 : 0.34, 0.16, 0.62), paint);
  m.position.set(x, 0.46, z);
  return m;
}

export function createKartMesh(def: KartDef): THREE.Group {
  const root = new THREE.Group();
  root.frustumCulled = false;
  const paint = mat(def.paint);
  const accent = mat(def.accent, { metalness: 0.4, roughness: 0.28, emissive: new THREE.Color(def.accent).multiplyScalar(0.16) });
  const dark = mat(def.cabin, { roughness: 0.55, metalness: 0.12, emissive: new THREE.Color(0x000000) });
  const glass = new THREE.MeshStandardMaterial({
    color: "#7ec8de",
    transparent: true,
    opacity: 0.42,
    metalness: 0.7,
    roughness: 0.08,
  });

  const pan = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.1, 2.15), dark);
  pan.position.y = 0.22;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.26, 1.95), paint);
  chassis.position.y = 0.38;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.2, 0.7), paint);
  nose.position.set(0, 0.36, 1.12);
  nose.rotation.x = 0.18;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.2, 0.55), paint);
  tail.position.set(0, 0.36, -1.05);
  root.add(pan, chassis, nose, tail);

  if (def.id === "vespa") {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 1.35), paint);
    blade.position.set(0, 0.44, 1.05);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.07, 0.34), accent);
    wing.position.set(0, 0.88, -1.02);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.07), dark);
    mast.position.set(0, 0.66, -0.95);
    const side = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.14, 0.72), accent);
    side.position.set(0, 0.32, 0.08);
    root.add(blade, wing, mast, side);
  } else if (def.id === "cometa") {
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.18, 1.05), paint);
    hood.position.set(0, 0.46, 0.55);
    hood.rotation.x = 0.12;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 2.05), accent);
    stripe.position.set(0, 0.52, 0.02);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.06, 0.3), dark);
    wing.position.set(0, 0.7, -1.08);
    root.add(hood, stripe, wing);
  } else if (def.id === "guardiao") {
    chassis.scale.set(1.18, 1.12, 1.04);
    const armor = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.32, 1.55), paint);
    armor.position.set(0, 0.5, 0);
    const bull = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.16, 0.26), accent);
    bull.position.set(0, 0.38, 1.22);
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.045, 6, 10, Math.PI), dark);
    cage.rotation.x = Math.PI / 2;
    cage.position.set(0, 0.82, -0.12);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.07, 0.62), dark);
    roof.position.set(0, 1.0, -0.08);
    root.add(armor, bull, cage, roof);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.2, 2.28), paint);
    body.position.set(0, 0.34, 0.04);
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.82), paint);
    wedge.position.set(0, 0.4, 0.92);
    wedge.rotation.x = 0.22;
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 2.2), accent);
    s1.position.set(0.26, 0.46, 0);
    const s2 = s1.clone();
    s2.position.x = -0.26;
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.38), dark);
    diffuser.position.set(0, 0.22, -1.18);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.06, 0.28), accent);
    wing.position.set(0, 0.62, -1.12);
    root.add(body, wedge, s1, s2, diffuser, wing);
  }

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.38), dark);
  seat.position.set(0, 0.54, -0.18);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.26), dark);
  torso.position.set(0, 0.68, -0.12);
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.35, metalness: 0.25 }),
  );
  helmet.position.set(0, 0.88, -0.08);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI), glass);
  visor.position.set(0, 0.88, 0.02);
  visor.rotation.y = Math.PI;
  root.add(seat, torso, helmet, visor);

  const wr = def.id === "guardiao" ? 0.38 : 0.36;
  const ww = def.id === "guardiao" ? 0.32 : 0.26;
  const spreadX = def.id === "guardiao" ? 0.76 : 0.66;
  const frontZ = 0.86;
  const rearZ = -0.86;
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
    root.add(fender(paint, x, z, def.id === "guardiao"));
  }

  const lampGeo = new THREE.BoxGeometry(0.16, 0.08, 0.06);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff1c2 });
  const l1 = new THREE.Mesh(lampGeo, lampMat);
  l1.position.set(-0.28, 0.38, 1.38);
  const l2 = l1.clone();
  l2.position.x = 0.28;
  root.add(l1, l2);

  const tailMat = new THREE.MeshBasicMaterial({ color: def.accent });
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.06), tailMat);
  t1.position.set(-0.32, 0.4, -1.28);
  const t2 = t1.clone();
  t2.position.x = 0.32;
  root.add(t1, t2);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 16),
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
