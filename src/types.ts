export type GameMode = "quick" | "cup";

export type Surface = "asphalt" | "sand" | "dirt" | "metal";

export type ItemId = "puck" | "soap" | "turbo" | "soot" | "hook";

export type KartId = "vespa" | "cometa" | "guardiao" | "ziper";

export type TrackId = "orla" | "serra" | "beco";

export interface KartStats {
  accel: number;
  topSpeed: number;
  handling: number;
  grip: number;
  weight: number;
  drift: number;
}

export interface KartDef {
  id: KartId;
  name: string;
  role: string;
  blurb: string;
  stats: KartStats;
  paint: string;
  accent: string;
  cabin: string;
}

export interface InputState {
  throttle: number;
  brake: number;
  steer: number;
  drift: boolean;
  item: boolean;
  pause: boolean;
}

export interface RacerInfo {
  id: string;
  name: string;
  kartId: KartId;
  isPlayer: boolean;
  aiStyle: "agressivo" | "linha" | "caos";
}
