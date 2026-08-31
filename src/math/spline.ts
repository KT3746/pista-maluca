import * as THREE from "three";

export interface ControlPoint {
  x: number;
  y: number;
  z: number;
  width?: number;
}

function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function sampleClosedSpline(
  points: ControlPoint[],
  samplesPerSpan = 14,
): { position: THREE.Vector3; width: number; spanT: number }[] {
  const n = points.length;
  const out: { position: THREE.Vector3; width: number; spanT: number }[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let s = 0; s < samplesPerSpan; s++) {
      const t = s / samplesPerSpan;
      out.push({
        position: new THREE.Vector3(
          cr(p0.x, p1.x, p2.x, p3.x, t),
          cr(p0.y, p1.y, p2.y, p3.y, t),
          cr(p0.z, p1.z, p2.z, p3.z, t),
        ),
        width: cr(p0.width ?? 11, p1.width ?? 11, p2.width ?? 11, p3.width ?? 11, t),
        spanT: (i + t) / n,
      });
    }
  }
  return out;
}

export function computeFrames(
  positions: THREE.Vector3[],
): { tangent: THREE.Vector3; normal: THREE.Vector3; binormal: THREE.Vector3 }[] {
  const frames = [];
  const up = new THREE.Vector3(0, 1, 0);
  let prevBinormal: THREE.Vector3 | null = null;
  for (let i = 0; i < positions.length; i++) {
    const prev = positions[(i - 1 + positions.length) % positions.length];
    const next = positions[(i + 1) % positions.length];
    const tangent = next.clone().sub(prev).normalize();
    const binormal = new THREE.Vector3().crossVectors(up, tangent);
    if (binormal.lengthSq() < 1e-5) {
      if (prevBinormal) binormal.copy(prevBinormal);
      else binormal.set(1, 0, 0);
    } else binormal.normalize();
    if (prevBinormal && binormal.dot(prevBinormal) < 0) binormal.negate();
    prevBinormal = binormal.clone();
    const normal = new THREE.Vector3().crossVectors(tangent, binormal).normalize();
    frames.push({ tangent, normal, binormal });
  }
  return frames;
}

export function pathLength(positions: THREE.Vector3[]): number {
  let len = 0;
  for (let i = 0; i < positions.length; i++) {
    len += positions[i].distanceTo(positions[(i + 1) % positions.length]);
  }
  return len;
}
