import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

describe("middleware (www -> apex redirect)", () => {
  it("301s www.shahriyarkhan.com to the apex, preserving path and query string", () => {
    const request = new NextRequest("https://www.shahriyarkhan.com/services/website-development?ref=share", {
      headers: { host: "www.shahriyarkhan.com" },
    });
    const response = middleware(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://shahriyarkhan.com/services/website-development?ref=share");
  });

  it("redirects the bare www root to the bare apex root", () => {
    const request = new NextRequest("https://www.shahriyarkhan.com/", {
      headers: { host: "www.shahriyarkhan.com" },
    });
    const response = middleware(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://shahriyarkhan.com/");
  });

  it("never redirects the apex domain itself", () => {
    const request = new NextRequest("https://shahriyarkhan.com/about", {
      headers: { host: "shahriyarkhan.com" },
    });
    const response = middleware(request);

    expect(response.status).not.toBe(301);
    expect(response.headers.get("location")).toBeNull();
  });

  it("never redirects the temporary workers.dev fallback host kept live during cutover", () => {
    const request = new NextRequest("https://shahriyarkhan-portfolio.feelwise.workers.dev/about", {
      headers: { host: "shahriyarkhan-portfolio.feelwise.workers.dev" },
    });
    const response = middleware(request);

    expect(response.status).not.toBe(301);
    expect(response.headers.get("location")).toBeNull();
  });

  it("never redirects localhost (local development)", () => {
    const request = new NextRequest("http://localhost:3000/", {
      headers: { host: "localhost:3000" },
    });
    const response = middleware(request);

    expect(response.status).not.toBe(301);
    expect(response.headers.get("location")).toBeNull();
  });
});
