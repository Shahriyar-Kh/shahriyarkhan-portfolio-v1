import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

function mockReducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  mockReducedMotion(false);
});

describe("ProjectProofTimeline", () => {
  it("renders every project as its own chapter, not only the first one", () => {
    const projects = [
      makeProject({ id: 1, title: "Alpha", slug: "alpha" }),
      makeProject({ id: 2, title: "Beta", slug: "beta" }),
      makeProject({ id: 3, title: "Gamma", slug: "gamma" }),
    ];
    render(<ProjectProofTimeline projects={projects} />);

    for (const title of ["Alpha", "Beta", "Gamma"]) {
      // Exactly one heading per project - the twin-tree/duplicate-DOM
      // regression guard: a mobile/desktop split tree would produce two
      // matches for the same title.
      expect(screen.getAllByRole("heading", { name: title })).toHaveLength(1);
    }
  });

  it("keeps all chapter content visible even when motion is disabled/reduced (fail-open regression)", () => {
    mockReducedMotion(true);
    const projects = [
      makeProject({ id: 1, title: "Alpha", slug: "alpha", description: "Alpha description." }),
      makeProject({ id: 2, title: "Beta", slug: "beta", description: "Beta description." }),
    ];
    render(<ProjectProofTimeline projects={projects} />);

    expect(screen.getByText("Alpha description.")).toBeInTheDocument();
    expect(screen.getByText("Beta description.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Beta" })).toBeInTheDocument();
  });

  it("alternates media/copy order per chapter without duplicating either in the DOM", () => {
    const projects = [
      makeProject({ id: 1, title: "Alpha", slug: "alpha" }),
      makeProject({ id: 2, title: "Beta", slug: "beta" }),
      makeProject({ id: 3, title: "Gamma", slug: "gamma" }),
    ];
    const { container } = render(<ProjectProofTimeline projects={projects} />);

    const rows = container.querySelectorAll("ol > li");
    expect(rows).toHaveLength(3);

    rows.forEach((row, i) => {
      const [mediaCol, copyCol] = Array.from(row.children).filter((el) => el.tagName === "DIV");
      // Mobile: media is always visually first via the un-prefixed
      // `order-1`/`order-2` classes (present unconditionally); only the
      // `lg:` variant flips per chapter.
      expect(mediaCol?.className).toContain("order-1");
      expect(copyCol?.className).toContain("order-2");
      if (i % 2 === 1) {
        expect(mediaCol?.className).toContain("lg:order-2");
        expect(copyCol?.className).toContain("lg:order-1");
      } else {
        expect(mediaCol?.className).not.toContain("lg:order-2");
        expect(copyCol?.className).not.toContain("lg:order-1");
      }
    });
  });

  it("shows live/repo links only when the underlying URL actually exists", () => {
    const projects = [
      makeProject({ id: 1, title: "No Links", slug: "no-links", live_url: "", github_url: "" }),
      makeProject({
        id: 2,
        title: "Has Live",
        slug: "has-live",
        live_url: "https://example.com",
        github_url: "https://github.com/Shahriyar-Kh",
      }),
    ];
    render(<ProjectProofTimeline projects={projects} />);

    expect(screen.queryByRole("link", { name: /view live/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view live/i })).toHaveAttribute("href", "https://example.com");
    // github_url on "Has Live" equals the generic profile URL, not a
    // distinct repo, so "Source" must not render for it.
    expect(screen.queryByRole("link", { name: /^source/i })).not.toBeInTheDocument();
  });

  it("renders an honest unavailable state for a failed fetch, never fake projects", () => {
    render(<ProjectProofTimeline projects={null} />);
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("renders an honest empty state when there are zero published projects", () => {
    render(<ProjectProofTimeline projects={[]} />);
    expect(screen.getByText(/no published projects yet/i)).toBeInTheDocument();
  });
});
