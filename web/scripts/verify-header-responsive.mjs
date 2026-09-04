// FINAL-DESIGN-01A-R6-FIX3: real-browser regression coverage for the
// header breakpoint switch and the mobile menu's geometry - the kind of
// defect (brand wrap, a clipped sliver under the fixed header) that
// class-name assertions and jsdom can't actually observe, because both
// depend on genuine layout/paint, not just which CSS classes are
// present. Drives a real, extension-free Chrome instance via
// puppeteer-core (this project's established pattern - see
// smoke-routes.mjs's sibling scripts) against a running production
// server.
//
// Usage:
//   npm run build && npm start -- -p 3209   (in one terminal)
//   npm run verify-header-responsive         (in another; optionally SMOKE_BASE_URL=...)

import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

// Every width the R6-FIX3 brief explicitly requires, plus the two
// devices the owner's recording actually used (375x667, 430x932,
// 768x1024, 912x1368) are already covered by this exact set.
const WIDTHS = [
  { width: 375, height: 667, label: "375x667 (iPhone SE)" },
  { width: 390, height: 844, label: "390x844" },
  { width: 430, height: 932, label: "430x932 (iPhone 15 Pro Max)" },
  { width: 768, height: 1024, label: "768x1024 (iPad Mini)" },
  { width: 820, height: 1180, label: "820x1180" },
  { width: 912, height: 1368, label: "912x1368 (Surface Pro 7)" },
  { width: 1024, height: 768, label: "1024x768" },
  { width: 1440, height: 900, label: "1440x900" },
];

const FALLBACKS = [
  "Project data is temporarily unavailable.",
  "Service data is temporarily unavailable.",
  "Skill data is temporarily unavailable.",
  "Experience data is temporarily unavailable.",
];

function fail(failures, message) {
  failures.push(message);
}

async function measureHeaderState(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const brand = header?.querySelector('a[href="/"]');
    const nav = header?.querySelector('nav[aria-label="Primary"]');
    const resumeLink = header?.querySelector('a[href="/resume"]');
    const trigger = header?.querySelector('button[aria-label*="menu" i]');
    if (!header || !brand) return null;

    const style = (el) => (el ? getComputedStyle(el) : null);
    const isVisible = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      return s.display !== "none" && s.visibility !== "hidden";
    };

    const headerRect = header.getBoundingClientRect();
    const brandRect = brand.getBoundingClientRect();
    const navEl = nav;
    const navVisible = isVisible(navEl) && style(navEl)?.display !== "none";
    const triggerWrapper = trigger ? trigger.parentElement : null;
    const triggerVisible = isVisible(triggerWrapper);

    // All direct children of the header's inner flex row, to confirm
    // none overflow the header's own bounding box.
    const innerRow = header.querySelector(".section-shell");
    const rowRect = innerRow ? innerRow.getBoundingClientRect() : null;
    const childRects = innerRow ? Array.from(innerRow.children).map((c) => c.getBoundingClientRect()) : [];
    const anyChildOverflows = rowRect
      ? childRects.some((r) => r.width > 0 && (r.left < rowRect.left - 1 || r.right > rowRect.right + 1))
      : false;

    return {
      headerHeight: headerRect.height,
      headerTop: headerRect.top,
      brandHeight: brandRect.height,
      brandWrapped: brandRect.height > 36,
      navVisible,
      triggerVisible,
      resumeVisible: navVisible ? isVisible(resumeLink) : false,
      documentScrollWidth: document.documentElement.scrollWidth,
      windowInnerWidth: window.innerWidth,
      anyChildOverflows,
    };
  });
}

