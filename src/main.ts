import "./style.css";
import { Game } from "./game/Game";

const canvas = document.getElementById("scene") as HTMLCanvasElement | null;
const ui = document.getElementById("ui");
if (!canvas || !ui) throw new Error("Pista Maluca: DOM incompleto");

document.body.addEventListener(
  "touchmove",
  (e) => {
    if (!document.body.classList.contains("is-race")) return;
    e.preventDefault();
  },
  { passive: false },
);

const game = new Game(canvas, ui);
game.start();
