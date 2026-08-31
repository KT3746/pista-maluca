import { CUP_POINTS } from "../config";
import type { KartId, TrackId } from "../types";
import type { RaceResultRow } from "./types";

export interface CupRow {
  id: string;
  name: string;
  kartId: KartId;
  isPlayer: boolean;
  points: number;
  wins: number;
}

export class Championship {
  tracks: TrackId[] = ["orla", "serra", "beco"];
  index = 0;
  table: CupRow[] = [];

  start(racers: { id: string; name: string; kartId: KartId; isPlayer: boolean }[]): void {
    this.index = 0;
    this.table = racers.map((r) => ({ ...r, points: 0, wins: 0 }));
  }

  apply(results: RaceResultRow[]): void {
    for (const row of results) {
      const t = this.table.find((x) => x.id === row.id);
      if (!t) continue;
      t.points += CUP_POINTS[row.place - 1] ?? 0;
      if (row.place === 1) t.wins += 1;
    }
    this.table.sort((a, b) => b.points - a.points || b.wins - a.wins);
    this.index += 1;
  }

  get currentTrack(): TrackId {
    return this.tracks[this.index];
  }

  get done(): boolean {
    return this.index >= this.tracks.length;
  }
}
