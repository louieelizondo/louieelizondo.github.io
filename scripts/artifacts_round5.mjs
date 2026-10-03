import { chromium } from "playwright";
import { mkdir, rename } from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const ART = "/opt/cursor/artifacts";
const URL = "http://localhost:4173/?demo=1";
const PUBLIC_12 = "2026-03-18";
const MIXED = "2026-05-06";
const HOVER_DENSE = "2026-03-12";

async function waitGardenReady(page) {
  await page.waitForSelector("#commit-garden.garden-ready", { timeout: 12000 });
  await page.waitForFunction(() => (document.querySelector(".garden-grid")?.offsetHeight || 0) > 50);
  await page.waitForTimeout(350);
}

function neighborAt(cells, origin, targetDist) {
  const tw = parseInt(origin.dataset.week, 10);
  const td = parseInt(origin.dataset.day, 10);
  let best = null;
  let bestD = Infinity;
  cells.forEach((c) => {
    const wi = parseInt(c.dataset.week, 10);
    const di = parseInt(c.dataset.day, 10);
    const d = Math.hypot(wi - tw, di - td);
    if (Math.abs(d - targetDist) < Math.abs(bestD - targetDist) || (d === targetDist && d < bestD)) {
      bestD = d;
      best = c;
    }
  });
  return best;
}

async function applyHoverField(page, hoverDate) {
  await page.evaluate(async (hoverDate) => {
    const grid = document.querySelector(".garden-grid");
    const h = document.querySelector(`.garden-cell[data-date="${hoverDate}"]`);
    if (!grid || !h) return;
    h.scrollIntoView({ block: "nearest", inline: "center" });
    const r = h.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    grid.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: x,
        clientY: y,
        pointerType: "mouse",
        pointerId: 1,
      })
    );
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, hoverDate);
}

async function logTransforms(page, hoverDate) {
  return page.evaluate(async (hoverDate) => {
    const grid = document.querySelector(".garden-grid");
    const cells = Array.from(document.querySelectorAll(".garden-cell"));
    const h = cells.find((c) => c.dataset.date === hoverDate);
    if (!grid || !h) return null;
    h.scrollIntoView({ block: "nearest", inline: "center" });
    const r = h.getBoundingClientRect();
    grid.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
        pointerType: "mouse",
        pointerId: 1,
      })
    );
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 220));

    const tw = parseInt(h.dataset.week, 10);
    const td = parseInt(h.dataset.day, 10);
    const pick = (dist) => {
      let best = null;
      let err = Infinity;
      cells.forEach((c) => {
        const d = Math.hypot(parseInt(c.dataset.week, 10) - tw, parseInt(c.dataset.day, 10) - td);
        const e = Math.abs(d - dist);
        if (e < err) {
          err = e;
          best = c;
        }
      });
      return best ? getComputedStyle(best).transform : null;
    };
    return {
      hovered: getComputedStyle(h).transform,
      dist1: pick(1),
      dist2: pick(2),
      dist3: pick(3),
    };
  }, hoverDate);
}

