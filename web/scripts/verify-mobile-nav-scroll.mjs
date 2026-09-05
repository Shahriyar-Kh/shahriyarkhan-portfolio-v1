// Real-browser regression check for the FINAL-DESIGN-01B-01-R3-NAV-FIX
// mobile-nav scroll defect: every {viewport, from-route, link}
// combination the fix's brief required, plus the ordinary-dismissal
// (Escape) case to confirm scroll restore still works on the SAME
// route. See mobile-nav.tsx's scroll-lock effect doc comment for the
// root cause this guards against.
//
// Usage:
//   npm run build && npm start   (in one terminal)
//   npm run verify-mobile-nav-scroll   (in another; optionally SMOKE_BASE_URL=...)
import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const VIEWPORTS = [
  { width: 344, height: 882, label: "344x882" },
  { width: 390, height: 844, label: "390x844" },
];

const ROUTE_LINK_PAIRS = [
  { from: "/about", link: "Home" },
  { from: "/", link: "About" },
  { from: "/about", link: "Skills" },
  { from: "/about", link: "Work" },
  { from: "/about", link: "Services" },
  { from: "/about", link: "Contact" },
];

async function state(page) {
  return page.evaluate(() => {
    const h1 = document.querySelector("h1");
    return {
      url: location.pathname,
      scrollY: window.scrollY,
      bodyPosition: getComputedStyle(document.body).position,
      bodyOverflow: getComputedStyle(document.body).overflow,
      bodyTop: document.body.style.top,
      h1Text: h1 ? h1.textContent : null,
      dialogOpen: !!document.querySelector('[role="dialog"]'),
    };
  });
}

async function clickPanelLink(page, name) {
  const handle = await page.evaluateHandle((linkName) => {
    const dialog = document.querySelector('[role="dialog"]');
    const links = dialog ? Array.from(dialog.querySelectorAll("a")) : [];
    return links.find((a) => a.textContent?.trim() === linkName) ?? null;
  }, name);
  const el = handle.asElement();
  if (!el) throw new Error(`link "${name}" not found`);
  await el.click();
}

async function testNavigation(browser, viewport, from, link) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  await page.setViewport(viewport);
  await page.goto(`${BASE_URL}${from}`, { waitUntil: "networkidle0", timeout: 45000 });
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const targetScroll = Math.round(scrollHeight * 0.4);
  await page.evaluate((y) => window.scrollTo(0, y), targetScroll);
  await new Promise((r) => setTimeout(r, 200));

  await page.click('button[aria-label*="menu" i]');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await clickPanelLink(page, link);

  // Wait generously, then assert final settled state - no arbitrary
  // fixed-delay assumption about the underlying app, just enough margin
  // past the ~1.3s smooth-scroll window the defect exhibited.
  await new Promise((r) => setTimeout(r, 2200));
  const final = await state(page);
  await page.close();

  const pass = final.scrollY <= 2 && final.bodyPosition === "static" && !final.dialogOpen && consoleErrors.length === 0;
  return { viewport: viewport.label, from, link, final, consoleErrors, pass };
}

async function testDismissRestoresOnSameRoute(browser, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(`${BASE_URL}/about`, { waitUntil: "networkidle0", timeout: 45000 });
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const targetScroll = Math.round(scrollHeight * 0.3);
  await page.evaluate((y) => window.scrollTo(0, y), targetScroll);
  await new Promise((r) => setTimeout(r, 200));

  await page.click('button[aria-label*="menu" i]');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 400));
  const after = await state(page);
  await page.close();

  const pass = Math.abs(after.scrollY - targetScroll) <= 2 && after.bodyPosition === "static" && !after.dialogOpen;
  return { viewport: viewport.label, targetScroll, after, pass };
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ["--disable-extensions"] });
  const navResults = [];
  for (const viewport of VIEWPORTS) {
    for (const { from, link } of ROUTE_LINK_PAIRS) {
      navResults.push(await testNavigation(browser, viewport, from, link));
    }
  }
  const dismissResults = [];
  for (const viewport of VIEWPORTS) {
    dismissResults.push(await testDismissRestoresOnSameRoute(browser, viewport));
  }
  await browser.close();

  console.log("\n=== Navigation via menu link (must land at top) ===");
  let allPass = true;
  for (const r of navResults) {
    console.log(`[${r.viewport}] ${r.from} -> ${r.link}: scrollY=${r.final.scrollY} bodyPosition=${r.final.bodyPosition} dialogOpen=${r.final.dialogOpen} url=${r.final.url} consoleErrors=${r.consoleErrors.length} -> ${r.pass ? "PASS" : "FAIL"}`);
    if (!r.pass) allPass = false;
  }

  console.log("\n=== Escape dismissal on same route (must restore scroll) ===");
  for (const r of dismissResults) {
    console.log(`[${r.viewport}] target=${r.targetScroll} actual=${r.after.scrollY} bodyPosition=${r.after.bodyPosition} -> ${r.pass ? "PASS" : "FAIL"}`);
    if (!r.pass) allPass = false;
  }

  console.log(allPass ? "\nALL PASS" : "\nSOME FAILED");
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
