import * as THREE from "three";
import type { KartBody } from "../physics/kart";

export class Effects {
  group = new THREE.Group();
  private smokeGeo = new THREE.SphereGeometry(0.16, 6, 6);
  private smokeMat = new THREE.MeshBasicMaterial({ color: 0xc8c8c8, transparent: true, opacity: 0.35 });
  private boostMat = new THREE.MeshBasicMaterial({ color: 0xffc56a, transparent: true, opacity: 0.5 });
  private marks: THREE.Mesh[] = [];
  private puffs: { mesh: THREE.Mesh; life: number }[] = [];

  spawnDrift(kart: KartBody): void {
    if (!kart.drifting && kart.boostTime <= 0) return;
    if (Math.random() > 0.45) return;
    const puff = new THREE.Mesh(this.smokeGeo, kart.boostTime > 0 ? this.boostMat : this.smokeMat);
    const back = new THREE.Vector3(-Math.sin(kart.heading), 0, -Math.cos(kart.heading));
    puff.position.copy(kart.position).addScaledVector(back, 0.9);
    puff.position.y += 0.2;
    this.group.add(puff);
    this.puffs.push({ mesh: puff, life: 0.45 });

    if (kart.drifting && kart.onAsphalt) {
      const mark = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 0.7),
        new THREE.MeshBasicMaterial({ color: 0x151515, transparent: true, opacity: 0.45 }),
      );
      mark.rotation.x = -Math.PI / 2;
      mark.rotation.z = -kart.heading;
      mark.position.copy(kart.position);
      mark.position.y += 0.04;
      this.group.add(mark);
      this.marks.push(mark);
      if (this.marks.length > 80) {
        const old = this.marks.shift();
        if (old) {
          this.group.remove(old);
          old.geometry.dispose();
        }
      }
    }
  }

  update(dt: number): void {
    for (const p of this.puffs) {
      p.life -= dt;
      p.mesh.position.y += dt * 0.8;
      p.mesh.scale.addScalar(dt * 1.6);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, p.life * 0.7);
      if (p.life <= 0) this.group.remove(p.mesh);
    }
    this.puffs = this.puffs.filter((p) => p.life > 0);
  }

  clear(): void {
    this.group.clear();
    this.marks = [];
    this.puffs = [];
  }
}