async function openMenu(page) {
  const trigger = await page.$('button[aria-label*="Open menu" i]');
  if (!trigger) return null;
  await trigger.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const dialog = document.querySelector('[role="dialog"]');
    if (!header || !dialog) return null;
    const headerRect = header.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const bodyStyle = getComputedStyle(document.body);
    return {
      headerBottom: headerRect.bottom,
      dialogTop: dialogRect.top,
      gap: dialogRect.top - headerRect.bottom,
      bodyPosition: bodyStyle.position,
      dialogHeight: dialogRect.height,
      viewportHeight: window.innerHeight,
    };
  });
}

async function scrollMenuAndRemeasure(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const dialog = document.querySelector('[role="dialog"]');
    if (!header || !dialog) return null;
    dialog.scrollTop = dialog.scrollHeight;
    const headerRectAfter = header.getBoundingClientRect();
    const dialogRectAfter = dialog.getBoundingClientRect();
    dialog.scrollTop = 0;
    return {
      headerBottomAfterScroll: headerRectAfter.bottom,
      dialogTopAfterScroll: dialogRectAfter.top,
      gapAfterScroll: dialogRectAfter.top - headerRectAfter.bottom,
    };
  });
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ["--disable-extensions"] });
  const allFailures = [];
  const summary = [];

  for (const { width, height, label } of WIDTHS) {
    const failures = [];
    const consoleErrors = [];
    const failedRequests = [];

    const page = await browser.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(String(e)));
    page.on("requestfailed", (req) => {
      if (req.url().includes("_rsc=")) return;
      failedRequests.push(`${req.url()} - ${req.failure()?.errorText ?? "unknown"}`);
    });
    page.on("response", (res) => {
      if (res.status() >= 400 && !res.url().includes("_rsc=")) failedRequests.push(`${res.status()} ${res.url()}`);
    });

    await page.setViewport({ width, height });
    let navigated = false;
    for (let attempt = 1; attempt <= 3 && !navigated; attempt++) {
      try {
        await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle0", timeout: 45000 });
        navigated = true;
      } catch (e) {
        if (attempt === 3) throw e;
        console.warn(`  (navigation attempt ${attempt} for ${label} failed, retrying: ${e instanceof Error ? e.message : String(e)})`);
      }
    }
    await new Promise((r) => setTimeout(r, 400));

    const html = await page.content();
    for (const message of FALLBACKS) {
      if (html.includes(message)) fail(failures, `fallback message present: "${message}"`);
    }

    const state = await measureHeaderState(page);
    if (!state) {
      fail(failures, "could not measure header state (header or brand link missing)");
    } else {
      if (state.navVisible === state.triggerVisible) {
        fail(failures, `desktop nav and mobile trigger visibility must be exclusive - navVisible=${state.navVisible} triggerVisible=${state.triggerVisible}`);
      }
      if (state.navVisible && state.brandWrapped) {
        fail(failures, `brand wrapped while desktop nav is visible (brand height=${state.brandHeight}px)`);
      }
      if (state.navVisible && !state.resumeVisible) {
        fail(failures, "desktop nav is visible but the Résumé CTA is not");
      }
      if (state.anyChildOverflows) {
        fail(failures, "a header child overflows the header's own container");
      }
      if (state.documentScrollWidth > state.windowInnerWidth + 1) {
        fail(failures, `horizontal overflow: documentScrollWidth=${state.documentScrollWidth} > windowInnerWidth=${state.windowInnerWidth}`);
      }
    }

    // Mobile menu geometry - only reachable where the trigger is visible.
    let menuState = null;
    if (state && state.triggerVisible) {
      menuState = await openMenu(page);
      if (!menuState) {
        fail(failures, "mobile trigger visible but the menu panel did not open");
      } else {
        if (Math.abs(menuState.gap) > 1) {
          fail(failures, `menu panel does not begin flush below the header: gap=${menuState.gap.toFixed(2)}px (header bottom=${menuState.headerBottom.toFixed(2)}, panel top=${menuState.dialogTop.toFixed(2)})`);
        }
        if (menuState.bodyPosition !== "fixed") {
          fail(failures, `body scroll lock did not engage (position:fixed) while the menu is open - got "${menuState.bodyPosition}"`);
        }

        const afterScroll = await scrollMenuAndRemeasure(page);
        if (!afterScroll || Math.abs(afterScroll.gapAfterScroll) > 1) {
          fail(failures, `menu panel/header alignment drifted after internally scrolling the panel: gap=${afterScroll?.gapAfterScroll}`);
        }

        // Escape closes, focus returns to trigger.
        await page.keyboard.press("Escape");
        await new Promise((r) => setTimeout(r, 200));
        const closedState = await page.evaluate(() => ({
          dialogGone: !document.querySelector('[role="dialog"]'),
          bodyPosition: getComputedStyle(document.body).position,
          focusIsTrigger: document.activeElement?.getAttribute("aria-label")?.toLowerCase().includes("menu") ?? false,
        }));
        if (!closedState.dialogGone) fail(failures, "Escape did not close the menu panel");
        if (closedState.bodyPosition === "fixed") fail(failures, "body scroll lock was not released after closing the menu");
        if (!closedState.focusIsTrigger) fail(failures, "focus did not return to the trigger button after Escape");
      }
    }

    // Header stays pinned while the page scrolls (menu closed).
    await page.evaluate(() => window.scrollTo(0, 800));
    await new Promise((r) => setTimeout(r, 200));
    const scrolledHeaderTop = await page.evaluate(() => document.querySelector("header")?.getBoundingClientRect().top ?? null);
    if (scrolledHeaderTop !== 0) {
      fail(failures, `header did not stay pinned to the viewport top while the page scrolled - top=${scrolledHeaderTop}`);
    }
    await page.evaluate(() => window.scrollTo(0, 0));

    // Real data / no broken images, checked at every width per the brief.
    const dataChecks = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      return {
        projectLinks: document.querySelectorAll('a[href^="/work/"]').length,
        serviceCards: document.querySelectorAll("[data-service-card]").length,
        skillGroups: document.querySelectorAll("[data-category-id]").length,
        brokenImages: images.filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.src),
      };
    });
    if (dataChecks.projectLinks < 1) fail(failures, "no project links rendered");
    if (dataChecks.serviceCards < 1) fail(failures, "no service cards rendered");
    if (dataChecks.skillGroups < 1) fail(failures, "no skill category groups rendered");
    if (dataChecks.brokenImages.length > 0) fail(failures, `broken image(s): ${dataChecks.brokenImages.join(", ")}`);

    if (consoleErrors.length > 0) fail(failures, `console error(s): ${consoleErrors.join(" | ")}`);
    if (failedRequests.length > 0) fail(failures, `failed request(s): ${failedRequests.join(" | ")}`);

    summary.push({ label, width, navVisible: state?.navVisible, triggerVisible: state?.triggerVisible, brandHeight: state?.brandHeight, menuGap: menuState?.gap, failures: failures.length });
    if (failures.length > 0) {
      allFailures.push(`[${label}]`);
      for (const f of failures) allFailures.push(`  - ${f}`);
    }

    await page.close();
  }

  await browser.close();

  console.log("\n=== Header responsive verification matrix ===");
  for (const row of summary) {
    console.log(
      `${row.label.padEnd(28)} nav=${String(row.navVisible).padEnd(5)} trigger=${String(row.triggerVisible).padEnd(5)} brandH=${row.brandHeight?.toFixed(1)}px${row.menuGap !== undefined ? ` menuGap=${row.menuGap?.toFixed(2)}px` : ""} ${row.failures === 0 ? "PASS" : `FAIL(${row.failures})`}`,
    );
  }

  if (allFailures.length > 0) {
    console.error("\nHEADER RESPONSIVE VERIFICATION: FAIL\n" + allFailures.join("\n"));
    process.exit(1);
  }

  console.log(`\nHEADER RESPONSIVE VERIFICATION: PASS across all ${WIDTHS.length} widths against ${BASE_URL}`);
}

main();
