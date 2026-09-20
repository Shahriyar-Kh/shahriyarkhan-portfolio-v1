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
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));
vi.mock("next/image", () => ({
  default: ({ alt, ...rest }: { src: string; alt: string }) => <img alt={alt} {...rest} />,
}));

import { HomeView } from "@/components/views/home-view";
import type { Education, Experience, Project, Service, Skill } from "@/lib/api/types";

const PROJECT: Project = {
  id: 1,
  title: "Yango Wing Fleet",
  slug: "yango-wing-fleet-digital-registration-fleet-management-platform",
  description: "A fleet registration platform.",
  technologies: [{ id: 1, name: "Django", slug: "django" }],
  live_url: "https://example.com",
  github_url: "https://github.com/Shahriyar-Kh",
  preview_image: null,
  featured_image: null,
  alt_text: "",
  ai_summary: "",
  featured: true,
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

const SERVICE: Service = {
  id: 1,
  title: "Custom Software Development",
  slug: "custom-software-development",
  description: "Custom software built around real business workflows.",
  deliverables: ["Backend/API architecture", "Authentication and permissions"],
  featured: true,
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

const SKILL: Skill = {
  id: 1,
  name: "Django REST Framework",
  description: "",
  level: 3,
  icon_or_badge: "",
  category: { id: 1, name: "Backend", slug: "backend", display_order: 0, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  published: true,
  display_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("HomeView", () => {
  it("renders every section's heading with live-ish data", () => {
    const experiences: Experience[] = [];
    const education: Education[] = [];
    const services: Service[] = [SERVICE];
    const skills: Skill[] = [SKILL];

    render(
      <HomeView
        projects={[PROJECT]}
        experiences={experiences}
        education={education}
        services={services}
        skills={skills}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Shahriyar Khan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Selected work" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Technical capability" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Common questions" })).toBeInTheDocument();
    expect(screen.getAllByText("Yango Wing Fleet").length).toBeGreaterThan(0);
  });

  it("keeps both the recruiter and the client conversion path present", () => {
    render(<HomeView projects={[PROJECT]} experiences={[]} education={[]} services={[]} skills={[]} />);

    expect(screen.getByRole("link", { name: "View engineering work" })).toHaveAttribute("data-analytics-event", "recruiter_cta_click");
    expect(screen.getByRole("link", { name: "Discuss a project" })).toHaveAttribute("data-analytics-event", "project_cta_click");
    // The dual-conversion fork (§J) restates both paths explicitly.
    expect(screen.getByText("Hiring for a software engineering role")).toBeInTheDocument();
    expect(screen.getByText("Building a software product")).toBeInTheDocument();
  });

  it("renders real, live services - never invented pricing or timelines", () => {
    render(<HomeView projects={[PROJECT]} experiences={[]} education={[]} services={[SERVICE]} skills={[]} />);

    expect(screen.getByRole("link", { name: "Custom Software Development" })).toBeInTheDocument();
    expect(screen.getByText(/Custom software built around real business workflows\./)).toBeInTheDocument();
    expect(screen.queryByText(/\$|per hour|per month|guarantee/i)).not.toBeInTheDocument();
  });

  it("shows skill proficiency as a categorical label, never a percentage", () => {
    render(<HomeView projects={[PROJECT]} experiences={[]} education={[]} services={[]} skills={[SKILL]} />);

    // A verified Core Stack technology (this fixture's "Django REST
    // Framework" matches the Django keyword) legitimately appears twice -
    // once in the Core Stack preview row, once in its full category
    // breakdown - same "appears in more than one section" shape as
    // "Yango Wing Fleet" elsewhere in this file.
    expect(screen.getAllByText("Django REST Framework").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Advanced").length).toBeGreaterThan(0);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("renders honest empty/unavailable states when every list is null or empty, never fake data", () => {
    render(<HomeView projects={null} experiences={null} education={null} services={[]} skills={null} />);

    expect(screen.getAllByText(/temporarily unavailable/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/No published services yet\./i)).toBeInTheDocument();
  });

  it("keeps the entire page's real content intact under prefers-reduced-motion", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      render(
        <HomeView projects={[PROJECT]} experiences={[]} education={[]} services={[SERVICE]} skills={[SKILL]} />,
      );

      expect(screen.getByRole("heading", { level: 1, name: "Shahriyar Khan" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Selected work" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Technical capability" })).toBeInTheDocument();
      expect(screen.getAllByText("Yango Wing Fleet").length).toBeGreaterThan(0);
      expect(screen.getByRole("link", { name: "Custom Software Development" })).toBeInTheDocument();
      expect(screen.getAllByText("Django REST Framework").length).toBeGreaterThan(0);
      expect(screen.getByText("Hiring for a software engineering role")).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
