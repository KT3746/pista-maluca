export const GAME_TITLE = "Pista Maluca";

export const TOTAL_LAPS = 3;
export const RACER_COUNT = 4;
export const TOUCH_VIEWPORT_MAX = 820;

export const CUP_POINTS = [10, 7, 5, 3] as const;

/** Layout width used for phone HUD / pads. visualViewport beats innerWidth on iOS. */
export const layoutWidth = (): number => {
  if (typeof window === "undefined") return 1280;
  const vis = window.visualViewport?.width;
  return typeof vis === "number" && vis > 0 ? vis : window.innerWidth;
};

/** CSS-pixel size of the visible game box (visualViewport when present). */
export const viewSize = (): { w: number; h: number } => {
  if (typeof window === "undefined") return { w: 1280, h: 720 };
  const vv = window.visualViewport;
  const w = Math.max(1, Math.round(vv?.width || window.innerWidth || 1));
  const h = Math.max(1, Math.round(vv?.height || window.innerHeight || 1));
  return { w, h };
};

export const isPhoneViewport = (): boolean => layoutWidth() < TOUCH_VIEWPORT_MAX;

/**
 * On-screen race pads must appear when the screen is phone-narrow, OR the
 * pointer is coarse, OR the device reports touch points. Never gate this on
 * ontouchstart / hover:none alone — Chrome CDP and some Safari cases report
 * pointer:fine and maxTouchPoints=0 even at 390×844.
 */
export const wantsTouchControls = (): boolean => {
  if (typeof window === "undefined") return false;
  let coarse = false;
  try {
    coarse = window.matchMedia("(pointer: coarse)").matches;
  } catch {
    coarse = false;
  }
  const points = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0;
  return isPhoneViewport() || coarse || points > 0;
};

/** @deprecated alias — same rule as wantsTouchControls */
export const isTouchPreferred = (): boolean => wantsTouchControls();

export const isMobileViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return isPhoneViewport() || wantsTouchControls();
};

/** Paint the race pads so CSS `display:none` cannot win on a phone. */
export function forceRacePadsVisible(el: HTMLElement | null): void {
  if (!el) return;
  if (!wantsTouchControls()) return;
  el.classList.remove("hidden");
  el.style.setProperty("display", "block", "important");
  el.style.setProperty("visibility", "visible", "important");
  el.style.setProperty("opacity", "1", "important");
  el.style.setProperty("z-index", "20", "important");
  el.style.setProperty("pointer-events", "none", "important");
  el.querySelectorAll(".zone").forEach((node) => {
    const z = node as HTMLElement;
    z.style.setProperty("pointer-events", "auto", "important");
    z.style.setProperty("touch-action", "none", "important");
  });
  el.querySelectorAll("[data-pad], .stick-wrap, .stick-base, .stick-knob, .pad-btn").forEach((node) => {
    const z = node as HTMLElement;
    z.style.setProperty("pointer-events", "auto", "important");
  });
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function wrapPi(a: number): number {
  if (!Number.isFinite(a)) return 0;
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  if (!Number.isFinite(current)) return Number.isFinite(target) ? target : 0;
  if (!Number.isFinite(target) || !Number.isFinite(dt) || dt <= 0) return current;
  return lerp(current, target, 1 - Math.exp(-lambda * Math.min(dt, 1)));
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--.--";
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function nowSeconds(): number {
  return performance.now() * 0.001;
}
