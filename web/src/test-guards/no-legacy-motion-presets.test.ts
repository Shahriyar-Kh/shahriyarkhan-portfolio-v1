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
 * FINAL-DESIGN-01A-R3 guard: `fadeUpReveal`/`staggerReveal` (the
 * gsap.fromTo(...,{opacity:0},{...,scrollTrigger:{once:true}}) pattern
 * responsible for a reported blank-content defect - see
 * lib/motion/presets.ts's doc comment) must never be reintroduced.
 * Checks specifically for an import naming either symbol from
 * lib/motion/presets - not bare mentions of the name, since several
 * doc comments deliberately reference the old identifiers by name to
 * explain what was removed and why.
 */
describe("no-legacy-motion-presets guard", () => {
  const files = collectFiles(SRC_ROOT).filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));
  const importLine = /import\s*\{([^}]*)\}\s*from\s*["']@\/lib\/motion\/presets["']/g;

  it("never imports fadeUpReveal or staggerReveal from lib/motion/presets", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const match of content.matchAll(importLine)) {
        const names = match[1] ?? "";
        if (/\bfadeUpReveal\b/.test(names) || /\bstaggerReveal\b/.test(names)) {
          offenders.push(relative(SRC_ROOT, file));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("lib/motion/presets.ts no longer exports fadeUpReveal or staggerReveal", () => {
    const presets = readFileSync(join(SRC_ROOT, "lib/motion/presets.ts"), "utf8");
    expect(presets).not.toMatch(/export\s+function\s+fadeUpReveal/);
    expect(presets).not.toMatch(/export\s+function\s+staggerReveal/);
  });
});
