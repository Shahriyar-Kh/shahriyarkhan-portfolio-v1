import { describe, expect, it } from "vitest";
import { resolveCaseContent } from "@/lib/case-study-merge";
import type { CaseStudy } from "@/content/case-studies/types";
import type { ProjectWithOptionalCaseStudy } from "@/lib/api/types";

const BASE_PROJECT: ProjectWithOptionalCaseStudy = {
  id: 1,
  title: "P",
  slug: "p",
  description: "d",
  technologies: [],
  live_url: "",
  github_url: "",
  preview_image: null,
  featured_image: null,
  alt_text: "",
  ai_summary: "",
  featured: false,
  status: "published",
  published_at: null,
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

const CASE_STUDY: CaseStudy = {
  slug: "p",
  summary: "s",
  sections: [
    { key: "context", heading: "Context", claims: [{ id: "a", statement: "A verified fact.", status: "verified", evidence: "e" }] },
  ],
  evidence: [{ kind: "live", label: "p.example.com", href: "https://p.example.com", verifiedOn: "2026-01-01" }],
  withheld: [],
  limitations: ["A limitation."],
  lastReviewed: "2026-01-01",
};

describe("resolveCaseContent", () => {
  it("is empty when there is no case study and no API fields", () => {
    const content = resolveCaseContent(BASE_PROJECT, null);
    expect(content.isEmpty).toBe(true);
    expect(content.apiSections).toHaveLength(0);
    expect(content.editorialSections).toHaveLength(0);
  });

  it("surfaces the register's editorial sections when the API supplies nothing", () => {
    const content = resolveCaseContent(BASE_PROJECT, CASE_STUDY);
    expect(content.isEmpty).toBe(false);
    expect(content.editorialSections).toHaveLength(1);
    expect(content.editorialSections[0]?.key).toBe("context");
  });

  it("lets the live API win for a section key it supplies, suppressing the register's version", () => {
    const projectWithApiField: ProjectWithOptionalCaseStudy = { ...BASE_PROJECT, overview: "API-supplied overview." };
    const content = resolveCaseContent(projectWithApiField, CASE_STUDY);

    expect(content.apiSections).toHaveLength(1);
    expect(content.apiSections[0]?.body).toBe("API-supplied overview.");
    // "context" maps to the API's "overview" key - suppressed now that the API has it.
    expect(content.editorialSections.find((s) => s.key === "context")).toBeUndefined();
  });

  it("always passes through evidence and limitations from the register", () => {
    const content = resolveCaseContent(BASE_PROJECT, CASE_STUDY);
    expect(content.evidence).toEqual(CASE_STUDY.evidence);
    expect(content.limitations).toEqual(CASE_STUDY.limitations);
  });
});
