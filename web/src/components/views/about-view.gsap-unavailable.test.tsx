import { render, screen, within } from "@testing-library/react";
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

import { AboutView } from "@/components/views/about-view";
import type { Education, Experience, Project, Service, Skill } from "@/lib/api/types";

const EXPERIENCE: Experience = {
  id: 1,
  company_name: "HA Technologies (Pvt) Ltd",
  role_title: "Software Developer",
  start_date: "2025-06-01",
  end_date: null,
  location: "Islamabad",
  description: "Developed scalable full-stack web applications.",
  achievements: ["Designed secure backend architectures with JWT authentication and RBAC"],
  technologies: [{ id: 1, name: "Django", slug: "django" }],
  current_role: true,
  status: "published",
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

const EDUCATION: Education = {
  id: 1,
  institution: "Abasyn University, Peshawar",
  degree: "BS Software Engineering",
  start_date: "2021-09-01",
  end_date: "2025-06-30",
  description: "Graduated 2025 • CGPA 3.67",
  status: "published",
  published_at: "2026-01-01T00:00:00Z",
  display_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const SKILL: Skill = {
  id: 1,
  name: "Python",
  description: "",
  level: 4,
  icon_or_badge: "",
  category: { id: 1, name: "Backend", slug: "backend", display_order: 1, created_at: "", updated_at: "" },
  published: true,
  display_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: 1,
    title: "Sample Project",
    slug: "sample-project",
    description: "",
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

function makeService(overrides: Partial<Service>): Service {
  return {
    id: 1,
    title: "Sample Service",
    slug: "sample-service",
    description: "",
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
    ...overrides,
  };
}

/**
 * FINAL-DESIGN-01B-01-R2 regression test, mirroring the established
 * project-proof-timeline.gsap-unavailable.test.tsx pattern: with
 * gsap-client's getGsap() mocked to return null (GSAP failing to load or
 * register entirely, so useScrollReveal's setup callback is simply never
 * invoked anywhere on the page), every section's real content must still
 * render in full. This is the strongest version of "fail-open" - it's
 * not enough that content merely isn't opacity-gated; it must survive
 * motion tooling not being available at all.
 */
describe("AboutView - GSAP unavailable", () => {
  it("renders every section's real content even when GSAP fails to load", () => {
    render(
      <AboutView
        skills={[SKILL]}
        experiences={[EXPERIENCE]}
        education={[EDUCATION]}
        projects={[makeProject({ id: 1, slug: "a" })]}
        services={[makeService({ id: 1, slug: "a" })]}
        specialization="Software Engineering graduate specializing in backend development."
      />,
    );

    const heroRoot = screen.getByRole("heading", { level: 1 }).closest(".bg-paper-raised") as HTMLElement;
    expect(within(heroRoot).getByText("Backend engineering with full-product context")).toBeInTheDocument();
    expect(within(heroRoot).getByRole("link", { name: "View résumé" })).toBeInTheDocument();
    expect(within(heroRoot).getByAltText("Portrait of Shahriyar Khan")).toBeInTheDocument();

    expect(screen.getByText("The career story")).toBeInTheDocument();
    expect(screen.getAllByText("Software Developer").length).toBeGreaterThan(0);
    expect(screen.getByText("BS Software Engineering")).toBeInTheDocument();
    expect(screen.getByText("Model the domain before the endpoint")).toBeInTheDocument();
    expect(screen.getByText("Core engineering strengths")).toBeInTheDocument();
    expect(screen.getAllByText("Product interface").length).toBeGreaterThan(0);
    expect(screen.getByText("Hiring for a software engineering role")).toBeInTheDocument();
  });
});
