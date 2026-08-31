import type { ItemId, KartId, RacerInfo } from "../types";
import type { KartBody } from "../physics/kart";
import type * as THREE from "three";

export interface Racer extends RacerInfo {
  kart: KartBody;
  mesh: THREE.Group;
  item: ItemId | null;
  place: number;
  lastLapTime: number;
  bestLap: number;
  totalTime: number;
}

export interface RaceResultRow {
  id: string;
  name: string;
  kartId: KartId;
  isPlayer: boolean;
  place: number;
  totalTime: number;
  bestLap: number;
}
