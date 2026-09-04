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

import { WorkView } from "@/components/views/work-view";
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

describe("WorkView", () => {
  it("renders a project grid for a populated list", () => {
    render(<WorkView projects={[makeProject({ id: 1, title: "Alpha" }), makeProject({ id: 2, title: "Beta", slug: "beta" })]} />);

    expect(screen.getByRole("heading", { name: "Selected work" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Beta" })).toBeInTheDocument();
  });

  it("renders an honest unavailable state for a failed fetch (null), not an empty grid", () => {
    render(<WorkView projects={null} />);
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("renders an honest empty state for a genuinely empty list ([]), distinct from unavailable", () => {
    render(<WorkView projects={[]} />);
    expect(screen.getByText(/No published projects yet\./i)).toBeInTheDocument();
  });
});
