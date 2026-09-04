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
vi.mock("@/lib/motion/gsap-client", () => ({
  getGsap: () => null,
  isMobileViewport: () => false,
}));

import { ExperienceJourney } from "@/components/sections/experience-journey";
import type { Experience } from "@/lib/api/types";

function makeExperience(overrides: Partial<Experience>): Experience {
  return {
    id: 1,
    company_name: "HA Technologies",
    role_title: "Software Developer",
    start_date: "2025-06-01",
    end_date: null,
    location: "Islamabad",
    description: "Backend development.",
    achievements: ["Shipped a real API"],
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
    ...overrides,
  };
}

/**
 * FINAL-DESIGN-01A-R3 regression test: this is one of the sections named
 * in the reported blank-content defect. With gsap-client's getGsap()
 * mocked to return null (simulating GSAP failing to load/initialize
 * entirely), every role's real content must still render - it is never
 * opacity-gated on GSAP running at all.
 */
describe("ExperienceJourney - GSAP unavailable", () => {
  it("renders every role's content even when GSAP fails to load", () => {
    render(
      <ExperienceJourney
        experiences={[
          makeExperience({ id: 1, role_title: "Software Developer", company_name: "HA Technologies" }),
          makeExperience({ id: 2, role_title: "Python Developer Intern", company_name: "CodeAlpha", current_role: false }),
        ]}
      />,
    );

    expect(screen.getByText("Software Developer")).toBeInTheDocument();
    expect(screen.getByText(/HA Technologies/)).toBeInTheDocument();
    expect(screen.getByText("Python Developer Intern")).toBeInTheDocument();
    expect(screen.getAllByText("Shipped a real API").length).toBeGreaterThan(0);
  });
});
