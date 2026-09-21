import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROJECT_SCREENSHOTS } from "@/components/work/project-screenshots";

const WEB_ROOT = join(__dirname, "../..");
const PROJECTS_DIR = join(WEB_ROOT, "public", "images", "projects");
const SOURCES_MD = join(PROJECTS_DIR, "SOURCES.md");

/**
 * Mechanical guard against an unreviewed/undocumented visual ever
 * reaching the homepage (FINAL-DESIGN-01A-R3 §C): every entry in
 * PROJECT_SCREENSHOTS must (a) point at a file that actually exists, and
 * (b) have a matching provenance entry in SOURCES.md, which is where the
 * source URL when applicable, creation date, classification, and privacy
 * confirmation live for human review.
 */
describe("project-screenshot-provenance guard", () => {
  const entries = Object.entries(PROJECT_SCREENSHOTS);

  it("has at least the entries this pass captured, so the guard isn't vacuously trivial", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("every registered visual file actually exists on disk", () => {
    for (const [slug, screenshot] of entries) {
      const filePath = join(WEB_ROOT, "public", screenshot.path.replace(/^\//, ""));
      expect(existsSync(filePath), `${slug}: ${screenshot.path} does not exist`).toBe(true);
    }
  });

  it("every visual has a documented provenance entry in SOURCES.md", () => {
    const sourcesText = existsSync(SOURCES_MD) ? readFileSync(SOURCES_MD, "utf8") : "";
    for (const [slug, screenshot] of entries) {
      const filename = screenshot.path.split("/").pop() ?? "";
      expect(sourcesText.includes(filename), `${slug}: no SOURCES.md entry for ${filename}`).toBe(true);
      if (screenshot.sourceUrl) {
        expect(sourcesText.includes(screenshot.sourceUrl), `${slug}: SOURCES.md is missing its documented sourceUrl`).toBe(true);
      }
    }
  });

  it("evidence-media source URLs use HTTPS while illustrations claim none", () => {
    for (const [slug, screenshot] of entries) {
      if (screenshot.sourceKind === "illustrative") {
        expect(screenshot.sourceUrl, `${slug}: illustration must not claim a capture URL`).toBeNull();
      } else {
        expect(screenshot.sourceUrl?.startsWith("https://"), `${slug}: sourceUrl must be https`).toBe(true);
      }
    }
  });

  it("every visual declares its provenance, display behavior, and meaningful alt text", () => {
    for (const [slug, screenshot] of entries) {
      expect(["public_capture", "owner_provided", "illustrative"], `${slug}: invalid sourceKind`).toContain(screenshot.sourceKind);
      expect(["pan", "cover"], `${slug}: invalid display mode`).toContain(screenshot.display);
      expect(screenshot.alt.trim().length, `${slug}: missing alt text`).toBeGreaterThan(10);
      if (screenshot.sourceKind === "illustrative") {
        expect(screenshot.display, `${slug}: illustrations must stay static`).toBe("cover");
        expect(screenshot.alt.toLowerCase(), `${slug}: illustration alt must disclose its nature`).toContain("concept illustration");
      }
    }
  });

  it("keeps every committed project visual in an optimized web format below 500 KB", () => {
    for (const [slug, screenshot] of entries) {
      expect(screenshot.path.endsWith(".webp"), `${slug}: project media must be WebP`).toBe(true);
      const filePath = join(WEB_ROOT, "public", screenshot.path.replace(/^\//, ""));
      expect(statSync(filePath).size, `${slug}: project media exceeds 500 KB`).toBeLessThan(500_000);
    }
  });
});
