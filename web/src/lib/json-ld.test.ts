import { describe, expect, it } from "vitest";
import {
  breadcrumbSchema,
  personSchema,
  projectSchema,
  qualifiesAsSoftwareApplication,
  serializeJsonLd,
  serviceSchema,
  websiteSchema,
} from "@/lib/json-ld";
import type { Project, Service } from "@/lib/api/types";

const BASE_PROJECT: Project = {
  id: 1,
  title: "Test Project",
  slug: "test-project",
  description: "A test project.",
  technologies: [{ id: 1, name: "Django", slug: "django" }],
  live_url: "",
  github_url: "",
  preview_image: null,
  featured_image: null,
  alt_text: "",
  ai_summary: "",
  featured: false,
  status: "published",
  published_at: "2026-01-01T00:00:00Z",
  display_order: 0,
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  og_title: "",
  og_description: "",
  image_alt_text: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("personSchema/websiteSchema", () => {
  it("never emits an Organization type", () => {
    expect(personSchema()["@type"]).toBe("Person");
    expect(websiteSchema()["@type"]).toBe("WebSite");
  });

  it("uses a stable @id referenced by websiteSchema's publisher", () => {
    const person = personSchema();
    const website = websiteSchema();
    expect(website.publisher["@id"]).toBe(person["@id"]);
  });
});

describe("qualifiesAsSoftwareApplication / projectSchema", () => {
  it("is false for a project with no live_url", () => {
    expect(qualifiesAsSoftwareApplication(BASE_PROJECT)).toBe(false);
    expect(projectSchema(BASE_PROJECT)["@type"]).toBe("CreativeWork");
  });

  it("is true for a project with a live_url, and emits WebApplication", () => {
    const live = { ...BASE_PROJECT, live_url: "https://example.com" };
    expect(qualifiesAsSoftwareApplication(live)).toBe(true);
    expect(projectSchema(live)["@type"]).toBe("WebApplication");
  });

  it("never emits offers or aggregateRating", () => {
    const schema = projectSchema({ ...BASE_PROJECT, live_url: "https://example.com" });
    expect(schema).not.toHaveProperty("offers");
    expect(schema).not.toHaveProperty("aggregateRating");
  });
});

describe("serviceSchema", () => {
  const service: Service = {
    id: 1,
    title: "Backend Development",
    slug: "backend-development",
    description: "d",
    deliverables: [],
    featured: false,
    status: "published",
    published_at: "2026-01-01T00:00:00Z",
    display_order: 0,
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    og_title: "",
    og_description: "",
    image_alt_text: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  it("returns null when no framing exists for the service", () => {
    expect(serviceSchema(service, undefined)).toBeNull();
  });

  it("never emits offers even when framing exists", () => {
    const schema = serviceSchema(service, {
      audience: "a",
      problemFraming: "p",
      whatIsNeededToBegin: [],
      relatedProjectSlugs: [],
      engagementSteps: [],
    });
    expect(schema).not.toBeNull();
    expect(schema).not.toHaveProperty("offers");
  });
});

describe("breadcrumbSchema", () => {
  it("numbers positions starting at 1", () => {
    const schema = breadcrumbSchema([{ name: "Home", pathname: "/" }, { name: "Work", pathname: "/work" }]);
    expect(schema.itemListElement[0]?.position).toBe(1);
    expect(schema.itemListElement[1]?.position).toBe(2);
  });
});

describe("serializeJsonLd", () => {
  it("escapes a </script> breakout payload across the whole string", () => {
    const payload = { name: '</script><script>alert(1)</script>', amp: "a & b" };
    const serialized = serializeJsonLd(payload);
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<script>");
    expect(serialized).toContain("\\u003c");
    expect(serialized).toContain("\\u0026");
  });
});
