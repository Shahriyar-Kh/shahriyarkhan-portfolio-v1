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

import { SkillsView } from "@/components/views/skills-view";
import type { Project, Skill } from "@/lib/api/types";

function makeSkill(overrides: Partial<Skill> & { category: Skill["category"] }): Skill {
  return {
    id: 1,
    name: "Sample Skill",
    description: "",
    level: 3,
    icon_or_badge: "",
    published: true,
    display_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> & { id: number; slug: string; title: string }): Project {
  return {
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

const BACKEND = { id: 1, name: "Backend", slug: "backend", display_order: 1, created_at: "", updated_at: "" };
const FRONTEND = { id: 2, name: "Frontend", slug: "frontend", display_order: 2, created_at: "", updated_at: "" };
const TOOLS = { id: 3, name: "Tools", slug: "tools", display_order: 3, created_at: "", updated_at: "" };

const PYTHON = makeSkill({ id: 1, name: "Python", level: 4, category: BACKEND });
const DJANGO = makeSkill({ id: 2, name: "Django / DRF", level: 4, category: BACKEND });
const REACT = makeSkill({ id: 3, name: "React.js", level: 3, category: FRONTEND });
const DOCKER = makeSkill({ id: 4, name: "Docker", level: 2, category: TOOLS });

const YANGO = makeProject({
  id: 1,
  slug: "yango-wing-fleet",
  title: "Yango Wing Fleet",
  technologies: [{ id: 1, name: "Python", slug: "python" }, { id: 2, name: "Django", slug: "django" }],
});

function setReducedMotion(matches: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? matches : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe("SkillsView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("real API content", () => {
    it("renders exactly one h1 and every real skill under its real category", () => {
      const { container } = render(<SkillsView skills={[PYTHON, DJANGO, REACT]} projects={[YANGO]} />);
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Technical capability");
      expect(screen.getByText("Backend")).toBeInTheDocument();
      expect(screen.getByText("Frontend")).toBeInTheDocument();
      // Python/React.js each legitimately appear twice - once in the
      // curated Core Stack row, once in the exhaustive Capability Index.
      expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
      expect(screen.getAllByText("React.js").length).toBeGreaterThan(0);
    });

    it("shows the real skill count and category count, never a hardcoded number", () => {
      render(<SkillsView skills={[PYTHON, DJANGO, REACT]} projects={[]} />);
      expect(screen.getByText("3 published skills across 2 categories")).toBeInTheDocument();
    });

    it("uses categorical level labels, never a fabricated percentage", () => {
      render(<SkillsView skills={[PYTHON, DOCKER]} projects={[]} />);
      expect(screen.getAllByText("Expert").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Intermediate").length).toBeGreaterThan(0);
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it("connects a skill to real work only through the project's own technologies field", () => {
      render(<SkillsView skills={[PYTHON]} projects={[YANGO]} />);
      const link = screen.getByRole("link", { name: "Yango Wing Fleet" });
      expect(link).toHaveAttribute("href", "/work/yango-wing-fleet");
    });

    it("never shows evidence for a skill with no matching project technology data", () => {
      render(<SkillsView skills={[DOCKER]} projects={[YANGO]} />);
      expect(screen.queryByText("Evidence from real work")).not.toBeInTheDocument();
    });

    it("never renders the evidence section when the project fetch failed (projects: null)", () => {
      render(<SkillsView skills={[PYTHON]} projects={null} />);
      expect(screen.queryByText("Evidence from real work")).not.toBeInTheDocument();
    });

    it("renders the working range synthesis", () => {
      render(<SkillsView skills={[PYTHON]} projects={[]} />);
      expect(screen.getByText("Working range")).toBeInTheDocument();
      expect(screen.getByText("Backend & API engineering")).toBeInTheDocument();
    });

    it("renders an honest unavailable state for a failed fetch, not an empty index", () => {
      render(<SkillsView skills={null} projects={null} />);
      expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    });

    it("renders an honest empty state for a genuinely empty list", () => {
      render(<SkillsView skills={[]} projects={[]} />);
      expect(screen.getByText(/No published skills yet\./i)).toBeInTheDocument();
    });

    it("never renders a skill count line for an unavailable or empty dataset", () => {
      render(<SkillsView skills={null} projects={null} />);
      expect(screen.queryByText(/published skills?/i)).not.toBeInTheDocument();
    });
  });

  describe("recruiter and client pathways", () => {
    it("exposes both the hiring and project CTAs via the shared DualCta section", () => {
      render(<SkillsView skills={[PYTHON]} projects={[]} />);
      expect(screen.getByRole("link", { name: /view résumé/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /start a conversation/i })).toBeInTheDocument();
    });
  });

  describe("heading hierarchy", () => {
    it("has no skipped heading levels", () => {
      const { container } = render(<SkillsView skills={[PYTHON, DJANGO, REACT]} projects={[YANGO]} />);
      const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => Number(el.tagName.slice(1)));
      expect(headings[0]).toBe(1);
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i]!;
        const previous = headings[i - 1]!;
        expect(current - previous).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("reduced-motion behavior", () => {
    it("renders every real skill immediately under prefers-reduced-motion", () => {
      const restore = setReducedMotion(true);
      try {
        render(<SkillsView skills={[PYTHON, DJANGO, REACT]} projects={[]} />);
        expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
        expect(screen.getAllByText("React.js").length).toBeGreaterThan(0);
      } finally {
        restore();
      }
    });
  });

  describe("content truth", () => {
    it("never invents a percentage, certification, or superlative claim", () => {
      const { container } = render(<SkillsView skills={[PYTHON, DJANGO, REACT]} projects={[YANGO]} />);
      const text = container.textContent?.toLowerCase() ?? "";
      expect(text).not.toMatch(/\d+%|certifi|world-class|best-in-class|enterprise-grade|years? of experience/);
    });
  });

  describe("responsive/overflow guards", () => {
    it("never applies a fixed pixel width to a content container", () => {
      const { container } = render(<SkillsView skills={[PYTHON, DJANGO, REACT]} projects={[YANGO]} />);
      const fixedWidthEls = Array.from(container.querySelectorAll<HTMLElement>('[class*="w-["]')).filter((el) =>
        /(?:^|\s)w-\[\d+px\]/.test(el.className),
      );
      expect(fixedWidthEls).toHaveLength(0);
    });

    it("uses a single band per category - no separate mobile/desktop DOM trees", () => {
      const { container } = render(<SkillsView skills={[PYTHON, DJANGO, REACT]} projects={[]} />);
      // 2 real categories (Backend, Frontend) -> 2 bands, not 4.
      const categoryNames = Array.from(container.querySelectorAll("p")).filter((p) => p.textContent === "Backend" || p.textContent === "Frontend");
      expect(categoryNames).toHaveLength(2);
    });
  });
});
