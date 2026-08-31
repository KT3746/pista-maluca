import type { Surface, TrackId } from "../types";
import * as THREE from "three";

export interface TrackSample {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  halfWidth: number;
  runoff: number;
  progress: number;
  distance: number;
  surface: Surface;
  shortcut: boolean;
  curvature: number;
}

export interface TrackQuery {
  index: number;
  sample: TrackSample;
  height: number;
  lateral: number;
  halfWidth: number;
  runoff: number;
  progress: number;
  surface: Surface;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  slope: number;
  onRibbon: boolean;
}

export interface TrackPalette {
  skyTop: string;
  skyHorizon: string;
  fog: string;
  fogDensity: number;
  asphalt: string;
  curbA: string;
  curbB: string;
  runoff: string;
  ambient: string;
  sun: string;
  sunDir: [number, number, number];
  hemiGround: string;
}

export interface AuthoredShortcut {
  points: { x: number; y: number; z: number; width?: number }[];
  surface: Surface;
  fromProgress: number;
  toProgress: number;
}

export interface TrackDef {
  id: TrackId;
  name: string;
  tagline: string;
  blurb: string;
  mood: "coast" | "mountain" | "neon";
  palette: TrackPalette;
  points: { x: number; y: number; z: number; width?: number }[];
  shortcuts: AuthoredShortcut[];
  itemBoxes: number[];
  lamps?: boolean;
}

export interface BuiltTrack {
  def: TrackDef;
  samples: TrackSample[];
  length: number;
  group: THREE.Group;
  itemBoxAnchors: THREE.Vector3[];
  startPose: { position: THREE.Vector3; heading: number };
}
