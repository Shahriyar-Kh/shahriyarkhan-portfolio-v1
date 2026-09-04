import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");
const INCLUDE_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

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
 * FINAL-DESIGN-01A-R4 Part A guard. The reported "Inter/Roboto/Roboto
 * Mono blocked by CSP" console warnings were diagnosed via a clean,
 * extension-free Chromium session (zero fonts.googleapis.com/
 * fonts.gstatic.com network requests, zero permissions-policy
 * violations - see docs/rebuild/FINAL_DESIGN_01A_R4_AUDIT_AND_REPORT.md)
 * and traced, in the reference recording's own DevTools console, to a
 * third-party script (`inspector.b9415ea5.js`) injected by the owner's
 * normal browser session - not application code. This app self-hosts
 * Fraunces/Manrope/JetBrains Mono via next/font/google (app/layout.tsx)
 * and next.config.ts's CSP font-src is 'self' data: only, with no Google
 * Fonts origin allowed. This guard keeps it that way: it fails if a
 * remote Google Fonts origin, or Inter/Roboto as a font-family, is ever
 * introduced into application source.
 */
describe("no-remote-google-fonts guard", () => {
  const files = collectFiles(SRC_ROOT).filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));

  it("never references a Google Fonts network origin", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(content)) {
        offenders.push(relative(SRC_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never declares Inter or Roboto as an app font-family", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (/font-family\s*:\s*["']?(Inter|Roboto)\b/i.test(content)) {
        offenders.push(relative(SRC_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("next.config.ts's CSP font-src never allows a Google Fonts origin", () => {
    const nextConfig = readFileSync(join(SRC_ROOT, "..", "next.config.ts"), "utf8");
    expect(nextConfig).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });
});
