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
vi.mock("@/lib/motion/gsap-client", () => ({
  getGsap: () => null,
  isMobileViewport: () => false,
}));

import { ProjectProofTimeline } from "@/components/sections/project-proof-timeline";
import type { Project } from "@/lib/api/types";

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: 1,
    title: "Sample Project",
    slug: "sample-project",
    description: "A sample project.",
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

/**
 * FINAL-DESIGN-01A-R3 regression test: the exact section named in the
 * reported blank-content defect. With gsap-client's getGsap() mocked to
 * return null (GSAP failing to load/register entirely), every chapter's
 * title, summary, and tech list must still render - the center line and
 * active-dot state are decorative-only and never gate the content.
 */
describe("ProjectProofTimeline - GSAP unavailable", () => {
  it("renders every chapter's content even when GSAP fails to load", () => {
    render(
      <ProjectProofTimeline
        projects={[
          makeProject({ id: 1, title: "Alpha", slug: "alpha", description: "Alpha description." }),
          makeProject({ id: 2, title: "Beta", slug: "beta", description: "Beta description." }),
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByText("Alpha description.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Beta" })).toBeInTheDocument();
    expect(screen.getByText("Beta description.")).toBeInTheDocument();
  });
});
