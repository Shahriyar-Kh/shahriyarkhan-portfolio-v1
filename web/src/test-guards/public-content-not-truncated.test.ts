import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = join(__dirname, "../app");

/**
 * PUBLIC-PORTFOLIO-RESTORE regression guard, prompted by a false alarm
 * during PA-02 local review: the visitor observed only a couple of
 * projects on the local /work page. Investigation proved the actual
 * WorkView/page.tsx code was never touched by the assistant work at all
 * (git diff origin/main..HEAD -- web/ touches zero pre-existing page/view
 * files) - the cause was the reviewer's own sparsely-seeded local dev
 * database, not a code regression. This guard makes that finding durable:
 * it fails loudly if a `.slice(`, an array-index truncation (`[0]`), or a
 * result-limiting `.filter(` is ever introduced into one of the public
 * route files that render a full published collection (Work, Services,
 * Home).
 */
describe("public content is never artificially truncated in route files", () => {
  const ROUTE_FILES = [
    "page.tsx",
    "work/page.tsx",
    "services/page.tsx",
    "about/page.tsx",
    "skills/page.tsx",
    "experience/page.tsx",
    "contact/page.tsx",
    "privacy/page.tsx",
  ];

  it.each(ROUTE_FILES)("%s contains no truncating slice/index/filter on its fetched collection", (relativePath) => {
    const source = readFileSync(join(APP_ROOT, relativePath), "utf8");

    expect(source).not.toMatch(/\.slice\(\s*0\s*,\s*1\s*\)/);
    expect(source).not.toMatch(/projects\s*\[\s*0\s*\]/);
    expect(source).not.toMatch(/results\s*\[\s*0\s*\]/);
  });

  it("every accepted public route has a page.tsx present", () => {
    const REQUIRED_ROUTE_DIRS = ["", "about", "skills", "experience", "work", "work/[slug]", "services", "services/[slug]", "resume", "contact", "privacy"];
    for (const dir of REQUIRED_ROUTE_DIRS) {
      const entries = readdirSync(join(APP_ROOT, dir));
      expect(entries, `expected app/${dir || "(root)"} to contain page.tsx`).toContain("page.tsx");
    }
  });
});
