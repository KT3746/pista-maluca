/**
 * Headed play check: one-click menus, kart in frame, ArrowRight = screen-right.
 * Usage: node scripts/play-check.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.PISTA_URL || "http://127.0.0.1:5173/pista-maluca/?steer=1";

async function clickAct(page, act) {
  const btn = page.locator(`[data-act="${act}"]`).first();
  await btn.waitFor({ state: "visible", timeout: 8000 });
  await btn.click({ trial: false });
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const errors = [];

  async function run(name, size) {
    const page = await browser.newPage({ viewport: size });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    await clickAct(page, "quick");
    await page.waitForTimeout(200);
    const onKarts = await page.locator("text=Escolha o kart").count();
    if (!onKarts) errors.push(`${name}: first click on Corrida rápida did not advance`);
    await clickAct(page, "go");
    await page.waitForTimeout(200);
    await clickAct(page, "go");
    await page.waitForTimeout(500);
    const racing = await page.evaluate(() => document.body.classList.contains("is-race"));
    if (!racing) errors.push(`${name}: Largar did not start a race`);

    await page.waitForTimeout(300);
    const frame = await page.evaluate(() => {
      const g = window.pista;
      if (!g?.race?.player) return null;
      const kart = g.race.player.kart;
      const cam = g.camera;
      const v = { x: kart.position.x, y: kart.position.y + 0.45, z: kart.position.z };
      const p = new g.camera.constructor().copy?.(cam);
      // project with the live camera
      const THREE = g.camera.isPerspectiveCamera ? null : null;
      void THREE;
      const vec = { x: v.x, y: v.y, z: v.z };
      const wp = { x: v.x, y: v.y, z: v.z };
      cam.updateMatrixWorld(true);
      const e = cam.matrixWorldInverse.elements;
      // world → view
      const vx = e[0] * wp.x + e[4] * wp.y + e[8] * wp.z + e[12];
      const vy = e[1] * wp.x + e[5] * wp.y + e[9] * wp.z + e[13];
      const vz = e[2] * wp.x + e[6] * wp.y + e[10] * wp.z + e[14];
      const pe = cam.projectionMatrix.elements;
      const cw = pe[0] * vx + pe[4] * vy + pe[8] * vz + pe[12];
      const ch = pe[1] * vx + pe[5] * vy + pe[9] * vz + pe[13];
      const cw2 = pe[3] * vx + pe[7] * vy + pe[11] * vz + pe[15];
      const ndcX = cw / cw2;
      const ndcY = ch / cw2;
      return {
        ndcX,
        ndcY,
        heading: kart.heading,
        steer: g.input.state.steer,
        view: g.view,
      };
    });
    if (!frame) errors.push(`${name}: no race/player`);
    else {
      if (Math.abs(frame.ndcX) > 0.62) errors.push(`${name}: kart ndcX=${frame.ndcX.toFixed(2)} not centered`);
      if (frame.ndcY < -0.82 || frame.ndcY > 0.4) {
        errors.push(`${name}: kart ndcY=${frame.ndcY.toFixed(2)} not in lower/mid frame`);
      }
      console.log(`${name} countdown frame`, frame);
    }

    await page.waitForFunction(() => window.pista?.race?.phase === "green", { timeout: 20000 });
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(200);
    const right = await page.evaluate(() => {
      const g = window.pista;
      return { steer: g.input.state.steer, heading: g.race.player.kart.heading, phase: g.race.phase };
    });
    await page.waitForTimeout(800);
    const right2 = await page.evaluate(() => {
      const g = window.pista;
      return { steer: g.input.state.steer, heading: g.race.player.kart.heading };
    });
    await page.keyboard.up("ArrowRight");
    console.log(`${name} ArrowRight`, right, right2);
    if (right.steer >= 0) errors.push(`${name}: ArrowRight steer=${right.steer} (want -1 / screen-right)`);
    const dRight = right2.heading - right.heading;
    const wrapRight = Math.atan2(Math.sin(dRight), Math.cos(dRight));
    if (!(wrapRight < -0.04)) errors.push(`${name}: ArrowRight heading delta=${wrapRight} (want yaw screen-right)`);

    await page.waitForTimeout(200);
    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(200);
    const left = await page.evaluate(() => ({
      steer: window.pista.input.state.steer,
      heading: window.pista.race.player.kart.heading,
    }));
    await page.waitForTimeout(800);
    const left2 = await page.evaluate(() => ({
      steer: window.pista.input.state.steer,
      heading: window.pista.race.player.kart.heading,
    }));
    await page.keyboard.up("ArrowLeft");
    console.log(`${name} ArrowLeft`, left, left2);
    if (left.steer <= 0) errors.push(`${name}: ArrowLeft steer=${left.steer} (want +1 / screen-left)`);
    const dLeft = left2.heading - left.heading;
    const wrapLeft = Math.atan2(Math.sin(dLeft), Math.cos(dLeft));
    if (!(wrapLeft > 0.04)) errors.push(`${name}: ArrowLeft heading delta=${wrapLeft} (want yaw screen-left)`);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await clickAct(page, "quit");
    await page.waitForTimeout(300);
    const ghost = await page.locator(".hud, #hud-item").count();
    const title = await page.locator("text=Pista Maluca").count();
    if (ghost) errors.push(`${name}: ghost HUD after quit (${ghost})`);
    if (!title) errors.push(`${name}: title not restored after quit`);
    await page.close();
  }

  try {
    await run("desktop", { width: 1280, height: 720 });
    await run("phone", { width: 390, height: 844 });
  } finally {
    await browser.close();
  }

  if (errors.length) {
    console.error("FAIL\n" + errors.join("\n"));
    process.exit(1);
  }
  console.log("PASS: click, frame, ArrowRight=screen-right, ArrowLeft=screen-left, teardown");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
