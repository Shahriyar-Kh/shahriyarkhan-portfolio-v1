import { describe, expect, it } from "vitest";
import { selectFeaturedCase } from "@/lib/home-selection";
import { CASE_STUDIES } from "@/content/case-studies";
import type { Project } from "@/lib/api/types";

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: 1,
    title: "Project",
    slug: "project",
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
    ...overrides,
  };
}

describe("selectFeaturedCase", () => {
  it("returns null for an empty project list", () => {
    expect(selectFeaturedCase([])).toBeNull();
  });

  it("falls back to the first project when none has a case study", () => {
    const projects = [makeProject({ id: 1, slug: "no-register" })];
    expect(selectFeaturedCase(projects)).toBe(projects[0]);
  });

  it("prefers the project with a real case-study register over one without", () => {
    const registeredSlug = Object.keys(CASE_STUDIES)[0]!;
    const projects = [makeProject({ id: 1, slug: "no-register" }), makeProject({ id: 2, slug: registeredSlug })];
    const featured = selectFeaturedCase(projects);
    expect(featured?.slug).toBe(registeredSlug);
  });
});
