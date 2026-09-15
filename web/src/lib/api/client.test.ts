import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

async function freshClient() {
  vi.resetModules();
  return import("@/lib/api/client");
}

describe("apiGet/apiGetList/apiPost", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    vi.unstubAllGlobals();
  });

  it("returns not_configured with zero fetch calls when the API base URL is unset", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { apiGet } = await freshClient();

    const result = await apiGet("/api/v1/public/portfolio/projects/");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("classifies a 404 as not_found, not http", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Not found." }), { status: 404 })),
    );
    const { apiGet } = await freshClient();

    const result = await apiGet("/api/v1/public/resume/default/");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });

  it("never leaks a raw 5xx body into the error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Traceback (most recent call last): ...", { status: 500 })),
    );
    const { apiGet } = await freshClient();

    const result = await apiGet("/api/v1/public/portfolio/projects/");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("http");
      expect(result.error.message).not.toMatch(/Traceback/);
    }
  });

  it("classifies a fetch rejection as network", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed to fetch")));
    const { apiGet } = await freshClient();

    const result = await apiGet("/api/v1/public/portfolio/projects/");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("network");
  });

  it("retries once on a network failure when retry is set, then succeeds", async () => {
    const fetchSpy = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("failed to fetch"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { apiGet } = await freshClient();

    const result = await apiGet("/api/v1/public/portfolio/projects/", { retry: true, retryBackoffMs: [1] });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it("does not retry a 4xx/5xx response even with retry set", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { apiGet } = await freshClient();

    await apiGet("/api/v1/public/portfolio/projects/", { retry: true, retryBackoffMs: [1] });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("survives a retryable failure that only succeeds on the second retry (simulating a slow cold start)", async () => {
    const fetchSpy = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("failed to fetch"))
      .mockRejectedValueOnce(new TypeError("failed to fetch"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 6, next: null, previous: null, results: [{ id: 1 }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { apiGet } = await freshClient();

    const result = await apiGet("/api/v1/public/portfolio/projects/", { retry: true, retryBackoffMs: [1, 1] });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(true);
  });

  it("stops retrying once the bounded backoff schedule is exhausted - never retries indefinitely", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new TypeError("failed to fetch"));
    vi.stubGlobal("fetch", fetchSpy);
    const { apiGet } = await freshClient();

    const result = await apiGet("/api/v1/public/portfolio/projects/", { retry: true, retryBackoffMs: [1, 1] });

    // 1 initial attempt + 2 scheduled retries = 3 total, then it gives up.
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("network");
  });

  it("never retries a validation (400) error even with retry set", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ email: ["Invalid."] }), { status: 400 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { apiGet } = await freshClient();

    await apiGet("/api/v1/public/portfolio/projects/", { retry: true, retryBackoffMs: [1] });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("never retries a not_found (404) error even with retry set", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { apiGet } = await freshClient();

    await apiGet("/api/v1/public/portfolio/projects/", { retry: true, retryBackoffMs: [1] });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("apiGetList follows pagination and re-normalizes the emitted next URL", async () => {
    const page1 = { count: 2, next: "https://api.example.test/api/v1/public/portfolio/projects/?page=2", previous: null, results: [{ id: 1 }] };
    const page2 = { count: 2, next: null, previous: null, results: [{ id: 2 }] };
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(page1), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(page2), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { apiGetList } = await freshClient();

    const result = await apiGetList("/api/v1/public/portfolio/projects/");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(2);
    expect(fetchSpy.mock.calls[1]?.[0]).toBe("https://api.example.test/api/v1/public/portfolio/projects/?page=2");
  });

  it("apiGetList tolerates a bare array response (no pagination envelope)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), { status: 200 })));
    const { apiGetList } = await freshClient();

    const result = await apiGetList("/api/v1/public/portfolio/skills/");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(2);
  });

  it("apiPost parses a DRF field-error map on 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ email: ["Enter a valid email address."] }), { status: 400 })),
    );
    const { apiPost } = await freshClient();

    const result = await apiPost("/api/v1/public/inquiries/contact/", { email: "not-an-email" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
      expect(result.error.fieldErrors?.email).toEqual(["Enter a valid email address."]);
    }
  });

  it("apiPost shows a generic message on 429, never DRF's raw throttle detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Request was throttled. Expected available in 37 seconds." }), {
          status: 429,
        }),
      ),
    );
    const { apiPost } = await freshClient();

    const result = await apiPost("/api/v1/public/inquiries/contact/", { email: "a@b.com" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("Too many attempts. Please try again shortly.");
      expect(result.error.message).not.toMatch(/37 seconds/);
    }
  });

  it("apiGet with cache: 'no-store' passes that through to fetch and never sets next.revalidate", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { apiGet } = await freshClient();

    await apiGet("/api/v1/public/resume/default/", { cache: "no-store" });

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit & { next?: unknown };
    expect(init.cache).toBe("no-store");
    expect(init.next).toBeUndefined();
  });

  it("apiGet without cache uses the revalidate-based next config, never a bare cache: 'no-store'", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { apiGet } = await freshClient();

    await apiGet("/api/v1/public/portfolio/projects/", { revalidate: 300 });

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit & { next?: { revalidate?: number } };
    expect(init.cache).toBeUndefined();
    expect(init.next?.revalidate).toBe(300);
  });

  it("apiPost never sends a GET-only retry", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { apiPost } = await freshClient();

    await apiPost("/api/v1/public/inquiries/contact/", { email: "a@b.com" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
