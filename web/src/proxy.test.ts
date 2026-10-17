import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

describe("proxy (canonical public origin)", () => {
  it("301s www.shahriyarkhan.com to the apex, preserving path and query string", () => {
    const request = new NextRequest("https://www.shahriyarkhan.com/services/web-development?ref=share", {
      headers: { host: "www.shahriyarkhan.com" },
    });
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://shahriyarkhan.com/services/web-development?ref=share");
  });

  const legacyUrls = [
    ["/services/website-development", "/services/web-development"],
    ["/services/portfolio-website", "/services/web-development"],
    ["/services/restaurant-website", "/services/web-development"],
    ["/services/ecommerce-website", "/services/web-development"],
    ["/services/backend-development", "/services/application-development"],
    ["/services/custom-web-application", "/services/application-development"],
    ["/services/saas-project", "/services/saas-development"],
    ["/work/techbuilt-open-school-lms", "/work/techbuilt-open-school-lms-final-year-project"],
  ] as const;

  it.each(legacyUrls)("301s legacy %s to canonical %s", (oldPath, newPath) => {
    const request = new NextRequest(`https://shahriyarkhan.com${oldPath}?utm_source=google`, {
      headers: { host: "shahriyarkhan.com" },
    });
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      `https://shahriyarkhan.com${newPath}?utm_source=google`,
    );
  });

  it("combines old-host and old-path redirects into a single hop", () => {
    const request = new NextRequest(
      "https://www.shahriyarkhan.com/services/website-development?ref=old",
      { headers: { host: "www.shahriyarkhan.com" } },
    );
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://shahriyarkhan.com/services/web-development?ref=old",
    );
  });

  it("supports legacy paths with trailing slashes", () => {
    const request = new NextRequest("https://shahriyarkhan.com/services/saas-project/", {
      headers: { host: "shahriyarkhan.com" },
    });
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://shahriyarkhan.com/services/saas-development",
    );
  });

  it("does not redirect unrelated missing slugs to irrelevant content", () => {
    const request = new NextRequest("https://shahriyarkhan.com/services/nonexistent", {
      headers: { host: "shahriyarkhan.com" },
    });
    const response = proxy(request);

    expect(response.status).not.toBe(301);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not redirect legacy paths from unrelated preview hosts", () => {
    const request = new NextRequest("https://preview.example.com/services/website-development", {
      headers: { host: "preview.example.com" },
    });
    const response = proxy(request);

    expect(response.status).not.toBe(301);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects the bare www root to the bare apex root", () => {
    const request = new NextRequest("https://www.shahriyarkhan.com/", {
      headers: { host: "www.shahriyarkhan.com" },
    });
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://shahriyarkhan.com/");
  });

  it("redirects an insecure apex request to HTTPS", () => {
    const request = new NextRequest("http://shahriyarkhan.com/about?from=http", {
      headers: { host: "shahriyarkhan.com" },
    });
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://shahriyarkhan.com/about?from=http",
    );
  });

  it("uses the forwarded protocol when the edge provides it", () => {
    const request = new NextRequest("https://shahriyarkhan.com/privacy", {
      headers: {
        host: "shahriyarkhan.com",
        "x-forwarded-proto": "http",
      },
    });
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://shahriyarkhan.com/privacy",
    );
  });

  it("never redirects the secure apex domain itself", () => {
    const request = new NextRequest("https://shahriyarkhan.com/about", {
      headers: { host: "shahriyarkhan.com" },
    });
    const response = proxy(request);

    expect(response.status).not.toBe(301);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects the workers.dev fallback to the canonical apex", () => {
    const request = new NextRequest("https://shahriyarkhan-portfolio.feelwise.workers.dev/about", {
      headers: { host: "shahriyarkhan-portfolio.feelwise.workers.dev" },
    });
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://shahriyarkhan.com/about",
    );
  });

  it("redirects the legacy Vercel host to the canonical apex", () => {
    const request = new NextRequest(
      "https://shahriyarkhan.vercel.app/work/noteassist-ai?ref=legacy",
      { headers: { host: "shahriyarkhan.vercel.app" } },
    );
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://shahriyarkhan.com/work/noteassist-ai?ref=legacy",
    );
  });

  it("never redirects localhost (local development)", () => {
    const request = new NextRequest("http://localhost:3000/", {
      headers: { host: "localhost:3000" },
    });
    const response = proxy(request);

    expect(response.status).not.toBe(301);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not redirect an unknown preview host", () => {
    const request = new NextRequest("https://preview.example.com/work", {
      headers: { host: "preview.example.com" },
    });
    const response = proxy(request);

    expect(response.status).not.toBe(301);
    expect(response.headers.get("location")).toBeNull();
  });
});
