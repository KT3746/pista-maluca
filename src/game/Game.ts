import * as THREE from "three";
import { AudioEngine } from "../audio/engine";
import { isMobileViewport, wantsTouchControls } from "../config";
import { Input } from "../input/input";
import { Championship } from "../race/championship";
import { Race } from "../race/race";
import type { GameMode, KartId, TrackId } from "../types";
import { UI } from "../ui/dom";
import { createKartMesh } from "../karts/mesh";
import { getKart } from "../karts/roster";

type View = "title" | "karts" | "tracks" | "race" | "results" | "standings" | "controls" | "credits";

export class Game {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  ui: UI;
  input = new Input();
  audio = new AudioEngine();
  view: View = "title";
  mode: GameMode = "quick";
  kartId: KartId = "cometa";
  trackId: TrackId = "orla";
  race: Race | null = null;
  cup = new Championship();
  muted = false;
  private menuScene = new THREE.Scene();
  private menuKart: THREE.Group | null = null;
  private clock = new THREE.Clock();
  private hidden = false;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobileViewport(),
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileViewport() ? 1.25 : 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.42;
    this.renderer.shadowMap.enabled = !isMobileViewport();
    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.55, 720);
    this.ui = new UI(uiRoot);
    this.ui.onAction = (a) => this.handle(a);
    this.input.bind(document.body);
    this.setupMenuScene();
    this.showTitle();

    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      this.hidden = document.hidden;
      if (this.race && document.hidden) this.pauseRace();
    });
    const unlock = () => {
      void this.audio.unlock();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  start(): void {
    this.clock.start();
    const loop = () => {
      requestAnimationFrame(loop);
      if (this.hidden) return;
      const dt = Math.min(0.05, this.clock.getDelta());
      this.tick(dt);
    };
    loop();
  }

  private setupMenuScene(): void {
    this.menuScene.fog = new THREE.FogExp2(0x0c1220, 0.008);
    this.menuScene.add(new THREE.HemisphereLight(0x6a7c9a, 0x3a2e20, 1.45));
    const dir = new THREE.DirectionalLight(0xf2f6fc, 1.6);
    dir.position.set(-6, 12, 10);
    this.menuScene.add(dir);
    const fill = new THREE.DirectionalLight(0xffc56a, 0.7);
    fill.position.set(8, 4, -6);
    this.menuScene.add(fill);
    const key = new THREE.PointLight(0xffe8b0, 18, 16, 1.6);
    key.position.set(1.4, 2.4, 2.2);
    this.menuScene.add(key);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(18, 36),
      new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.7, metalness: 0.12 }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.menuScene.add(floor);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 0.08, 22),
      new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.7 }),
    );
    strip.position.y = 0.04;
    this.menuScene.add(strip);
    this.swapMenuKart(this.kartId);
    this.camera.position.set(4.2, 2.4, 5.6);
    this.camera.lookAt(0, 0.6, 0);
  }

  private swapMenuKart(id: KartId): void {
    if (this.menuKart) this.menuScene.remove(this.menuKart);
    this.menuKart = createKartMesh(getKart(id));
    this.menuScene.add(this.menuKart);
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.syncChrome();
  }

  private showTitle(): void {
    this.view = "title";
    this.ui.title(this.muted);
    this.syncChrome();
  }

  private syncChrome(): void {
    const racing = this.view === "race";
    const touch = wantsTouchControls();
    document.body.classList.toggle("is-race", racing);
    document.body.classList.toggle("touch-on", touch);
    document.body.classList.toggle("is-garage", this.view === "karts");
    document.body.dataset.view = this.view;
    this.input.setRaceLock(racing);
    this.input.refreshTouchFlag();
    if (racing) this.ensureTouchLayer();
  }

  private ensureTouchLayer(): void {
    const touch = document.getElementById("touch");
    if (touch) this.input.bindTouch(touch);
  }

  private handle(a: { type: string; id?: string }): void {
    void this.audio.unlock();
    switch (a.type) {
      case "quick":
        this.mode = "quick";
        this.view = "karts";
        this.ui.karts(this.kartId, false);
        this.syncChrome();
        break;
      case "cup":
        this.mode = "cup";
        this.view = "karts";
        this.ui.karts(this.kartId, true);
        this.syncChrome();
        break;
      case "credits":
        this.view = "credits";
        this.ui.credits();
        this.syncChrome();
        break;
      case "controls":
        this.view = "controls";
        this.ui.controls();
        this.syncChrome();
        break;
      case "back":
        if (this.view === "credits" || this.view === "controls") {
          this.showTitle();
        } else if (this.view === "tracks") {
          this.view = "karts";
          this.ui.karts(this.kartId, this.mode === "cup");
          this.syncChrome();
        } else {
          this.showTitle();
        }
        break;
      case "kart":
        if (a.id) {
          this.kartId = a.id as KartId;
          this.swapMenuKart(this.kartId);
          this.ui.highlight("kart", a.id);
        }
        break;
      case "track":
        if (a.id) {
          this.trackId = a.id as TrackId;
          this.ui.highlight("track", a.id);
        }
        break;
      case "go":
        if (this.view === "karts") {
          this.view = "tracks";
          if (this.mode === "cup") {
            this.trackId = "orla";
            this.cup.start(this.previewField());
          }
          this.ui.tracks(this.trackId, this.mode === "cup");
          this.syncChrome();
        } else {
          this.bootRace();
        }
        break;
      case "resume":
        this.resumeRace();
        break;
      case "pause":
        this.togglePause();
        break;
      case "quit":
        this.leaveRace();
        break;
      case "retry":
        this.bootRace();
        break;
      case "menu":
        this.leaveRace();
        break;
      case "next":
        if (this.mode === "cup" && this.race) {
          this.cup.apply(this.race.lastResults);
          this.race.dispose();
          this.race = null;
          if (this.cup.done) {
            this.view = "standings";
            this.ui.standings(this.cup.table);
            this.syncChrome();
          } else {
            this.trackId = this.cup.currentTrack;
            this.bootRace();
          }
        }
        break;
      case "mute":
        this.muted = this.audio.toggleMute();
        if (this.view === "title") this.ui.title(this.muted);
        if (this.view === "race" && this.race?.paused) this.ui.pause(this.muted);
        break;
      default:
        break;
    }
  }

  private previewField() {
    const unused = ["vespa", "cometa", "guardiao", "ziper"].filter((id) => id !== this.kartId) as KartId[];
    return [
      { id: "you", name: "Você", kartId: this.kartId, isPlayer: true },
      { id: "ai-0", name: "Áurea Volt", kartId: unused[0], isPlayer: false },
      { id: "ai-1", name: "Davi Rampa", kartId: unused[1], isPlayer: false },
      { id: "ai-2", name: "Kim Óleo", kartId: unused[2], isPlayer: false },
    ];
  }

  private bootRace(): void {
    this.camera.clearViewOffset();
    this.camera.near = 1.15;
    this.race?.dispose();
    const params = new URLSearchParams(location.search);
    const lapsRaw = Number(params.get("laps"));
    const laps = Number.isFinite(lapsRaw) && lapsRaw > 0 && lapsRaw < 8 ? lapsRaw : undefined;
    const autoDrive = params.get("auto") === "1";
    this.race = new Race(this.trackId, this.kartId, isMobileViewport(), laps, autoDrive);
    this.race.attachCamera(this.camera);
    this.race.onCue = (kind) => {
      if (kind === "count") this.audio.countdown(this.race?.count ?? 0);
      if (kind === "go") {
        this.audio.countdown(0);
        this.ui.setCountdown("VAI!");
        setTimeout(() => this.ui.setCountdown(null), 500);
      }
      if (kind === "item") this.audio.item();
      if (kind === "hit") {
        this.audio.hit();
        if (navigator.vibrate) navigator.vibrate(24);
      }
      if (kind === "boost") this.audio.whoosh();
      if (kind === "finish") {
        this.audio.finish();
        this.ui.banner("BANDEIRADA");
        setTimeout(() => {
          if (this.race && this.view === "race") {
            this.view = "results";
            this.ui.results(this.race.lastResults, this.mode === "cup", this.mode === "cup" && !this.wouldEndCup());
            this.audio.silence();
            this.syncChrome();
          }
        }, 1600);
      }
    };
    this.view = "race";
    this.ui.raceHud(true);
    this.syncChrome();
    this.audio.countdown(3);
  }

  private wouldEndCup(): boolean {
    return this.mode === "cup" && this.cup.index >= 2;
  }

  private pauseRace(): void {
    if (!this.race || this.race.phase === "finished") return;
    this.race.paused = true;
    this.audio.pauseHum(true);
    this.ui.pause(this.muted);
  }

  private resumeRace(): void {
    if (!this.race) return;
    this.race.paused = false;
    this.audio.pauseHum(false);
    this.ui.hidePause();
  }

  private togglePause(): void {
    if (!this.race || this.view !== "race") return;
    if (this.race.paused) this.resumeRace();
    else this.pauseRace();
  }

  private leaveRace(): void {
    this.race?.dispose();
    this.race = null;
    this.audio.silence();
    this.camera.position.set(4.2, 2.4, 5.6);
    this.camera.lookAt(0, 0.6, 0);
    this.camera.fov = 52;
    this.camera.near = 0.55;
    this.camera.updateProjectionMatrix();
    this.showTitle();
  }

  private tick(dt: number): void {
    if (this.view === "race" && this.race) {
      if (this.input.consumePause()) this.togglePause();
      this.race.update(dt, this.input, this.camera);
      const p = this.race.player;
      this.ui.updateHud({
        place: p.place,
        lap: p.kart.lap,
        laps: this.race.laps,
        speed: p.kart.speed,
        item: p.item,
        trackName: this.race.built.def.name,
        smoke: p.kart.smokeTime > 0,
      });
      this.ui.drawMinimap(
        this.race.minimapPoints(),
        this.race.racers.map((r) => ({
          x: r.kart.position.x,
          z: r.kart.position.z,
          you: r.isPlayer,
        })),
      );
      const cd = this.race.countdownLabel();
      if (cd) this.ui.setCountdown(cd);
      if (this.race.paused) {
        this.audio.pauseHum(true);
        this.audio.drift(0);
      } else {
        const rpm = Math.min(1, Math.abs(p.kart.speed) / 28);
        this.audio.engine(rpm, this.input.state.throttle, p.kart.boostTime > 0);
        this.audio.drift(p.kart.drifting ? 0.7 + p.kart.driftCharge * 0.3 : 0);
      }
      this.renderer.render(this.race.scene, this.camera);
      return;
    }

    if (this.menuKart) this.menuKart.rotation.y += dt * 0.45;
    if (this.view === "karts") {
      const portrait = window.innerWidth < 820;
      if (portrait) {
        this.camera.clearViewOffset();
        this.camera.position.set(0.15, 1.55, 5.35);
        this.camera.lookAt(0, -1.65, 0);
      } else {
        this.camera.clearViewOffset();
        this.camera.position.set(-0.2, 1.5, 5.1);
        this.camera.lookAt(1.4, 0.4, 0);
      }
      this.camera.near = 0.35;
      this.camera.fov = 42;
      this.camera.updateProjectionMatrix();
    } else {
      this.camera.clearViewOffset();
      this.camera.position.x = 4.2 + Math.sin(performance.now() * 0.00025) * 0.4;
      this.camera.position.y = 2.4;
      this.camera.position.z = 5.6;
      this.camera.lookAt(0, 0.6, 0);
    }
    this.audio.engine(0.12, 0.04, false);
    this.audio.drift(0);
    this.renderer.render(this.menuScene, this.camera);
  }
}
