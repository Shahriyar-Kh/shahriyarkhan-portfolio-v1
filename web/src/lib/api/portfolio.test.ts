import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function freshPortfolio() {
  vi.resetModules();
  return import("@/lib/api/portfolio");
}

describe("getServiceBySlug", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("finds a service by slug from the list endpoint (no detail endpoint exists on the backend)", async () => {
    const services = [
      { id: 1, slug: "backend-development", title: "Backend Development" },
      { id: 2, slug: "website-development", title: "Website Development" },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(services), { status: 200 })));
    const { getServiceBySlug } = await freshPortfolio();

    const result = await getServiceBySlug("website-development");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe(2);
  });

  it("returns a not_found error for a slug not present in the list, mirroring a real 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })));
    const { getServiceBySlug } = await freshPortfolio();

    const result = await getServiceBySlug("does-not-exist");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });

  it("propagates a list-fetch failure rather than masking it as not_found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network down")));
    const { getServiceBySlug } = await freshPortfolio();

    const result = await getServiceBySlug("backend-development");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("network");
  });
});
