import * as THREE from "three";

function noiseCanvas(size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas");
  paint(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeAsphalt(hex = "#1c1e24"): THREE.CanvasTexture {
  return noiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 52000; i++) {
      const v = 28 + Math.random() * 48;
      ctx.fillStyle = `rgba(${v},${v},${v + 8},${0.16 + Math.random() * 0.22})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1);
    }
    ctx.strokeStyle = "rgba(210, 220, 235, 0.06)";
    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      ctx.lineTo(Math.random() * size, Math.random() * size);
      ctx.stroke();
    }
    const g = ctx.createLinearGradient(0, 0, size, 0);
    g.addColorStop(0, "rgba(180,200,230,0)");
    g.addColorStop(0.5, "rgba(200,214,235,0.07)");
    g.addColorStop(1, "rgba(180,200,230,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size * 0.08);
  });
}

export function makeNightEnv(): THREE.CubeTexture {
  const faces = ["#1a2744", "#12182a", "#3a4c72", "#1a140e", "#243656", "#0c1018"];
  const images = faces.map((hex) => {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 16, 16);
    return c;
  });
  const tex = new THREE.CubeTexture(images);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeSand(): THREE.CanvasTexture {
  return noiseCanvas(256, (ctx, size) => {
    ctx.fillStyle = "#c4a36a";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 18000; i++) {
      const r = 160 + Math.random() * 60;
      const g = 130 + Math.random() * 50;
      const b = 70 + Math.random() * 40;
      ctx.fillStyle = `rgba(${r},${g},${b},0.35)`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
  });
}

export function makeDirt(): THREE.CanvasTexture {
  return noiseCanvas(256, (ctx, size) => {
    ctx.fillStyle = "#3a3228";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 14000; i++) {
      ctx.fillStyle = `rgba(${50 + Math.random() * 40},${40 + Math.random() * 30},${24},0.4)`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
  });
}

export function makeSkyTexture(top: string, horizon: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(0.62, horizon);
  g.addColorStop(1, "#0a0c10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
