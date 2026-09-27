import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  getProjects: vi.fn(async () => ({
    ok: true,
    data: [
      {
        slug: "shahriyar-khan-full-stack-portfolio-ai-assistant-platform",
        updated_at: "2026-09-27T00:00:00Z",
      },
      {
        slug: "nurses-beyond-borders-nclex-learning-exam-preparation-platform",
        updated_at: "2026-09-27T00:00:00Z",
      },
    ],
  })),
  getServices: vi.fn(async () => ({
    ok: true,
    data: [
      { slug: "application-development", updated_at: "2026-09-27T00:00:00Z" },
      { slug: "custom-software-development", updated_at: "2026-09-27T00:00:00Z" },
      { slug: "saas-development", updated_at: "2026-09-27T00:00:00Z" },
      { slug: "cloud-application-development", updated_at: "2026-09-27T00:00:00Z" },
    ],
  })),
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

  it("uses the same normalized canonical for the root as page metadata", async () => {
    const entries = await sitemap();

    expect(entries[0]?.url).toBe("https://shahriyarkhan.com");
  });

  it("keeps every priority service and case-study URL discoverable", async () => {
    const entries = await sitemap();
    const urls = new Set(entries.map((entry) => entry.url));

    for (const path of [
      "/services/application-development",
      "/services/custom-software-development",
      "/services/saas-development",
      "/services/cloud-application-development",
      "/work/shahriyar-khan-full-stack-portfolio-ai-assistant-platform",
      "/work/nurses-beyond-borders-nclex-learning-exam-preparation-platform",
    ]) {
      expect(urls.has(`https://shahriyarkhan.com${path}`), path).toBe(true);
    }
  });
});
