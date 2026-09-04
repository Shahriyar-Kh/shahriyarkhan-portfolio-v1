import { describe, expect, it } from "vitest";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { absoluteUrl, buildMetadata, mergePageSeo } from "@/lib/metadata";
import { SITE_URL } from "@/content/site";
import type { PageSeo } from "@/lib/api/types";

describe("absoluteUrl", () => {
  it("builds a canonical URL rooted at SITE_URL, never a Vercel preview host", () => {
    expect(absoluteUrl("/work")).toBe(`${SITE_URL}/work`);
    expect(absoluteUrl("/")).toBe(`${SITE_URL}/`);
  });
});

describe("buildMetadata", () => {
  it("sets the canonical alternate to the same absolute URL", () => {
    const metadata = buildMetadata({ pathname: "/about", title: "About", description: "d" });
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/about`);
  });

  it("omits OG/Twitter images when none is given", () => {
    const metadata = buildMetadata({ pathname: "/about", title: "About", description: "d" });
    expect(metadata.twitter).toMatchObject({ card: "summary" });
  });
});

describe("mergePageSeo", () => {
  const defaults = { title: "Default title", description: "Default description", keywords: "default" };

  it("returns the defaults unchanged when pageSeo is null", () => {
    expect(mergePageSeo(defaults, null)).toEqual(defaults);
  });

  it("prefers a non-empty PageSEO field over the default", () => {
    const pageSeo = { title_tag: "Custom title", meta_description: "", keywords: "" } as PageSeo;
    const merged = mergePageSeo(defaults, pageSeo);
    expect(merged.title).toBe("Custom title");
  });

  it("never lets a blank PageSEO field blank out a good default", () => {
    const pageSeo = { title_tag: "", meta_description: "", keywords: "" } as PageSeo;
    const merged = mergePageSeo(defaults, pageSeo);
    expect(merged).toEqual(defaults);
  });
});

describe("ROUTE_METADATA_DEFAULTS", () => {
  for (const [route, entry] of Object.entries(ROUTE_METADATA_DEFAULTS)) {
    it(`${route}: title is <=60 chars and description is 120-160 chars`, () => {
      expect(entry.title.length).toBeLessThanOrEqual(60);
      expect(entry.description.length).toBeGreaterThanOrEqual(120);
      expect(entry.description.length).toBeLessThanOrEqual(160);
    });
  }
});
