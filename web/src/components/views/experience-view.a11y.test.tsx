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

import { ExperienceView } from "@/components/views/experience-view";
import type { Education, Experience } from "@/lib/api/types";

const CURRENT_ROLE: Experience = {
  id: 1,
  company_name: "HA Technologies (Pvt) Ltd",
  role_title: "Software Developer",
  start_date: "2025-06-01",
  end_date: null,
  location: "Islamabad",
  description: "Backend development on production systems.",
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

const PAST_ROLE: Experience = {
  ...CURRENT_ROLE,
  id: 2,
  company_name: "CodeAlpha",
  role_title: "Python Developer Intern",
  start_date: "2025-02-01",
  end_date: "2025-05-31",
  location: "Remote",
  current_role: false,
};

const EDUCATION: Education = {
  id: 1,
  institution: "Abasyn University, Peshawar",
  degree: "BS Software Engineering",
  start_date: "2021-09-01",
  end_date: "2025-06-30",
  description: "Graduated 2025 · CGPA 3.67",
  status: "published",
  published_at: "2026-01-01T00:00:00Z",
  display_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("ExperienceView accessibility", () => {
  it("has no axe violations in its populated state (register, education, scope, career path all rendering)", async () => {
    const { container } = render(<ExperienceView experiences={[CURRENT_ROLE, PAST_ROLE]} education={[EDUCATION]} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in its unavailable state", async () => {
    const { container } = render(<ExperienceView experiences={null} education={null} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in its empty state", async () => {
    const { container } = render(<ExperienceView experiences={[]} education={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
