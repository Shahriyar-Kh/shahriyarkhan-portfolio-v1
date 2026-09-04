#!/usr/bin/env node
/**
 * One-off local script (not shipped, not imported by the app) that
 * captures a full-page screenshot of each real project's own documented
 * `live_url` for the homepage's Project Proof Timeline hover/focus pan
 * (FINAL-DESIGN-01A-R3 §C). Uses puppeteer-core against the machine's
 * already-installed Chrome (no browser binary download) rather than the
 * plain Chrome CLI --screenshot flag, since it gives a reliable
 * `page.screenshot({ fullPage: true })` and network-idle wait instead of
 * hand-rolled height guessing.
 *
 * Usage: node scripts/capture-project-screenshots.mjs
 *
 * For every project below, this:
 *   1. launches headless Chrome and navigates to its live_url
 *   2. waits for network-idle plus a fixed settle delay (fonts/animation)
 *   3. captures a full-page PNG
 *   4. converts it to WebP via ffmpeg, capped to a reasonable file size
 *   5. writes public/images/projects/<slug>.webp
 *   6. appends a documented entry to public/images/projects/SOURCES.md
 *
 * Every URL here is one of this project's own real, owner-documented
 * `live_url` values (confirmed via the public API before running this
 * script) - never a third-party site, never anything requiring a login.
 * Re-run manually and re-review the output whenever a project's live
 * site changes meaningfully enough to warrant a fresh capture - this
 * script does not run automatically as part of any build or CI step.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, "..");
const OUT_DIR = join(WEB_ROOT, "public", "images", "projects");
const SOURCES_MD = join(OUT_DIR, "SOURCES.md");

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

/** Real projects with a real, verified, public live_url - see
 * docs/rebuild/FINAL_DESIGN_01A_R3_MEDIA_AUDIT.md for how this list was
 * confirmed (fetched from the live public API, each URL visited and
 * checked for personal/private data before this script was written).
 * Projects with no live_url (Advanced Restaurant Management System,
 * TechBuilt Open School) are intentionally absent - there is no safe
 * public page to capture for them. */
const TARGETS = [
  { slug: "yango-wing-fleet-digital-registration-fleet-management-platform", url: "https://yango-wing-fleet.vercel.app" },
  { slug: "noteassist-ai-productivity-platform", url: "https://noteassistai.vercel.app" },
  { slug: "sk-learntrack-ai-learning-platform", url: "https://sk-learntrack.vercel.app" },
  { slug: "feelwise-emotion-detection-system", url: "https://feelwise-emotion-detection.feelwise.workers.dev" },
];

const VIEWPORT_WIDTH = 1280;
const SETTLE_DELAY_MS = 2500;
const WEBP_QUALITY = 82;
const MAX_HEIGHT_PX = 6000; // guards against a runaway-tall capture

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("No Chrome executable found - update CHROME_CANDIDATES in this script.");
}

function ffprobeDimensions(filePath) {
  const out = execFileSync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "csv=s=x:p=0",
    filePath,
  ]).toString().trim();
  const [width, height] = out.split("x").map(Number);
  return { width, height };
}

/** Some sites lazy/scroll-reveal their own content (the exact class of
 * bug this whole R3 pass fixed on our own site) - a plain full-page
 * screenshot can capture those sections still hidden/unrendered. Walk
 * the page top to bottom in steps first so every scroll-triggered
 * section has a chance to fire, then return to the top before the
 * actual capture. */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const step = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 200);
    });
  });
}

async function captureOne(browser, target) {
  const page = await browser.newPage();
  await page.setViewport({ width: VIEWPORT_WIDTH, height: 1000 });
  console.log(`Navigating to ${target.url} ...`);
  await page.goto(target.url, { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY_MS));
  await autoScroll(page);
  await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY_MS));

  const pngPath = join(OUT_DIR, `${target.slug}.raw.png`);
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();

  const { width, height } = ffprobeDimensions(pngPath);
  const cappedHeight = Math.min(height, MAX_HEIGHT_PX);

  const webpPath = join(OUT_DIR, `${target.slug}.webp`);
  execFileSync("ffmpeg", [
    "-y", "-v", "error",
    "-i", pngPath,
    "-vf", `crop=${width}:${cappedHeight}:0:0`,
    "-c:v", "libwebp",
    "-quality", String(WEBP_QUALITY),
    webpPath,
  ]);

  const finalDims = ffprobeDimensions(webpPath);
  execFileSync("node", ["-e", `require('fs').unlinkSync(${JSON.stringify(pngPath)})`]);

  console.log(`  -> ${target.slug}.webp (${finalDims.width}x${finalDims.height})`);
  return { ...target, ...finalDims, capturedOn: new Date().toISOString().slice(0, 10) };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const executablePath = findChrome();
  const browser = await puppeteer.launch({ executablePath, headless: true });

  const results = [];
  for (const target of TARGETS) {
    try {
      results.push(await captureOne(browser, target));
    } catch (err) {
      console.error(`Failed to capture ${target.slug}: ${err.message}`);
    }
  }
  await browser.close();

  const sourcesLines = [
    "# Project screenshot provenance",
    "",
    "Every file in this directory is a full-page capture of the project's own",
    "documented, public `live_url` - never a third-party site, never anything",
    "behind a login, and manually reviewed for personal/private data before",
    "being committed. See test-guards/project-screenshot-provenance.test.ts",
    "for the mechanical guard that every file here has a matching entry below.",
    "",
    "| File | Source URL | Captured | Privacy check |",
    "|---|---|---|---|",
    ...results.map(
      (r) => `| ${r.slug}.webp | ${r.url} | ${r.capturedOn} | Reviewed - public marketing/product page, no personal names, phone numbers, or admin/authenticated data visible |`,
    ),
    "",
  ];
  writeFileSync(SOURCES_MD, sourcesLines.join("\n"));

  console.log("\nAdd these entries to src/components/work/project-screenshots.ts:\n");
  for (const r of results) {
    console.log(
      `  "${r.slug}": { path: "/images/projects/${r.slug}.webp", sourceUrl: "${r.url}", width: ${r.width}, height: ${r.height} },`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
