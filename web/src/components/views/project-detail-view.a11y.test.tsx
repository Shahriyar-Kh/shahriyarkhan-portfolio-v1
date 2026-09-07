import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({ alt, ...rest }: { src: string; alt: string }) => <img alt={alt} {...rest} />,
}));

import { ProjectDetailView, ProjectUnavailableView } from "@/components/views/project-detail-view";
import type { CaseStudy } from "@/content/case-studies/types";
import type { Project, ProjectWithOptionalCaseStudy } from "@/lib/api/types";

function makeProject(overrides: Partial<Project>): ProjectWithOptionalCaseStudy {
  return {
    id: 1,
    title: "Accessible Project",
    slug: "accessible-project",
    description: "A project used to check for obvious a11y regressions.",
    technologies: [{ id: 1, name: "Django", slug: "django" }],
    live_url: "https://example.com",
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

const PROJECT = makeProject({});
const SIBLING = makeProject({ id: 2, title: "Sibling Project", slug: "sibling-project" });

const CASE_STUDY: CaseStudy = {
  slug: "accessible-project",
  summary: "Summary.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [{ id: "a", statement: "A verified fact.", status: "verified", evidence: "e" }],
    },
  ],
  evidence: [{ kind: "live", label: "example.com", href: "https://example.com", verifiedOn: "2026-01-01" }],
  withheld: [],
  limitations: ["This page does not claim X."],
  lastReviewed: "2026-01-01",
};

/**
 * axe-in-jsdom cannot evaluate color contrast or true focus order (no
 * layout engine) - this catches structural issues only (missing
 * labels/roles, invalid ARIA, heading order). Manual verification of
 * contrast and focus order is still required.
 */
describe("ProjectDetailView accessibility", () => {
  it("has no axe violations with a full case study and prev/next navigation", async () => {
    const { container } = render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} allProjects={[PROJECT, SIBLING]} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the honest 'not yet published' state", async () => {
    const { container } = render(<ProjectDetailView project={PROJECT} caseStudy={null} allProjects={null} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the unavailable state", async () => {
    const { container } = render(<ProjectUnavailableView message="Could not reach the content service." />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
