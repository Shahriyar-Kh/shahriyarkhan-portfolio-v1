import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");
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

/**
 * FINAL-DESIGN-01A-R3 explicitly flagged these two names as things that
 * must never be reintroduced. "InsightBoard" does legitimately appear in
 * a couple of `lib/` doc comments (e.g. lib/api/portfolio.ts,
 * lib/project-page-state.ts) explaining exclusion/404 logic for a real
 * backend draft-status project row that correctly never reaches the
 * public site - that's the guard working as intended, not a violation,
 * so this scans only `content/` and `components/` (actual rendered
 * copy) rather than the whole tree, to catch the real risk (either name
 * appearing in user-facing content) without false-flagging legitimate
 * code comments about why it's excluded.
 */
describe("no-unfamiliar-terms guard", () => {
  const renderedContentDirs = ["content", "components"];
  const files = renderedContentDirs
    .flatMap((dir) => collectFiles(join(SRC_ROOT, dir)))
    .filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));

  for (const term of ["cognorise", "insightboard"]) {
    it(`never renders "${term}" in any user-facing content or component`, () => {
      const offenders = files.filter((f) => readFileSync(f, "utf8").toLowerCase().includes(term));
      expect(offenders.map((f) => relative(SRC_ROOT, f))).toEqual([]);
    });
  }
});
