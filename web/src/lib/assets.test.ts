import { afterEach, describe, expect, it, vi } from "vitest";
import { assetUrl } from "@/lib/assets";

describe("assetUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns an empty string for a null/undefined path", () => {
    expect(assetUrl(null)).toBe("");
    expect(assetUrl(undefined)).toBe("");
  });

  it("passes an absolute http(s) URL through untouched", () => {
    expect(assetUrl("https://res.cloudinary.com/x/y.png")).toBe("https://res.cloudinary.com/x/y.png");
  });

  it("keeps a bundled /images/ or /resume/ path relative, never prefixing it with the API origin", () => {
    expect(assetUrl("/images/profile.png")).toBe("/images/profile.png");
    expect(assetUrl("/resume/cv.pdf")).toBe("/resume/cv.pdf");
  });
});
