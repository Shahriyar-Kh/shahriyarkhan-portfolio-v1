import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");
const LAYOUT_PATH = join(SRC_ROOT, "app/layout.tsx");

/**
 * PORTFOLIO-ASSISTANTS-02 regression guard for the confirmed visual
 * defect: the assistant launcher must be imported and rendered directly
 * by the root layout (the one shell every public route shares), and must
 * NOT be routed through a separate `next/dynamic({ ssr: false })` client
 * wrapper module - that indirection (assistant-launcher-client.tsx, now
 * removed) is exactly what let the button silently fail to mount with no
 * fallback and no retry. See assistant-launcher.tsx's own top-of-file
 * comment for the full root-cause explanation.
 */
describe("assistant launcher mounting guard", () => {
  const layoutSource = readFileSync(LAYOUT_PATH, "utf8");

  it("app/layout.tsx imports AssistantLauncher directly from components/assistant/assistant-launcher", () => {
    expect(layoutSource).toMatch(/import\s*\{\s*AssistantLauncher\s*\}\s*from\s*["']@\/components\/assistant\/assistant-launcher["']/);
  });

  it("app/layout.tsx renders <AssistantLauncher /> in the shared shell", () => {
    expect(layoutSource).toMatch(/<AssistantLauncher\s*\/>/);
  });

  it("no separate dynamic-import client wrapper module exists for the launcher", () => {
    expect(() => readFileSync(join(SRC_ROOT, "components/assistant/assistant-launcher-client.tsx"), "utf8")).toThrow();
  });

  it("assistant-launcher.tsx's own trigger button is not itself behind a next/dynamic() call", () => {
    const launcherSource = readFileSync(join(SRC_ROOT, "components/assistant/assistant-launcher.tsx"), "utf8");
    const dynamicCallLines = launcherSource
      .split("\n")
      .filter((line) => line.includes("dynamic("))
      .join("\n");

    // Only the two heavy interior panels may be lazy-loaded - never the
    // component export itself (AssistantChat/ProjectDiscoveryWizard is
    // fine; "AssistantLauncher" appearing in a dynamic() call is not).
    expect(dynamicCallLines).not.toMatch(/dynamic\([^)]*AssistantLauncher/);
    expect(launcherSource).toMatch(/dynamic\(\s*\(\) => import\("@\/components\/assistant\/assistant-chat"\)/);
    expect(launcherSource).toMatch(/dynamic\(\s*\(\) => import\("@\/components\/assistant\/project-discovery-wizard"\)/);
  });
});
