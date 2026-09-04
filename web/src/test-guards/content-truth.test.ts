import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");

/**
 * A mechanical guard against the exact fabrication patterns the content-
 * truth audit found in the legacy app (see docs/rebuild/
 * CONTENT_TRUTH_INVENTORY.md) - checked-red terms that must never appear
 * in ordinary source. Deliberately excludes src/content/case-studies/**,
 * whose `withheld` arrays exist specifically to record these same
 * strings as *prohibited* claims that never render - see that
 * directory's own case-studies.test.ts for the enforcement that applies
 * there instead.
 */
const FORBIDDEN_TERMS = [
  "aws certif",
  "senior software engineer",
  "enterprise-grade",
  "production-grade",
  "trusted by",
  "happy clients",
  "projects built",
  "reduces time-to-answer",
  "world-class",
  "best-in-class",
];

const EXCLUDED_DIR_SEGMENTS = [`content${sep}case-studies`];
const INCLUDE_EXTENSIONS = new Set([".ts", ".tsx"]);

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath, out);
    } else if (INCLUDE_EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) {
      out.push(fullPath);
    }
  }
  return out;
}

function isExcluded(relPath: string): boolean {
  if (relPath.endsWith(".test.ts") || relPath.endsWith(".test.tsx")) return true;
  return EXCLUDED_DIR_SEGMENTS.some((segment) => relPath.includes(segment));
}

describe("content-truth guard", () => {
  const files = collectFiles(SRC_ROOT).filter((f) => !isExcluded(relative(SRC_ROOT, f)));

  it("scans a non-trivial number of source files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  for (const term of FORBIDDEN_TERMS) {
    it(`never contains the forbidden term "${term}" outside the case-study register`, () => {
      const offenders = files.filter((f) => readFileSync(f, "utf8").toLowerCase().includes(term));
      expect(offenders.map((f) => relative(SRC_ROOT, f))).toEqual([]);
    });
  }
});
