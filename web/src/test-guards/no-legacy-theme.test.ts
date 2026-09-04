import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");

/**
 * FINAL-DESIGN-01A guard: the rejected dark-navy/cyan visual identity
 * (P01's --primary/--accent oklch values and their sRGB mirrors in the
 * Satori-rendered icon/OG routes) must never come back. Checks both the
 * CSS custom-property source and every hardcoded hex mirror, since
 * next/og's renderer can't consume CSS variables and duplicates them as
 * literal hex - see lib/og-image.tsx's own doc comment.
 */
const BANNED_VALUES = [
  "oklch(0.68 0.195 224)", // legacy --primary (cyan-blue)
  "oklch(0.68 0.22 178)", // legacy --accent (teal)
  "#0a0e15", // legacy --background hex mirror
  "#4ea8de", // legacy --primary hex mirror
  "#34c9a6", // legacy --accent hex mirror
];

const FILES_TO_SCAN = [
  "app/globals.css",
  "app/layout.tsx",
  "app/icon.tsx",
  "app/apple-icon.tsx",
  "app/global-error.tsx",
  "lib/og-image.tsx",
];

describe("no-legacy-theme guard", () => {
  for (const file of FILES_TO_SCAN) {
    for (const value of BANNED_VALUES) {
      it(`${file} never contains the legacy value "${value}"`, () => {
        const content = readFileSync(join(SRC_ROOT, file), "utf8");
        expect(content).not.toContain(value);
      });
    }
  }

  it("globals.css declares the new signature burnt-orange primary", () => {
    const css = readFileSync(join(SRC_ROOT, "app/globals.css"), "utf8");
    expect(css).toContain("--primary: #b8420f");
  });

  it("layout.tsx no longer loads the retired Sora display face", () => {
    const layout = readFileSync(join(SRC_ROOT, "app/layout.tsx"), "utf8");
    expect(layout).not.toContain("Sora");
  });
});
