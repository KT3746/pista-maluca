import type { KartDef, KartId } from "../types";

export const KARTS: KartDef[] = [
  {
    id: "vespa",
    name: "Vespa Relâmpago",
    role: "Ágil",
    blurb: "Leve, nariz fino, entra tarde e sai cedo. Perdoa pouco o asfalto sujo.",
    stats: { accel: 0.92, topSpeed: 0.72, handling: 0.94, grip: 0.7, weight: 0.42, drift: 0.68 },
    paint: "#1ec8c0",
    accent: "#f0d448",
    cabin: "#102226",
  },
  {
    id: "cometa",
    name: "Cometa Rubi",
    role: "Equilibrado",
    blurb: "O meio-campo honesto. Acelera limpo, segura o drift e não briga com a pista.",
    stats: { accel: 0.78, topSpeed: 0.8, handling: 0.78, grip: 0.78, weight: 0.7, drift: 0.74 },
    paint: "#b4232c",
    accent: "#f0e6d0",
    cabin: "#1a1010",
  },
  {
    id: "guardiao",
    name: "Guardião Ferro",
    role: "Pesado",
    blurb: "Chassi largo, velocidade de reta e presença em toque. Direção preguiçosa.",
    stats: { accel: 0.58, topSpeed: 0.96, handling: 0.52, grip: 0.84, weight: 0.96, drift: 0.5 },
    paint: "#2b3038",
    accent: "#d4652a",
    cabin: "#111318",
  },
  {
    id: "ziper",
    name: "Zíper Noturno",
    role: "Especialista em drift",
    blurb: "Baixo, longo, feito para escorregar com intenção. A saída limpa vale ouro.",
    stats: { accel: 0.7, topSpeed: 0.76, handling: 0.7, grip: 0.62, weight: 0.58, drift: 0.98 },
    paint: "#1a1024",
    accent: "#b6ff3c",
    cabin: "#0c0a10",
  },
];

export function getKart(id: KartId): KartDef {
  const k = KARTS.find((x) => x.id === id);
  if (!k) throw new Error(`kart desconhecido: ${id}`);
  return k;
}

export const AI_NAMES = ["Áurea Volt", "Davi Rampa", "Kim Óleo"] as const;
export const AI_STYLES = ["agressivo", "linha", "caos"] as const;
