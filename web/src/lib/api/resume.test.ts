import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function freshResume() {
  vi.resetModules();
  return import("@/lib/api/resume");
}

describe("getDefaultResume", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats the documented 'no default resume configured' 404 as a valid not_found result, not a thrown error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "No published default resume is configured." }), { status: 404 })),
    );
    const { getDefaultResume } = await freshResume();

    const result = await getDefaultResume();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });

  it("requests the singular /resume/default/ path", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { getDefaultResume } = await freshResume();

    await getDefaultResume();

    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://api.example.test/api/v1/public/resume/default/");
  });
});
