import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

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
import type { ProjectWithOptionalCaseStudy } from "@/lib/api/types";

const PROJECT: ProjectWithOptionalCaseStudy = {
  id: 1,
  title: "Test Project",
  slug: "test-project",
  description: "A test project.",
  technologies: [{ id: 1, name: "Django", slug: "django" }],
  live_url: "https://example.com",
  github_url: "https://github.com/Shahriyar-Kh",
  preview_image: null,
  featured_image: null,
  alt_text: "",
  ai_summary: "A short summary.",
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

const CASE_STUDY: CaseStudy = {
  slug: "test-project",
  summary: "A case study summary.",
  sections: [
    {
      key: "architecture",
      heading: "Architecture",
      claims: [{ id: "a", statement: "A verified architectural fact.", status: "verified", evidence: "e" }],
    },
  ],
  evidence: [{ kind: "live", label: "example.com", href: "https://example.com", verifiedOn: "2026-01-01" }],
  withheld: [],
  limitations: ["This page does not claim X."],
  lastReviewed: "2026-01-01",
};

describe("ProjectDetailView", () => {
  it("renders the project hero and the register's case sections when a case study exists", () => {
    render(<ProjectDetailView project={PROJECT} caseStudy={CASE_STUDY} />);

    expect(screen.getByRole("heading", { level: 1, name: "Test Project" })).toBeInTheDocument();
    expect(screen.getByText("Architecture")).toBeInTheDocument();
    expect(screen.getByText("A verified architectural fact.")).toBeInTheDocument();
    expect(screen.getByText("This page does not claim X.")).toBeInTheDocument();
  });

  it("renders an honest 'not yet published' notice when no case study and no API case fields exist", () => {
    render(<ProjectDetailView project={PROJECT} caseStudy={null} />);

    expect(screen.getByRole("heading", { level: 1, name: "Test Project" })).toBeInTheDocument();
    expect(screen.getByText(/not yet published/i)).toBeInTheDocument();
  });
});

describe("ProjectUnavailableView", () => {
  it("renders the given message for a transient fetch failure", () => {
    render(<ProjectUnavailableView message="Could not reach the content service." />);
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByText("Could not reach the content service.")).toBeInTheDocument();
  });
});
