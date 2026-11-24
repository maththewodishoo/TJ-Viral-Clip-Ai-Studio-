import { chromium, devices } from "playwright";
import { existsSync, mkdirSync } from "node:fs";

const localChromium = "/home/daytona/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(localChromium) ? localChromium : undefined);

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:5173";
mkdirSync("tmp-screens", { recursive: true });

const browser = await chromium.launch({ executablePath });
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

const ROUTES = [
  "/", "/transcription", "/analyser", "/content-intelligence", "/hooks",
  "/script-studio", "/image-prompts", "/storyboard", "/voiceover", "/social",
  "/trends", "/calendar", "/automation", "/social-command", "/library",
  "/providers", "/settings",
];
let bad = 0;
for (const route of ROUTES) {
  const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const h1 = await page.locator("h1").first().textContent().catch(() => null);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  const ok = res?.status() === 200 && Boolean(h1) && !overflow;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"} ${route} h1=${JSON.stringify(h1)} overflow=${overflow}`);
}

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: "tmp-screens/desktop-dashboard.png", fullPage: true });

await page.goto(`${BASE}/analyser`, { waitUntil: "networkidle" });
await page.screenshot({ path: "tmp-screens/desktop-analyser.png", fullPage: true });

await page.goto(`${BASE}/providers`, { waitUntil: "networkidle" });
await page.screenshot({ path: "tmp-screens/desktop-providers.png", fullPage: true });

// real interaction: invalid URL error
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.getByLabel("Video URL").fill("https://vimeo.com/12345");
await page.getByRole("button", { name: "Analyse Video" }).first().click();
await page.waitForTimeout(300);
const inlineError = await page.getByText("Unsupported platform").first().isVisible().catch(() => false);
console.log(`${inlineError ? "PASS" : "FAIL"} invalid URL inline error`);
if (!inlineError) bad++;

// project persistence + retrieval: seed a saved project, reload, confirm it renders
await page.evaluate(() => {
  const workspace = {
    version: 1,
    projects: [
      {
        id: "smoke_project",
        title: "Smoke Test Project",
        platform: "youtube",
        kind: "analysis",
        status: "analysed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    transcripts: [],
    scripts: [],
    images: [],
    storyboards: [],
    voiceovers: [],
    social: [],
    trends: [],
    calendar: [],
    workflows: [],
    commands: [],
    settings: { routing: {}, brandVoice: "", defaultAspect: "9:16", cloudApiBase: "" },
    onboardingDone: true,
  };
  localStorage.setItem("tjv.studio.workspace.v1", JSON.stringify(workspace));
});
await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
const persisted = await page.getByText("Smoke Test Project").first().isVisible().catch(() => false);
console.log(`${persisted ? "PASS" : "FAIL"} saved project persists and is retrievable in Library`);
if (!persisted) bad++;
await page.evaluate(() => localStorage.removeItem("tjv.studio.workspace.v1"));

const mobile = await browser.newContext({ ...devices["iPhone 13"] });
const m = await mobile.newPage();
m.on("pageerror", (e) => errors.push(`mobile pageerror: ${e.message}`));
await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
const mo = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
const bottom = await m.locator('nav[aria-label="Primary mobile"]').isVisible();
console.log(`${!mo ? "PASS" : "FAIL"} mobile overflow=${mo}; bottomNav=${bottom}`);
if (mo || !bottom) bad++;
await m.screenshot({ path: "tmp-screens/mobile-dashboard.png", fullPage: true });
await m.getByRole("button", { name: "Open navigation" }).click();
await m.waitForTimeout(400);
const drawer = await m.getByRole("link", { name: "Content Intelligence" }).isVisible().catch(() => false);
console.log(`${drawer ? "PASS" : "FAIL"} mobile drawer`);
if (!drawer) bad++;
await m.screenshot({ path: "tmp-screens/mobile-drawer.png" });

console.log(`\nruntime errors=${errors.length}`);
errors.slice(0, 10).forEach((e) => console.log(" - " + e));
await browser.close();
process.exitCode = bad || errors.length ? 1 : 0;
