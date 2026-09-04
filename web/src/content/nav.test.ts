import { describe, expect, it } from "vitest";
import { PRIMARY_NAV } from "@/content/nav";

describe("PRIMARY_NAV", () => {
  it("includes the standalone /skills route", () => {
    expect(PRIMARY_NAV.some((item) => item.href === "/skills")).toBe(true);
  });

  it("includes every core route the header/footer chrome links to", () => {
    const hrefs = PRIMARY_NAV.map((item) => item.href);
    for (const required of ["/", "/about", "/work", "/services", "/contact"]) {
      expect(hrefs).toContain(required);
    }
  });

  it("has no duplicate hrefs or labels", () => {
    const hrefs = PRIMARY_NAV.map((item) => item.href);
    const labels = PRIMARY_NAV.map((item) => item.label);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
