import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  getProjects: vi.fn(async () => ({ ok: true, data: [] })),
  getServices: vi.fn(async () => ({ ok: true, data: [] })),
}));

import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("includes /skills among the static routes, alongside every other real route", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith("/skills"))).toBe(true);
    for (const path of ["/about", "/work", "/experience", "/resume", "/services", "/contact", "/privacy"]) {
      expect(urls.some((url) => url.endsWith(path))).toBe(true);
    }
  });

  it("uses the same trailing-slash canonical for the root as page metadata", async () => {
    const entries = await sitemap();

    expect(entries[0]?.url).toBe("https://shahriyarkhan.com/");
  });
});
