import * as THREE from "three";

export type PerfTier = "high" | "low";

const params = (): URLSearchParams => {
  if (typeof location === "undefined") return new URLSearchParams();
  return new URLSearchParams(location.search);
};

export const forcedLowPerf = (): boolean => params().get("perf") === "low";
export const forcedHighPerf = (): boolean => params().get("perf") === "high";

/**
 * Drop pixel ratio, shadows and extra lights when the box is slow
 * (review VM, software GL) or the player asks with ?perf=low.
 */
export class PerfMonitor {
  tier: PerfTier;
  fps = 60;
  private frames = 0;
  private acc = 0;
  private lowHits = 0;
  private locked: boolean;

  constructor() {
    this.locked = forcedLowPerf() || forcedHighPerf();
    this.tier = forcedLowPerf() ? "low" : "high";
  }

  get low(): boolean {
    return this.tier === "low";
  }

  sample(dt: number): boolean {
    if (!Number.isFinite(dt) || dt <= 0) return false;
    this.acc += dt;
    this.frames += 1;
    if (this.acc < 0.75) return false;
    this.fps = this.frames / this.acc;
    this.acc = 0;
    this.frames = 0;
    if (this.locked) return false;
    if (this.fps < 25) this.lowHits += 1;
    else this.lowHits = Math.max(0, this.lowHits - 1);
    if (this.lowHits >= 2 && this.tier !== "low") {
      this.tier = "low";
      return true;
    }
    return false;
  }

  apply(renderer: THREE.WebGLRenderer): void {
    const phone =
      typeof window !== "undefined" &&
      (window.innerWidth < 820 || (window.visualViewport?.width ?? 820) < 820);
    if (this.low) {
      renderer.setPixelRatio(Math.min(1, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1) * 0.7);
      renderer.shadowMap.enabled = false;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.toneMappingExposure = 1;
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.15 : 1.75));
    renderer.shadowMap.enabled = !phone;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42;
  }
}

export function applyLowPerfScene(root: THREE.Object3D): void {
  root.traverse((o) => {
    const light = o as THREE.Light;
    if ((light as THREE.DirectionalLight).isDirectionalLight) {
      const dir = light as THREE.DirectionalLight;
      dir.castShadow = false;
      dir.intensity = Math.min(dir.intensity, 1.15);
    }
    if ((light as THREE.PointLight).isPointLight) {
      const pt = light as THREE.PointLight;
      pt.intensity *= 0.55;
      pt.distance = Math.min(pt.distance || 24, 18);
    }
    if ((light as THREE.SpotLight).isSpotLight) {
      (light as THREE.SpotLight).castShadow = false;
    }
    if (o instanceof THREE.Mesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
}
