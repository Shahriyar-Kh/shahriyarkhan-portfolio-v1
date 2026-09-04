import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");
const INCLUDE_EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * FINAL-DESIGN-01A-R2 guard: the Atif Ali reference material (recordings
 * and screenshots at D:\Django Projects\portfolio-visual-references\,
 * never copied into this repo - see the R2 visual-gap audit) must never
 * leak into source as a name, a copied line of copy, or a byline. Also
 * guards against the specific rejected elements the audit called out:
 * the fabricated stat band and the "Download CV / OR / Hire Me" dual-
 * pill pairing.
 */
const FORBIDDEN_TERMS = [
  "atif",
  "wuaze.com",
  "designed and coded by",
  "download cv",
  "happy clients",
  "15k+ followers",
];

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

describe("no-atif-reference guard", () => {
  const files = collectFiles(SRC_ROOT).filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));

  for (const term of FORBIDDEN_TERMS) {
    it(`never references "${term}" anywhere in src`, () => {
      const offenders = files.filter((f) => readFileSync(f, "utf8").toLowerCase().includes(term));
      expect(offenders.map((f) => relative(SRC_ROOT, f))).toEqual([]);
    });
  }
});