async function screenshotsHeaded() {
  const browser = await chromium.launch({ headless: false, channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await waitGardenReady(page);
  await page.screenshot({ path: path.join(ART, "site-light.png"), fullPage: true });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload({ waitUntil: "networkidle" });
  await waitGardenReady(page);
  await page.screenshot({ path: path.join(ART, "site-dark.png"), fullPage: true });

  await page.emulateMedia({ colorScheme: "light" });
  await page.reload({ waitUntil: "networkidle" });
  await waitGardenReady(page);
  await page.locator(".garden-layout").screenshot({ path: path.join(ART, "site-garden.png") });

  await page.locator(`.garden-cell[data-date="${HOVER_DENSE}"]`).scrollIntoViewIfNeeded();
  await applyHoverField(page, HOVER_DENSE);
  const hoverCell = page.locator(`.garden-cell[data-date="${HOVER_DENSE}"]`);
  const box = await hoverCell.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(350);
  }
  const transforms = await logTransforms(page, HOVER_DENSE);
  await applyHoverField(page, HOVER_DENSE);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);
  }
  await page.locator(".garden-section").screenshot({ path: path.join(ART, "site-garden-hover.png") });

  await page.locator(`.garden-cell[data-date="${PUBLIC_12}"]`).click();
  await page.waitForTimeout(500);
  await page.locator("#garden-day-card").screenshot({ path: path.join(ART, "site-daycard.png") });
  await page.locator("#garden-chip-clear").click();
  await page.waitForTimeout(300);

  await page.locator(`.garden-cell[data-date="${MIXED}"]`).click();
  await page.waitForTimeout(500);
  await page.locator("#garden-day-card").screenshot({ path: path.join(ART, "site-daycard-mixed.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await waitGardenReady(page);
  await page.screenshot({ path: path.join(ART, "site-phone-390.png"), fullPage: false });

  await ctx.close();
  await browser.close();
  return transforms;
}

async function recordVideo() {
  const browser = await chromium.launch({ headless: false, channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: ART, size: { width: 1280, height: 900 } },
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await waitGardenReady(page);
  await page.waitForTimeout(500);

  const grid = page.locator(".garden-grid");
  const gbox = await grid.boundingBox();
  if (gbox) {
    for (let i = 0; i < 22; i++) {
      await page.mouse.move(gbox.x + 30 + i * 26, gbox.y + 22 + (i % 7) * 11);
      await page.waitForTimeout(130);
    }
  }
  await page.locator(`.garden-cell[data-date="${HOVER_DENSE}"]`).scrollIntoViewIfNeeded();
  await applyHoverField(page, HOVER_DENSE);
  const dense = page.locator(`.garden-cell[data-date="${HOVER_DENSE}"]`);
  const dbox = await dense.boundingBox();
  if (dbox) {
    await page.mouse.move(dbox.x + dbox.width / 2, dbox.y + dbox.height / 2);
    await page.waitForTimeout(1200);
  }

  await page.locator(`.garden-cell[data-date="${PUBLIC_12}"]`).click();
  await page.waitForTimeout(1300);
  await page.locator("#garden-chip-clear").click();
  await page.waitForTimeout(600);

  await page.locator(`.garden-cell[data-date="${MIXED}"]`).click();
  await page.waitForTimeout(1300);
  await page.locator("#garden-chip-clear").click();
  await page.waitForTimeout(600);

  const entry = page.locator('.ledger-entry[data-project="nb-platform"] .ledger-entry__header');
  await entry.hover();
  await page.waitForTimeout(800);
  await entry.click();
  await page.waitForTimeout(800);
  await entry.click();
  await page.waitForTimeout(500);

  await grid.focus();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(120);
    if (await page.evaluate(() => document.activeElement?.classList.contains("garden-grid"))) break;
  }
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  await page.keyboard.press("Home");
  await page.waitForTimeout(450);
  await page.keyboard.press("End");
  await page.waitForTimeout(450);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(350);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#commit-garden.garden-ready");
  await page.waitForTimeout(500);
  await grid.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  await entry.click();
  await page.waitForTimeout(900);
  await page.waitForTimeout(12000);

  await page.close();
  const video = page.video();
  const tmp = video ? await video.path() : null;
  await context.close();
  await browser.close();
  if (tmp) await rename(tmp, path.join(ART, "ledger-walkthrough.webm"));
}

async function main() {
  await mkdir(ART, { recursive: true });
  const transforms = await screenshotsHeaded();
  await recordVideo();
  const demo = JSON.parse(
    await import("fs/promises").then((fs) => fs.readFile("/workspace/assets/data/contributions.demo.json", "utf8"))
  );
  const sum = demo.days.reduce((n, d) => n + d.count, 0);
  const dur = execSync(
    "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 /opt/cursor/artifacts/ledger-walkthrough.webm"
  )
    .toString()
    .trim();
  console.log(
    JSON.stringify(
      {
        transforms,
        demoTotal: demo.total,
        sumCounts: sum,
        duration: dur,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
