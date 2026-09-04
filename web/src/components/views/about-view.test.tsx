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

import { AboutView } from "@/components/views/about-view";
import type { Education, Experience, Skill } from "@/lib/api/types";

const EXPERIENCE: Experience = {
  id: 1,
  company_name: "HA Technologies (Pvt) Ltd",
  role_title: "Software Developer",
  start_date: "2025-06-01",
  end_date: null,
  location: "Islamabad",
  description: "",
  achievements: [],
  technologies: [],
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
  description: "",
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

describe("AboutView", () => {
  it("includes profile imagery, engineering principles, career narrative, and a strengths/experience preview", () => {
    render(
      <AboutView
        skills={[SKILL]}
        experiences={[EXPERIENCE]}
        education={[EDUCATION]}
        specialization="Software Engineering graduate specializing in backend development."
      />,
    );

    expect(screen.getByAltText("Portrait of Shahriyar Khan")).toBeInTheDocument();
    expect(screen.getByText("Software Engineering graduate specializing in backend development.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Engineering principles" })).toBeInTheDocument();
    expect(screen.getByText("The data model comes first")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Experience and education" })).toBeInTheDocument();
    expect(screen.getByText(/Software Developer/)).toBeInTheDocument();
    expect(screen.getByText("BS Software Engineering")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Core strengths and technology coverage" })).toBeInTheDocument();
    expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
  });

  it("keeps both the recruiter and the client conversion paths present", () => {
    render(<AboutView skills={[]} experiences={[]} education={[]} specialization={null} />);

    expect(screen.getByText("Hiring for a role")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View résumé" })).toBeInTheDocument();
    expect(screen.getByText("Starting a project")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get in touch" })).toBeInTheDocument();
  });

  it("falls back to the honest default specialization line when SiteSettings is unavailable", () => {
    render(<AboutView skills={null} experiences={null} education={null} specialization={null} />);
    expect(
      screen.getByText(/Software Engineering graduate specializing in backend development/),
    ).toBeInTheDocument();
    expect(screen.getByText("Skill data is temporarily unavailable.")).toBeInTheDocument();
  });
});
