import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROJECT_SCREENSHOTS } from "@/components/work/project-screenshots";

const WEB_ROOT = join(__dirname, "../..");
const PROJECTS_DIR = join(WEB_ROOT, "public", "images", "projects");
const SOURCES_MD = join(PROJECTS_DIR, "SOURCES.md");

/**
 * Mechanical guard against an unreviewed/undocumented capture ever
 * reaching the homepage (FINAL-DESIGN-01A-R3 §C): every entry in
 * PROJECT_SCREENSHOTS must (a) point at a file that actually exists, and
 * (b) have a matching documented source-URL entry in SOURCES.md, which
 * is where the source URL, capture date, and privacy-check confirmation
 * live for human review.
 */
describe("project-screenshot-provenance guard", () => {
  const entries = Object.entries(PROJECT_SCREENSHOTS);

  it("has at least the entries this pass captured, so the guard isn't vacuously trivial", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("every screenshot's file actually exists on disk", () => {
    for (const [slug, screenshot] of entries) {
      const filePath = join(WEB_ROOT, "public", screenshot.path.replace(/^\//, ""));
      expect(existsSync(filePath), `${slug}: ${screenshot.path} does not exist`).toBe(true);
    }
  });

  it("every screenshot has a documented source entry in SOURCES.md", () => {
    const sourcesText = existsSync(SOURCES_MD) ? readFileSync(SOURCES_MD, "utf8") : "";
    for (const [slug, screenshot] of entries) {
      const filename = screenshot.path.split("/").pop() ?? "";
      expect(sourcesText.includes(filename), `${slug}: no SOURCES.md entry for ${filename}`).toBe(true);
      expect(sourcesText.includes(screenshot.sourceUrl), `${slug}: SOURCES.md is missing its documented sourceUrl`).toBe(true);
    }
  });

  it("every screenshot's sourceUrl uses https", () => {
    for (const [slug, screenshot] of entries) {
      expect(screenshot.sourceUrl.startsWith("https://"), `${slug}: sourceUrl must be https`).toBe(true);
    }
  });
});
