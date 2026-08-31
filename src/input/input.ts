import type { InputState } from "../types";
import { clamp, isTouchPreferred } from "../config";

export class Input {
  state: InputState = { throttle: 0, brake: 0, steer: 0, drift: false, item: false, pause: false };
  itemPressed = false;
  pausePressed = false;
  touchMode = false;
  private keys = new Set<string>();
  private steerTouch = 0;
  private pad = { throttle: false, brake: false, drift: false, item: false };
  private listeners: Array<() => void> = [];
  private raceLock = false;

  constructor() {
    this.touchMode = isTouchPreferred();
  }

  setRaceLock(on: boolean): void {
    this.raceLock = on;
    if (!on) this.resetPlay();
  }

  resetPlay(): void {
    this.pad.throttle = false;
    this.pad.brake = false;
    this.pad.drift = false;
    this.pad.item = false;
    this.steerTouch = 0;
    this.itemPressed = false;
    this.pausePressed = false;
    this.state.throttle = 0;
    this.state.brake = 0;
    this.state.steer = 0;
    this.state.drift = false;
    this.state.item = false;
  }

  bind(root: HTMLElement): void {
    const down = (e: KeyboardEvent) => {
      this.keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (e.code === "Escape") this.pausePressed = true;
      if (e.code === "KeyE" || e.code === "ControlLeft" || e.code === "ControlRight") this.itemPressed = true;
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.code);
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    this.listeners.push(() => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    });

    root.addEventListener(
      "touchmove",
      (e) => {
        if (!this.raceLock) return;
        e.preventDefault();
      },
      { passive: false },
    );
  }

  bindTouch(layer: HTMLElement): void {
    this.touchMode = true;
    const stick = layer.querySelector(".stick-wrap") as HTMLElement | null;
    const knob = layer.querySelector(".stick-knob") as HTMLElement | null;
    const setPad = (name: keyof typeof this.pad, on: boolean) => {
      this.pad[name] = on;
      const btn = layer.querySelector(`[data-pad="${name}"]`);
      btn?.classList.toggle("active", on);
    };

    if (stick && knob) {
      const update = (cx: number) => {
        const r = stick.getBoundingClientRect();
        const x = (cx - (r.left + r.width / 2)) / (r.width * 0.5);
        this.steerTouch = clamp(x, -1, 1);
        const kx = clamp(x, -1, 1) * 36;
        knob.style.transform = `translate(${kx}px, 0px)`;
      };
      const end = () => {
        this.steerTouch = 0;
        knob.style.transform = "translate(0,0)";
      };
      const onMove = (e: PointerEvent) => update(e.clientX);
      stick.addEventListener("pointerdown", (e) => {
        stick.setPointerCapture(e.pointerId);
        update(e.clientX);
      });
      stick.addEventListener("pointermove", onMove);
      stick.addEventListener("pointerup", end);
      stick.addEventListener("pointercancel", end);
    }

    layer.querySelectorAll("[data-pad]").forEach((el) => {
      const name = el.getAttribute("data-pad") as keyof typeof this.pad;
      const on = (e: Event) => {
        e.preventDefault();
        setPad(name, true);
        if (name === "item") this.itemPressed = true;
      };
      const off = (e: Event) => {
        e.preventDefault();
        setPad(name, false);
      };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointerleave", off);
      el.addEventListener("pointercancel", off);
    });
  }

  poll(): InputState {
    const k = this.keys;
    const up = k.has("ArrowUp") || k.has("KeyW");
    const down = k.has("ArrowDown") || k.has("KeyS");
    const left = k.has("ArrowLeft") || k.has("KeyA");
    const right = k.has("ArrowRight") || k.has("KeyD");
    const drift = k.has("ShiftLeft") || k.has("ShiftRight") || k.has("Space") || this.pad.drift;
    let steer = (right ? 1 : 0) - (left ? 1 : 0);
    if (this.touchMode) steer = this.steerTouch || steer;
    this.state.throttle = this.pad.throttle || up ? 1 : 0;
    this.state.brake = this.pad.brake || down ? 1 : 0;
    this.state.steer = clamp(steer, -1, 1);
    this.state.drift = drift;
    this.state.item = this.itemPressed;
    return this.state;
  }

  consumeItem(): boolean {
    const v = this.itemPressed;
    this.itemPressed = false;
    return v;
  }

  consumePause(): boolean {
    const v = this.pausePressed;
    this.pausePressed = false;
    return v;
  }
}
