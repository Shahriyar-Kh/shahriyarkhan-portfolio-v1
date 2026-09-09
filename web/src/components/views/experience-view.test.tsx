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

import { ExperienceView } from "@/components/views/experience-view";
import type { Education, Experience } from "@/lib/api/types";

function makeExperience(overrides: Partial<Experience> & { id: number }): Experience {
  return {
    company_name: "Sample Co",
    role_title: "Sample Role",
    start_date: "2025-01-01",
    end_date: null,
    location: "",
    description: "",
    achievements: [],
    technologies: [],
    current_role: false,
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

function makeEducation(overrides: Partial<Education> & { id: number }): Education {
  return {
    institution: "Sample University",
    degree: "Sample Degree",
    start_date: "2021-09-01",
    end_date: "2025-06-30",
    description: "",
    status: "published",
    published_at: "2026-01-01T00:00:00Z",
    display_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const CURRENT_ROLE = makeExperience({
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
});

const PAST_ROLE = makeExperience({
  id: 2,
  company_name: "CodeAlpha",
  role_title: "Python Developer Intern",
  start_date: "2025-02-01",
  end_date: "2025-05-31",
  location: "Remote",
  current_role: false,
});

describe("ExperienceView", () => {
  describe("real API content", () => {
    it("renders every real experience record with a single h1 and the real record count", () => {
      const { container } = render(<ExperienceView experiences={[CURRENT_ROLE, PAST_ROLE]} education={[]} />);
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("The structured record");
      expect(screen.getByText("2 published roles")).toBeInTheDocument();
      // Each real role legitimately appears twice - once in the full
      // register, once in the compact Career path progression view.
      expect(screen.getAllByText("Software Developer").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Python Developer Intern").length).toBeGreaterThan(0);
    });

    it("preserves the real API ordering (newest role first) in both the register and the career path", () => {
      render(<ExperienceView experiences={[CURRENT_ROLE, PAST_ROLE]} education={[]} />);
      const registerTitles = screen.getAllByText(/Software Developer|Python Developer Intern/);
      // First occurrence in document order must be the newest (current) role.
      expect(registerTitles[0]).toHaveTextContent("Software Developer");
    });

    it("shows a Current role label only for the real current, open-ended role", () => {
      render(<ExperienceView experiences={[CURRENT_ROLE, PAST_ROLE]} education={[]} />);
      expect(screen.getAllByText("Current role")).toHaveLength(1);
    });

    it("never shows Current role for a role with a real end_date even if current_role were true", () => {
      const contradictory = makeExperience({ id: 3, current_role: true, end_date: "2025-01-01" });
      render(<ExperienceView experiences={[contradictory]} education={[]} />);
      expect(screen.queryByText("Current role")).not.toBeInTheDocument();
    });

    it("formats real dates as accessible <time> elements with the correct dateTime attribute", () => {
      const { container } = render(<ExperienceView experiences={[PAST_ROLE]} education={[]} />);
      const times = container.querySelectorAll("time");
      const values = Array.from(times).map((t) => t.getAttribute("dateTime"));
      expect(values).toContain("2025-02-01");
      expect(values).toContain("2025-05-31");
    });

    it("shows Present only for a role that is genuinely open-ended (current_role and no end_date)", () => {
      render(<ExperienceView experiences={[CURRENT_ROLE]} education={[]} />);
      expect(screen.getByText(/Present/)).toBeInTheDocument();
    });

    it("renders real achievements and technologies exactly as provided, never inventing new ones", () => {
      render(<ExperienceView experiences={[CURRENT_ROLE]} education={[]} />);
      expect(screen.getByText("Designed secure backend architectures with JWT authentication and RBAC")).toBeInTheDocument();
      expect(screen.getByText("Django")).toBeInTheDocument();
    });

    it("omits location entirely when the real record has none", () => {
      const noLocation = makeExperience({ id: 4, company_name: "Acme", location: "" });
      render(<ExperienceView experiences={[noLocation]} education={[]} />);
      expect(screen.getByText("Acme")).toBeInTheDocument();
      expect(screen.queryByText(/Acme —/)).not.toBeInTheDocument();
    });

    it("renders complete real education fields", () => {
      render(<ExperienceView experiences={[]} education={[makeEducation({ id: 1 })]} />);
      expect(screen.getByText("Sample Degree")).toBeInTheDocument();
      expect(screen.getByText("Sample University")).toBeInTheDocument();
    });

    it("renders the Professional scope synthesis only when real experience data exists", () => {
      render(<ExperienceView experiences={[CURRENT_ROLE]} education={[]} />);
      expect(screen.getByText("Professional scope")).toBeInTheDocument();
      expect(screen.getByText("Backend & API development")).toBeInTheDocument();
    });

    it("never renders Professional scope or Career path for an empty experience list", () => {
      render(<ExperienceView experiences={[]} education={[]} />);
      expect(screen.queryByText("Professional scope")).not.toBeInTheDocument();
      expect(screen.queryByText("Career path")).not.toBeInTheDocument();
    });

    it("never renders Career path for a single-role record (nothing to show progression between)", () => {
      render(<ExperienceView experiences={[CURRENT_ROLE]} education={[]} />);
      expect(screen.queryByText("Career path")).not.toBeInTheDocument();
    });

    it("renders Career path with every real role once there are at least two", () => {
      render(<ExperienceView experiences={[CURRENT_ROLE, PAST_ROLE]} education={[]} />);
      expect(screen.getByText("Career path")).toBeInTheDocument();
    });

    it("never renders an evidence link when no verified experience-evidence mapping exists", () => {
      render(<ExperienceView experiences={[CURRENT_ROLE, PAST_ROLE]} education={[]} />);
      expect(screen.queryByText(/Built during this role/)).not.toBeInTheDocument();
    });
  });

  describe("empty vs. unavailable data", () => {
    it("renders an honest unavailable state for a failed fetch, not an empty register", () => {
      render(<ExperienceView experiences={null} education={null} />);
      expect(screen.getByText("Experience data is temporarily unavailable.")).toBeInTheDocument();
      expect(screen.getByText("Education data is temporarily unavailable.")).toBeInTheDocument();
    });

    it("renders an honest empty state for a genuinely empty published list, distinct from unavailable", () => {
      render(<ExperienceView experiences={[]} education={[]} />);
      expect(screen.getByText("No published experience yet.")).toBeInTheDocument();
      expect(screen.getByText("No published education record yet.")).toBeInTheDocument();
      expect(screen.queryByText(/temporarily unavailable/)).not.toBeInTheDocument();
    });

    it("never shows a role count line for an unavailable or empty dataset", () => {
      render(<ExperienceView experiences={null} education={null} />);
      expect(screen.queryByText(/published roles?/i)).not.toBeInTheDocument();
    });
  });

  describe("recruiter and client pathways", () => {
    it("exposes both the hiring and project CTAs via the shared DualCta section", () => {
      render(<ExperienceView experiences={[CURRENT_ROLE]} education={[]} />);
      expect(screen.getByRole("link", { name: /view résumé/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /get in touch/i })).toBeInTheDocument();
    });
  });

  describe("heading hierarchy", () => {
    it("has no skipped heading levels", () => {
      const { container } = render(<ExperienceView experiences={[CURRENT_ROLE, PAST_ROLE]} education={[makeEducation({ id: 1 })]} />);
      const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => Number(el.tagName.slice(1)));
      expect(headings[0]).toBe(1);
      for (let i = 1; i < headings.length; i++) {
        expect(headings[i]! - headings[i - 1]!).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("content truth", () => {
    it("never invents a duration, years-of-experience figure, percentage, or superlative claim", () => {
      const { container } = render(<ExperienceView experiences={[CURRENT_ROLE, PAST_ROLE]} education={[]} />);
      const text = container.textContent?.toLowerCase() ?? "";
      expect(text).not.toMatch(/\d+%|years? of experience|world-class|best-in-class|enterprise-grade/);
    });
  });

  describe("reduced-motion behavior", () => {
    it("renders every real role immediately - this view has no motion to gate content behind", () => {
      const original = window.matchMedia;
      window.matchMedia = ((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
      try {
        render(<ExperienceView experiences={[CURRENT_ROLE, PAST_ROLE]} education={[]} />);
        expect(screen.getAllByText("Software Developer").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Python Developer Intern").length).toBeGreaterThan(0);
      } finally {
        window.matchMedia = original;
      }
    });
  });
});
