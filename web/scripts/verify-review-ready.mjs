// FINAL-DESIGN-01A-R6-FIX: owner-review readiness guard. Unlike
// smoke-routes.mjs/check-links.mjs (which only check HTTP status and
// same-origin link reachability), this drives a real browser against the
// *served* homepage HTML and DOM - checking for the exact fallback
// messages the owner's screenshot showed, and confirming all four
// API-sourced datasets rendered at least one representative real record.
// A build that exits zero and a page that curls 200 are not proof the
// homepage is actually usable - this is.
//
// Usage:
//   npm run build && npm start -- -p 3207   (in one terminal)
//   npm run verify-review-ready              (in another; optionally SMOKE_BASE_URL=...)

import puppeteer from "puppeteer-core";
import { evaluateReviewReadiness } from "./lib/review-readiness-checks.mjs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ["--disable-extensions"] });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  // Next.js Link viewport-prefetching fires background RSC requests
  // (`_rsc=...`) that are expected to self-cancel (ERR_ABORTED) whenever
  // navigation, reload, or page close happens before they resolve -
  // benign prefetch churn, not a real failure. Excluded from detection.
  const failedRequests = [];
  page.on("requestfailed", (req) => {
    if (req.url().includes("_rsc=")) return;
    failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText ?? "unknown"}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("_rsc=")) failedRequests.push(`${res.status()} ${res.url()}`);
  });

  let response;
  try {
    response = await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle0", timeout: 45000 });
  } catch (e) {
    console.error(`REVIEW READINESS: FAIL - could not load ${BASE_URL}/ (${e instanceof Error ? e.message : String(e)})`);
    await browser.close();
    process.exit(1);
  }

  const status = response?.status() ?? 0;
  const html = await page.content();

  const dom = await page.evaluate(() => {
    function sectionByHeading(text) {
      const heading = Array.from(document.querySelectorAll("h2")).find((el) => el.textContent?.includes(text));
      return heading ? (heading.closest("section") ?? heading.parentElement) : null;
    }

    const projectLinks = Array.from(document.querySelectorAll('a[href^="/work/"]'));
    const serviceCards = Array.from(document.querySelectorAll("[data-service-card]"));
    const skillGroups = Array.from(document.querySelectorAll("[data-category-id]"));
    const experienceSection = sectionByHeading("Where this experience comes from");
    const experienceItems = experienceSection ? Array.from(experienceSection.querySelectorAll("li")) : [];

    return {
      projectCount: projectLinks.length,
      projectHasText: projectLinks.some((a) => (a.textContent ?? "").trim().length > 0),
      projectHasImage: document.querySelectorAll('img[src*="images%2Fprojects"], img[src*="/images/projects/"]').length > 0,
      serviceCount: serviceCards.length,
      serviceHasLink: serviceCards.some((card) => card.querySelector('a[href^="/services/"]')),
      serviceHasImage: document.querySelectorAll('img[src*="images%2Fservices"], img[src*="/images/services/"]').length > 0,
      skillGroupCount: skillGroups.length,
      skillHasText: skillGroups.some((group) => (group.textContent ?? "").trim().length > 20),
      experienceCount: experienceItems.length,
      experienceHasText: experienceItems.some((li) => (li.textContent ?? "").trim().length > 10),
    };
  });

  await browser.close();

  const failures = evaluateReviewReadiness(html, dom);
  if (status !== 200) failures.unshift(`Homepage returned HTTP ${status}, expected 200.`);
  if (consoleErrors.length > 0) failures.push(`Browser console error(s): ${consoleErrors.join(" | ")}`);
  if (failedRequests.length > 0) failures.push(`Failed/error network request(s): ${failedRequests.join(" | ")}`);

  if (failures.length > 0) {
    console.error(`REVIEW READINESS: FAIL against ${BASE_URL}`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }

  console.log(`REVIEW READINESS: PASS against ${BASE_URL}`);
  console.log(` - projects: ${dom.projectCount} link(s) rendered, real content and images present`);
  console.log(` - services: ${dom.serviceCount} card(s) rendered, real content and R6 images present`);
  console.log(` - skills: ${dom.skillGroupCount} category group(s) rendered with real content`);
  console.log(` - experience: ${dom.experienceCount} row(s) rendered with real content`);
  console.log(" - no fallback messages, no console errors, no failed requests");
}

main();
