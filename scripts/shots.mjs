import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:5173";
mkdirSync("tmp-screens", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/home/daytona/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome",
});

const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const p = await desktop.newPage();
await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
await p.waitForTimeout(600);
await p.screenshot({ path: "tmp-screens/dash.jpg", type: "jpeg", quality: 72 });
await p.screenshot({ path: "tmp-screens/dash-full.jpg", type: "jpeg", quality: 60, fullPage: true });
await p.goto(`${BASE}/analyser`, { waitUntil: "networkidle" });
await p.screenshot({ path: "tmp-screens/analyser.jpg", type: "jpeg", quality: 72 });

const mobile = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 1 });
const m = await mobile.newPage();
await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
await m.waitForTimeout(400);
await m.screenshot({ path: "tmp-screens/mobile.jpg", type: "jpeg", quality: 72 });
await m.screenshot({ path: "tmp-screens/mobile-full.jpg", type: "jpeg", quality: 55, fullPage: true });

await browser.close();
console.log("screenshots written");
