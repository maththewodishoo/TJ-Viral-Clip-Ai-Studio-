import { chromium, devices } from "playwright";
import { existsSync } from "node:fs";

const localChromium = "/home/daytona/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(localChromium) ? localChromium : undefined);

const BASE = "http://127.0.0.1:5173";
const browser = await chromium.launch({ executablePath });
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await desktop.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const sidebar = await page.locator("aside").first().boundingBox();
check("sidebar is 232px wide and full height", sidebar?.width === 232 && (sidebar?.height ?? 0) >= 900, `${sidebar?.width}x${sidebar?.height}`);

const topbar = await page.locator("header").first().boundingBox();
check("topbar spans content area", (topbar?.width ?? 0) > 1100, `${Math.round(topbar?.width ?? 0)}px`);

for (const label of ["Welcome to", "Analyse any viral video", "Your Content Performance", "Quick Actions", "API Setup", "Recent Projects", "Trending Topics", "System Status"]) {
  check(`dashboard contains “${label}”`, (await page.getByText(label, { exact: false }).count()) > 0);
}

const quickActions = await page.locator("button", { hasText: /Analyse Video|Generate Script|Create Images|Storyboard|Voiceover|Social Media/ }).count();
check("six quick actions rendered", quickActions >= 6, `${quickActions} matches`);

const cards = await page.locator("main .panel").count();
check("dashboard panels render", cards >= 8, `${cards} panels`);

const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check("dark base background", bodyBg === "rgb(5, 3, 13)", bodyBg);

// every dashboard panel stays inside the content width
const overflowing = await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll("main .panel").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 1 || r.left < 230) bad.push(Math.round(r.left) + ".." + Math.round(r.right));
  });
  return bad;
});
check("panels contained in content column", overflowing.length === 0, overflowing.join(", "));

// tap targets in the mobile bottom bar
const mobile = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 1 });
const m = await mobile.newPage();
await m.goto(BASE, { waitUntil: "networkidle" });
const navBoxes = await m.locator('nav[aria-label="Primary mobile"] a').evaluateAll((els) =>
  els.map((el) => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  }),
);
check(
  "mobile bottom-nav targets are touch sized",
  navBoxes.length === 5 && navBoxes.every((b) => b.h >= 40 && b.w >= 60),
  JSON.stringify(navBoxes),
);

const analyzeBtn = await m.getByRole("button", { name: "Analyse Video" }).first().boundingBox();
check("mobile analyse button ≥ 44px tall", (analyzeBtn?.height ?? 0) >= 44, `${Math.round(analyzeBtn?.height ?? 0)}px`);

const fontSpots = await m.evaluate(() => {
  const sizes = new Set();
  document.querySelectorAll("main p, main span, main a, main button").forEach((el) => {
    const s = parseFloat(getComputedStyle(el).fontSize);
    if (el.textContent?.trim() && s < 10) sizes.add(s);
  });
  return [...sizes].sort((a, b) => a - b);
});
check("no rendered text below 10px on mobile", fontSpots.length === 0, fontSpots.join(", "));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} layout checks passed`);
process.exitCode = failed.length ? 1 : 0;
