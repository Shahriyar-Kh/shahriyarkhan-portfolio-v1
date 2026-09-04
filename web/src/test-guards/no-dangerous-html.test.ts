import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath, out);
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      out.push(fullPath);
    }
  }
  return out;
}

/**
 * dangerouslySetInnerHTML must exist in exactly one place: the JSON-LD
 * component (the only content this app ever injects as raw HTML, and
 * only after serializeJsonLd()'s escaping - see json-ld.test.ts for the
 * escaping regression test itself).
 */
describe("no-dangerous-html guard", () => {
  it("dangerouslySetInnerHTML appears only in components/seo/json-ld.tsx", () => {
    const files = collectFiles(SRC_ROOT).filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));
    const offenders = files
      .filter((f) => readFileSync(f, "utf8").includes("dangerouslySetInnerHTML"))
      .map((f) => relative(SRC_ROOT, f).replace(/\\/g, "/"));

    expect(offenders).toEqual(["components/seo/json-ld.tsx"]);
  });
});
