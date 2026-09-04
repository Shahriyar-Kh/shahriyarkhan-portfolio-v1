import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");
const THIRD_PARTY_SCRIPT_HOSTS = ["googletagmanager.com", "google-analytics.com", "hotjar.com", "segment.com", "mixpanel.com"];

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
 * Mechanically enforces the /privacy page's own claims (see
 * content/privacy.ts) rather than letting them silently drift: no cookie
 * writes, no third-party script tag, and analytics stays an unregistered
 * no-op in this phase - see lib/analytics.ts's setAnalyticsProvider().
 */
describe("privacy-consistency guard", () => {
  const files = collectFiles(SRC_ROOT).filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));
  const contents = files.map((f) => ({ path: relative(SRC_ROOT, f).replace(/\\/g, "/"), text: readFileSync(f, "utf8") }));

  it("never writes document.cookie", () => {
    const offenders = contents.filter((f) => f.text.includes("document.cookie")).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("never references a known third-party tracking script host", () => {
    const offenders = contents.filter((f) => THIRD_PARTY_SCRIPT_HOSTS.some((host) => f.text.includes(host))).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("never calls setAnalyticsProvider() outside its own definition (no provider registered in this phase)", () => {
    const callSites = contents.flatMap((f) =>
      f.text
        .split("\n")
        .filter((line) => line.includes("setAnalyticsProvider(") && !line.includes("function setAnalyticsProvider") && !line.includes("export function setAnalyticsProvider"))
        .map((line) => `${f.path}: ${line.trim()}`),
    );
    expect(callSites).toEqual([]);
  });
});
