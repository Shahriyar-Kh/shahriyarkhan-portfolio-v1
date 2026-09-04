import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");
const APP_ROOT = join(SRC_ROOT, "app");

/**
 * FINAL-BASE-01 guard: the rejected P01B Design Lab concepts
 * (feat/p01b-signature-visual-rebuild) must never be merged into
 * production routes. This scans every production route file (src/app,
 * the actual Next.js route tree) and the full component tree for any
 * reference to Design Lab / P01B naming - a mechanical guard, not a
 * one-time check, so a future accidental merge fails CI immediately.
 */
const FORBIDDEN_TERMS = ["design-lab", "designlab", "design lab", "p01b"];

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

describe("no-design-lab guard", () => {
  it("has no /design-lab (or similarly named) route directory under src/app", () => {
    const routeDirs = readdirSync(APP_ROOT).filter((entry) => statSync(join(APP_ROOT, entry)).isDirectory());
    const offenders = routeDirs.filter((dir) => FORBIDDEN_TERMS.some((term) => dir.toLowerCase().includes(term)));
    expect(offenders).toEqual([]);
  });

  for (const term of FORBIDDEN_TERMS) {
    it(`never references "${term}" anywhere in src/app (production routes)`, () => {
      const files = collectFiles(APP_ROOT);
      const offenders = files.filter((f) => readFileSync(f, "utf8").toLowerCase().includes(term));
      expect(offenders.map((f) => relative(SRC_ROOT, f))).toEqual([]);
    });

    it(`never references "${term}" anywhere in src (full component tree)`, () => {
      const files = collectFiles(SRC_ROOT).filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));
      const offenders = files.filter((f) => readFileSync(f, "utf8").toLowerCase().includes(term));
      expect(offenders.map((f) => relative(SRC_ROOT, f))).toEqual([]);
    });
  }
});
