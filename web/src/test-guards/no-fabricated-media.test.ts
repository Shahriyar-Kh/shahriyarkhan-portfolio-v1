import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");
const WEB_ROOT = join(__dirname, "../..");

/**
 * The deleted Yango admin-dashboard screenshot (real customer names and
 * phone numbers in a data table - docs/rebuild/P01A5H_PRIVACY_HOTFIX_REPORT.md)
 * must never be reintroduced in any form: as a committed file, as a
 * filename reference, or as a path string anywhere in source. This is a
 * mechanical tripwire on top of the case-study register's own
 * `prohibited` claim entry for it.
 */
const FORBIDDEN_FILENAME_FRAGMENTS = ["custom_dashbaord_image2", "customdashboardimage2"];

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git" || entry === ".next") continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath, out);
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

describe("no-fabricated-media guard", () => {
  it("never references the deleted Yango admin-table screenshot's filename anywhere in web/src", () => {
    const files = collectFiles(SRC_ROOT).filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));
    for (const fragment of FORBIDDEN_FILENAME_FRAGMENTS) {
      const offenders = files.filter((f) => readFileSync(f, "utf8").toLowerCase().includes(fragment.toLowerCase()));
      expect(offenders.map((f) => relative(SRC_ROOT, f))).toEqual([]);
    }
  });

  it("public/images/projects/ contains only the reviewed, documented captures - never an unreviewed or stray file", () => {
    const projectsDir = join(WEB_ROOT, "public", "images", "projects");
    let entries: string[];
    try {
      entries = readdirSync(projectsDir);
    } catch {
      entries = [];
    }
    const imageFiles = entries.filter((e) => /\.(png|jpe?g|webp|avif)$/i.test(e));
    for (const fragment of FORBIDDEN_FILENAME_FRAGMENTS) {
      const offenders = imageFiles.filter((f) => f.toLowerCase().includes(fragment.toLowerCase()));
      expect(offenders).toEqual([]);
    }
  });
});
