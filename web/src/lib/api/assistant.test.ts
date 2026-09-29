import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

async function freshAssistantApi() {
  vi.resetModules();
  return import("@/lib/api/assistant");
}

describe("assistant API cold-start recovery", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    vi.unstubAllGlobals();
  });

  it("prewarms health before the first assistant POST and skips the preflight after success", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ answer: "first" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ answer: "second" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const { postAssistantQuery } = await freshAssistantApi();

    const first = await postAssistantQuery({ message: "Show me Django projects" });
    const second = await postAssistantQuery({ message: "Show me FastAPI projects" });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://api.example.test/healthz");
    const healthInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(healthInit.method).toBeUndefined();

    expect(fetchSpy.mock.calls[1]?.[0]).toBe("https://api.example.test/api/v1/public/assistant/query/");
    const firstQueryInit = fetchSpy.mock.calls[1]?.[1] as RequestInit;
    expect(firstQueryInit.method).toBe("POST");

    expect(fetchSpy.mock.calls[2]?.[0]).toBe("https://api.example.test/api/v1/public/assistant/query/");
    const secondQueryInit = fetchSpy.mock.calls[2]?.[1] as RequestInit;
    expect(secondQueryInit.method).toBe("POST");
  });

  it("still attempts the assistant POST when the health endpoint returns an HTTP error", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ answer: "fallback path" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const { postAssistantQuery } = await freshAssistantApi();
    const result = await postAssistantQuery({ message: "Show me Django projects" });

    expect(result.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://api.example.test/healthz");
    expect(fetchSpy.mock.calls[1]?.[0]).toBe("https://api.example.test/api/v1/public/assistant/query/");
  });
});
