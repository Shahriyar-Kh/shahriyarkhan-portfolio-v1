import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExperienceView } from "@/components/views/experience-view";
import type { Education, Experience, Skill } from "@/lib/api/types";

const EXPERIENCE: Experience = {
  id: 1,
  company_name: "HA Technologies (Pvt) Ltd",
  role_title: "Software Developer",
  start_date: "2025-06-01",
  end_date: null,
  location: "Islamabad",
  description: "Backend development on production systems.",
  achievements: ["Shipped a REST API used in production."],
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
  description: "Graduated 2025 · CGPA 3.67",
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

describe("ExperienceView", () => {
  it("renders every available Experience field: company, role, dates, location, description, achievements, technologies", () => {
    render(<ExperienceView experiences={[EXPERIENCE]} education={[EDUCATION]} skills={[SKILL]} />);

    expect(screen.getByText("Software Developer")).toBeInTheDocument();
    expect(screen.getByText(/HA Technologies \(Pvt\) Ltd/)).toBeInTheDocument();
    expect(screen.getByText(/Islamabad/)).toBeInTheDocument();
    expect(screen.getByText("Jun 2025 — Present")).toBeInTheDocument();
    expect(screen.getByText("Backend development on production systems.")).toBeInTheDocument();
    expect(screen.getByText("Shipped a REST API used in production.")).toBeInTheDocument();
    expect(screen.getByText("Django")).toBeInTheDocument();
  });

  it("renders complete education fields", () => {
    render(<ExperienceView experiences={[EXPERIENCE]} education={[EDUCATION]} skills={[SKILL]} />);

    expect(screen.getByText("BS Software Engineering")).toBeInTheDocument();
    expect(screen.getByText("Abasyn University, Peshawar")).toBeInTheDocument();
    expect(screen.getByText("Graduated 2025 · CGPA 3.67")).toBeInTheDocument();
  });

  it("uses a categorical skill level label, never a percentage", () => {
    render(<ExperienceView experiences={[EXPERIENCE]} education={[EDUCATION]} skills={[SKILL]} />);
    expect(screen.getByText("Expert")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("renders honest unavailable states for failed fetches", () => {
    render(<ExperienceView experiences={null} education={null} skills={null} />);
    expect(screen.getByText("Experience data is temporarily unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Education data is temporarily unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Skill data is temporarily unavailable.")).toBeInTheDocument();
  });
});
